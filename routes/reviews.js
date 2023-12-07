var express = require('express');
var router = express.Router();
const {WebClient, LogLevel} = require("@slack/web-api");
const slackBotToken = process.env.SLACK_BOT_TOKEN;
router.get('/', function (req, res) {
    res.status(200).send('OK')
});

async function publishMessage(title, description, stars) {
    try {
        const client = new WebClient(slackBotToken, {
            logLevel: LogLevel.ERROR
        });

        const result = await client.chat.postMessage({
            token: slackBotToken,
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
                            value: `별점: ${stars}`,
                        },
                        {
                            title: `제목: ${title}`,
                            value: `\n\`\`\`\n ${description}\n\`\`\``,
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