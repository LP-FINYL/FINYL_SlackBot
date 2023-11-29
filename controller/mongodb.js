const { MongoClient, ServerApiVersion } = require('mongodb');
const {mongodb_username, mongodb_password, mongodb_url} = require('./config/config')
const uri = `mongodb+srv://${mongodb_username}:${mongodb_password}@${mongodb_url}/test`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function getClient() {

    let clientPromise
    clientPromise = client.connect();
    console.log("Database 연결 성공");

    return  clientPromise
}

module.exports = {
    client,
    getClient
}