const cloudinary = require('cloudinary').v2;

exports.handler = async (event) => {
  // 1. Immediate Logging - This will show up in the Netlify Web Console
  console.log("Function triggered!"); 

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 2. Check if the body exists
    if (!event.body) {
      throw new Error("No body found in request");
    }

    const { image, userUid } = JSON.parse(event.body);

    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(image, {
      public_id: `profile_${userUid}`,
      overwrite: true,
      invalidate: true
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.secure_url }),
    };

  } catch (error) {
    // 3. Force the error to be returned to the browser so you can see it
    console.error("Cloudinary Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack }),
    };
  }
};
