const fs = require('fs')
const path = require('path')
const { uploadDir } = require('../middleware/upload')

const isMinioConfigured = () => !!process.env.MINIO_ENDPOINT

let minioClient = null

const getMinioClient = () => {
  if (!minioClient) {
    const Minio = require('minio')
    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }
  return minioClient
}

const BUCKET = () => process.env.MINIO_BUCKET || 'garments'

const ensureBucket = async () => {
  const client = getMinioClient()
  const bucket = BUCKET()
  const exists = await client.bucketExists(bucket)
  if (!exists) {
    await client.makeBucket(bucket)
    console.log(`[Storage] Created MinIO bucket: ${bucket}`)
  }
}

const uploadFile = async (localPath, objectName, contentType) => {
  if (!isMinioConfigured()) return // local mode: file already on disk

  await ensureBucket()
  await getMinioClient().fPutObject(BUCKET(), objectName, localPath, { 'Content-Type': contentType })
  console.log(`[Storage] Uploaded ${objectName} to MinIO bucket ${BUCKET()}`)
}

const getImageResponse = async (req, res, filename) => {
  const safeName = path.basename(filename)

  if (!isMinioConfigured()) {
    // Local disk fallback
    const filePath = path.join(uploadDir, safeName)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Image not found' })
    return res.sendFile(filePath)
  }

  // MinIO: redirect to presigned URL
  try {
    const url = await getMinioClient().presignedGetObject(BUCKET(), safeName, 3600)
    res.redirect(url)
  } catch {
    res.status(404).json({ error: 'Image not found' })
  }
}

const mode = () => (isMinioConfigured() ? `MinIO (${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || 9000})` : 'local disk')

module.exports = { uploadFile, getImageResponse, mode }
