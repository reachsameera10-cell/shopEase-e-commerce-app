import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

if (env.IMAGE_STORAGE_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export function uploadProductImage(buffer, format) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'shopease/products',
        format,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(new Error('Cloudinary image upload failed'))
          return
        }
        if (!result?.secure_url || !result.public_id) {
          reject(new Error('Cloudinary did not return a secure image URL'))
          return
        }
        resolve({ url: result.secure_url, publicId: result.public_id })
      },
    ).end(buffer)
  })
}

export async function deleteProductImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    })
    return result.result === 'ok' || result.result === 'not found'
  } catch {
    throw new Error('Cloudinary image deletion failed')
  }
}
