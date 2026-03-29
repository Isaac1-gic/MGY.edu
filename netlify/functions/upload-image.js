// netlify/functions/upload-image.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with Environment Variables 
// (Set these in Netlify Console > Site Settings > Environment Variables)


export const handler = async (event) => {
  console.log('Sarting')
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    console.log('get img and id')
    const { image, userUid } = JSON.parse(event.body);
    console.log('getting keys')
    cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('uploading')
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(image, {
      public_id: `profile_${userUid}`, // Using UID ensures the old one is overwritten
      folder: "mgy_profiles",
      overwrite: true,               // This tells Cloudinary to replace existing file
      invalidate: true               // This clears the old image from the CDN cache
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: result.secure_url }),
    };
  } catch (error) {
    console.log(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
