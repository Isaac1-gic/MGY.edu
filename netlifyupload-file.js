// You'll need to install the aws-sdk in your project: npm install aws-sdk
const AWS = require('aws-sdk');

// Initialize S3 with Tebi.io settings
// Note: Use Environment Variables in the Netlify Dashboard for these!
const s3 = new AWS.S3({
    endpoint: 'https://s3.tebi.io',
    accessKeyId: process.env.TEBI_ACCESS_KEY, 
    secretAccessKey: process.env.TEBI_SECRET_KEY,
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Parse the incoming data (we'll send it as JSON from the frontend)
        const body = JSON.parse(event.body);
        const fileContent = Buffer.from(body.file, 'base64'); // Convert base64 string back to binary
        const fileName = body.fileName;
        const contentType = body.contentType;

        const params = {
            Bucket: process.env.TEBI_BUCKET,
            Key: fileName,
            Body: fileContent,
            ContentType: contentType,
            ACL: 'public-read'
        };

        // Upload to Tebi
        const uploadResult = await s3.upload(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ url: uploadResult.Location })
        };
    } catch (error) {
        console.error("Upload Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to upload file" })
        };
    }
};
