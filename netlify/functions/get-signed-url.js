const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    endpoint: 'https://s3.tebi.io',
    accessKeyId: process.env.TEBI_ACCESS_KEY,
    secretAccessKey: process.env.TEBI_SECRET_KEY,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { fileName, contentType } = JSON.parse(event.body);

        const params = {
            Bucket: process.env.TEBI_BUCKET,
            Key: fileName,
            ContentType: contentType,
            ACL: 'public-read',
            Expires: 60 // URL valid for 60 seconds
        };

        // This creates a special URL that allows a 'PUT' request
        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

        return {
            statusCode: 200,
            body: JSON.stringify({ uploadUrl })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};