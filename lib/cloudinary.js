import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
} else {
  console.warn(
    "Cloudinary no esta completamente configurado. Revisa las variables de entorno."
  );
}

export function assertCloudinaryConfigured() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary no configurado");
  }
}

export default cloudinary;
