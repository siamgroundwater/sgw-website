import 'server-only'

import { v2 as cloudinary } from 'cloudinary'

function readEnvValue(name: string) {
  return process.env[name]?.replace(/^["']|["']$/g, '').trim()
}

export function getCloudinaryRootFolder() {
  return readEnvValue('CLOUDINARY_ROOT_FOLDER') || 'siamgroundwater/cms'
}

export function configureCloudinary() {
  const cloudName = readEnvValue('CLOUDINARY_CLOUD_NAME')
  const apiKey = readEnvValue('CLOUDINARY_API_KEY')
  const apiSecret = readEnvValue('CLOUDINARY_API_SECRET')

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Missing Cloudinary environment variables.')
  }

  cloudinary.config({
    api_key: apiKey,
    api_secret: apiSecret,
    cloud_name: cloudName,
    secure: true,
  })

  return cloudinary
}
