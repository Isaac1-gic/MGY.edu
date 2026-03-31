const cloudinary = require('cloudinary').v2;

exports.handler = async (event) => {
  console.log("Function triggered!"); 

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    if (!event.body) throw new Error("No body found in request");

    const { image, userUid } = JSON.parse(event.body);

    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // 1. Clean the base64 string
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 2. Wrap upload_stream in a Promise to wait for Cloudinary
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            public_id: `profile_${userUid}`,
            folder: "mgy_profiles",
            resource_type: "image", // Fixes the 400 transformation error
            overwrite: true,
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(imageBuffer);
      });
    };

    const result = await uploadToCloudinary();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      // Return the secure_url and version to ensure transformations work
      body: JSON.stringify({ 
        url: result.secure_url,
        public_id: result.public_id,
        version: result.version 
      }),
    };

  } catch (error) {
    console.error("Cloudinary Error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
