var express = require('express');
var router = express.Router();
const {WebClient, LogLevel} = require("@slack/web-api");
const slackConfig = require("../controller/config/config");
router.get('/', function (req, res) {
    res.status(200).send('OK')
});

async function publishMessage(title, description, stars) {
    try {
        const client = new WebClient(slackConfig.SLACK_BOT_TOKEN, {
            logLevel: LogLevel.ERROR
        });

        const result = await client.chat.postMessage({
            token: slackConfig.SLACK_BOT_TOKEN,
            channel: '#feedback',
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*FINYL 서비스 리뷰 좀 보세요오오!!!!!!!!!!*`
                    }
                },
                {
                    type: "divider"
                }
            ],
            attachments: [
                {
                    color: "#36a64f", // You can choose a color for the attachment
                    fields: [
                        {
                            title: `별점: ${stars}`,
                        },
                        {
                            value: `*리뷰 내용:*\n\`\`\`\n ${description}\n\`\`\``,
                        }
                    ]
                }
            ]
        });

    } catch (error) {
        console.error(error);
    }
}


router.post('/reviews', function (req, res) {

    const body = req.body
    const title = req.body.title
    const description = req.body.description
    const stars = req.body.stars

    let starString = '';

    for (let i = 0; i < stars; i++) {
        starString += ':star:';
    }

    publishMessage(title, description, starString);
    res.status(200).send('OK');
});

module.exports = router;