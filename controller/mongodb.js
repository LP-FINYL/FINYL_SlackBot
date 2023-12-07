const { MongoClient, ServerApiVersion } = require('mongodb');
const mongodb_username = process.env.MONGODB_USERNAME;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_url = process.env.MONGODB_URL;
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