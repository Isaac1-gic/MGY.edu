const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { publicId } = JSON.parse(event.body);

    // This removes the old file from Cloudinary storage
    const result = await cloudinary.uploader.destroy(publicId);

    return {
      statusCode: 200,
      body: JSON.stringify({ result: result.result }) // Usually returns "ok"
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};