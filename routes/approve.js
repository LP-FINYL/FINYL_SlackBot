var express = require('express');
var router = express.Router();
const {WebClient, LogLevel} = require("@slack/web-api");
const slackConfig = require("../controller/config/config");
const {getClient} = require('../controller/mongodb')
const shortid = require("shortid");
const cron = require("node-cron");

router.get('/', function (req, res) {
    res.status(200).send('OK')
});

async function publishMessage(topic, color, deleteReason, id, title, tags, address, site, instaUrl, operatorTime, phone, latitude, longitude, image, info, actionType) {
    try {

        const mongoClient = await getClient()
        const db = mongoClient.db("finyl"); // database
        const slackDB = db.collection('approval'); // collection

        const id = shortid.generate()
        const now = new Date()

        const client = new WebClient(slackConfig.SLACK_BOT_TOKEN, {
            logLevel: LogLevel.ERROR
        });

        const additionalData = {
            topic,
            id,
            title,
            tags,
            address,
            site,
            instaUrl,
            operatorTime,
            phone,
            latitude,
            longitude,
            image,
            info,
            deleteReason,
            actionType
        };

        if(!deleteReason) {
            const result = await client.chat.postMessage({
                token: slackConfig.SLACK_BOT_TOKEN,
                channel: '#지도등록알람',
                attachments: [{
                    color: color,
                    blocks: [{
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `${title}에 대한 정보 ${topic} 요청이 왔습니다.`
                        }
                    }, {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `
*가게 정보:*
\`\`\`
가게 이름: ${title}
주소: ${address}
사이트: ${site}
인스타: ${instaUrl}
운영 시간: ${operatorTime || 'N/A'}
전화번호: ${phone}
정보: ${info || 'N/A'}
\`\`\`
`
                        },
                    }, {
                        type: "actions",
                        elements: [{
                            type: "button",
                            text: {
                                type: "plain_text",
                                emoji: true,
                                text: "Approve"
                            },
                            style: "primary",
                            value: JSON.stringify({action: "approve", additionalData}), // Include additional data in the value
                        }, {
                            type: "button",
                            text: {
                                type: "plain_text",
                                emoji: true,
                                text: "reject"
                            },
                            style: "danger",
                            value: JSON.stringify({action: "reject", additionalData}),
                        }]
                    }]
                }]
            });

            slackDB.insertMany([{
                id: id,
                title: title,
                status: "progress",
                insertTime: now,
                ts: result.message.ts,
                channel: result.channel,
            }]);

        } else {
            await client.chat.postMessage({
                token: slackConfig.SLACK_BOT_TOKEN,
                channel: '#지도등록알람',
                attachments: [{
                    color: color,
                    blocks: [{
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `${title}에 대한 정보 ${topic} 요청이 왔습니다.`
                        }
                    },
                        {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `삭제 요청 사유 : ${deleteReason}`
                        }
                    },
                        {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `
*가게 정보:*
\`\`\`
가게 이름: ${title}
\`\`\`
`
                        },
                    }, {
                        type: "actions",
                        elements: [{
                            type: "button",
                            text: {
                                type: "plain_text",
                                emoji: true,
                                text: "Approve"
                            },
                            style: "primary",
                            value: JSON.stringify({action: "approve", additionalData}), // Include additional data in the value
                        }, {
                            type: "button",
                            text: {
                                type: "plain_text",
                                emoji: true,
                                text: "reject"
                            },
                            style: "danger",
                            value: JSON.stringify({action: "reject", additionalData}),
                        }]
                    }]
                }]
            });

        }

    } catch (error) {
        console.error(error);
    }
}

async function scheduleReminder(client) {

    const mongoClient = await getClient()
    const db = mongoClient.db("finyl"); // database
    const slackDB = db.collection('approval'); // collection

    // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    //
    // const query = {
    //     $and: [
    //         { insertTime: { $gte: twentyFourHoursAgo } },
    //         { status: "progress" }
    //     ]
    // };


    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const query = {
        $and: [
            { insertTime: { $lte: twentyFourHoursAgo } }, // $lte를 사용해서 현재 시간에서 24시간보다 작거나 같은 값을 갖는 문서를 선택
            { status: "progress" }
        ]
    };

    const cursor = await slackDB.find(query).toArray();

    for (const doc of cursor) {
        const channel = doc.channel;

        const permalinkResult = await client.chat.getPermalink({
            channel,
            message_ts: doc.ts,
        });

        const link = permalinkResult.permalink;
        const title = doc.title;

        await client.chat.postMessage({
            channel: doc.channel,
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `:man-raising-hand: *오랫동안 처리되지 않은 요청이 있어요!* \n<${link}|* ${title} 매장 승인 또는 거절하러 가기*>`,
                    },
                },
            ],
        });
    }


}
router.post('/interactivity', async function (req, res) {

    const body = req.body;
    const payload = JSON.parse(body.payload);

    const decisionValue = JSON.parse(payload.actions[0].value)
    const action = decisionValue.action;
    const additionalData = decisionValue.additionalData;

    const id = await shortid.generate()
    const title = additionalData.title;
    const topic = additionalData.topic;
    const channelId = payload.channel.id;
    const messageId = payload.message.ts;
    const userId = payload.user.id;

    // Mention the user who approved the request
    const mentionText = `<@${userId}>`;

    const client = new WebClient(slackConfig.SLACK_BOT_TOKEN, {
        logLevel: LogLevel.ERROR
    });


    try {
        // Process the decision (you can add your logic here)
        if (action === 'approve') {
            if (getClient) {
                switch (additionalData.actionType) {
                    case 'create':
                        await addStore(id, additionalData.title, additionalData.tags, additionalData.address, additionalData.site, additionalData.instaUrl, additionalData.operatorTime, additionalData.phone, additionalData.latitude, additionalData.longitude, additionalData.image, additionalData.info, (err, result) => {
                            if (err) {
                                console.log('가게 정보 추가 실패');
                                res.send(err);
                            } else if (result) {
                                console.log('슬랙 봇으로 가게 정보 추가 성공');
                            }
                        });
                        break;

                    case 'update':
                        // Handle update approval logic
                        await updateStore(additionalData.id, additionalData.title, additionalData.tags, additionalData.address, additionalData.site, additionalData.instaUrl, additionalData.operatorTime, additionalData.phone, additionalData.latitude, additionalData.longitude, additionalData.image, additionalData.info, (err, result) => {
                            if (err) {
                                console.log('가게정보 업데이트 실패');
                                res.send(err);
                            } else if (result) {
                                console.log('슬랙 봇으로 가게 정보 업데이트 성공');
                            }
                        });
                        break;

                    case 'delete':
                        // Handle delete approval logic
                        await deleteStore(additionalData.id, (err, result) => {
                            if (err) {
                                console.log('가게 정보 삭제 실패');
                                res.send(err);
                            } else if (result) {
                                console.log('슬랙 봇으로 가게 정보 삭제 성공');
                            }
                        });
                        break;

                    default:
                        // Handle the default case if needed
                        break;
                }

                await client.chat.update({
                    channel: channelId,
                    ts: messageId,
                    text: `${mentionText} 님이 ${title} ${topic} 요청 승인 하였습니다.`,
                    attachments: [], // Remove attachments if any
                });

                deleteApproval(messageId)

            } else {
                console.log('데이터베이스 연결 안됨.');
            }

        } else if (action === 'reject') {
            await client.chat.update({
                channel: channelId,
                ts: messageId,
                text: `${mentionText} 님이 ${title} ${topic} 요청 승인 거부 하였습니다.`,
                attachments: [], // Remove attachments if any
            });

            deleteApproval(messageId)
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

async function deleteApproval(messageId) {

    const mongoClient = await getClient()
    const db = mongoClient.db("finyl"); // database
    const approval = db.collection('approval'); // collection

    const deleteDoc = {ts: messageId};

    await approval.deleteMany(deleteDoc);
}


async function addStore(id, title, tags, address, site, instaUrl, operatorTime, phone, latitude, longitude, image, info, callback) {

    try {
        const client = await getClient()
        const db = client.db("finyl"); // database
        const stores = db.collection('store'); // collection

        const storeData = stores.insertMany([{
            id: id,
            title: title,
            tags: tags,
            address: address,
            site: site,
            instaUrl: instaUrl,
            operatorTime: operatorTime,
            phone: Number(phone),
            latitude: Number(latitude),
            longitude: Number(longitude),
            image: image,
            info: info
        }]);
        console.log(`데이터 저장 성공.\n`);
        return callback(null, storeData)
    } catch (err) {
        console.error(`데이터 저장 실패 ${err}\n`);
        return callback(err, null)
    }

}

router.post('/create', function (req, res) {

    const body = req.body
    const title = body.title
    const tags = body.tags
    const address = body.address
    const site = body.site
    const instaUrl = body.instaUrl
    const operatorTime = body.operatorTime
    const phone = body.phone
    const latitude = body.latitude
    const longitude = body.longitude
    const image = body.image
    const info = body.info

    publishMessage("추가", '#4aec0f', null, null, title, tags, address, site, instaUrl, operatorTime, phone, latitude, longitude, image, info, "create");
    res.status(200).send('OK');
});

async function updateStore(id, title, tags, address, site, instaUrl, operatorTime, phone, latitude, longitude, image, info) {
    try {
        const client = await getClient()
        const db = client.db("finyl"); // database
        const stores = db.collection('store'); // collection

        const filter = {id: id};

        const updateDoc = {
            $set: {
                title: title,
                tags: tags,
                address: address,
                site: site,
                instaUrl: instaUrl,
                operatorTime: operatorTime,
                phone: Number(phone),
                latitude: Number(latitude),
                longitude: Number(longitude),
                image: image,
                info: info
            }
        };

        const updateResult = stores.findOneAndUpdate(
            filter,
            updateDoc
        );
        console.log(updateResult)
        console.log(`데이터 업데이트 성공.\n`);
    } catch (err) {
        console.error(`데이터 업데이트 실패 ${err}\n`);
    }
}


router.post('/update', function (req, res) {

    const body = req.body
    const title = body.title
    const id = body.id
    const tags = body.tags
    const address = body.address
    const site = body.site
    const instaUrl = body.instaUrl
    const operatorTime = body.operatorTime
    const phone = body.phone
    const latitude = body.latitude
    const longitude = body.longitude
    const image = body.image
    const info = body.info

    publishMessage("업데이트", '#eaf306', null, id, title, tags, address, site, instaUrl, operatorTime, phone, latitude, longitude, image, info, "update");
    res.status(200).send('OK');
});


async function deleteStore(id, callback) {

    const client = await getClient()
    const db = client.db("finyl"); // database
    const stores = db.collection('store'); // collection

    const deleteDoc = {id: id};

    try {
        const deleteManyResult = await stores.deleteMany(deleteDoc);
        console.log("Delete OK :", deleteManyResult)
        return callback(null, deleteManyResult)
    } catch (err) {
        console.log("Delete Failed", err)
        return callback(err, null)
    }
}


router.post('/delete', function (req, res) {

    const body = req.body
    const id = body.id
    const title = body.title
    const deleteReason = body.deleteReason

    publishMessage("삭제", '#f30606', deleteReason, id, title, null, null, null, null, null, null, null, null, null, null, 'delete');
    res.status(200).send('OK');
});

cron.schedule('0 0 * * *', async () => {
    try {

        const client = new WebClient(slackConfig.SLACK_BOT_TOKEN, {
            logLevel: LogLevel.ERROR
        });

        await scheduleReminder(client);
        console.log('Reminder scheduled successfully!');
    } catch (error) {
        console.error('Error scheduling reminder:', error);
    }
});

module.exports = router;