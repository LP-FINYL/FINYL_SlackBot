const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const indexRouter = require('./routes/reviews')
const approvalRouter = require('./routes/approve')
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");

app.use(compression())
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(helmet())

app.use('/api/v1', indexRouter);
app.use('/api/v1/approval', approvalRouter);

app.get('/', function (req, res) {
    res.status(200).send('OK')
});

// 404 에러 핸들링 미들웨어
app.use(function (req, res, next) {
    res.status(404).send('Not Found');
});

// 에러 핸들링 미들웨어
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

const port = 3000;

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
