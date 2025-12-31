import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: For Vercel deployments, serverless function body size limit is 4.5MB
  // Base64 encoded images will be ~33% larger than original file size
  // A 10MB image becomes ~13MB when base64 encoded, which exceeds Vercel limits
  // Consider compressing images client-side before base64 encoding for production
};

export default nextConfig;
