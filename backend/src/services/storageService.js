/**
 * Storage Service — abstraction over MinIO / local disk.
 *
 * - When MINIO_ENDPOINT is set: uploads to MinIO, serves via presigned URL
 * - Otherwise: files stay on local disk, served via express sendFile
 *
 * Callers never know which mode is active.
 */

const fs = require('fs')
const path = require('path')
const config = require('../config')
const { uploadDir } = require('../middleware/upload')
const logger = require('../common/logger').child({ module: 'storageService' })

const isMinioConfigured = () => !!config.storage.minioEndpoint

let _client = null

const getMinioClient = () => {
  if (!_client) {
    const Minio = require('minio')
    _client = new Minio.Client({
      endPoint: config.storage.minioEndpoint,
      port: config.storage.minioPort,
      useSSL: config.storage.minioUseSsl,
      accessKey: config.storage.minioAccessKey,
      secretKey: config.storage.minioSecretKey,
    })
  }
  return _client
}

const bucket = () => config.storage.minioBucket

const ensureBucket = async () => {
  const client = getMinioClient()
  const exists = await client.bucketExists(bucket())
  if (!exists) {
    await client.makeBucket(bucket())
    logger.info({ bucket: bucket() }, 'MinIO bucket created')
  }
}

const uploadFile = async (localPath, objectName, contentType) => {
  if (!isMinioConfigured()) return // local mode: file already on disk

  await ensureBucket()
  await getMinioClient().fPutObject(bucket(), objectName, localPath, { 'Content-Type': contentType })
  logger.info({ objectName, bucket: bucket() }, 'Uploaded to MinIO')
}

const getImageResponse = async (req, res, filename) => {
  const safeName = path.basename(filename)

  if (!isMinioConfigured()) {
    const filePath = path.join(uploadDir, safeName)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Image not found', code: 'NOT_FOUND' })
    return res.sendFile(filePath)
  }

  try {
    const url = await getMinioClient().presignedGetObject(bucket(), safeName, 3600)
    res.redirect(url)
  } catch {
    res.status(404).json({ error: 'Image not found', code: 'NOT_FOUND' })
  }
}

const mode = () =>
  isMinioConfigured()
    ? `MinIO (${config.storage.minioEndpoint}:${config.storage.minioPort})`
    : 'local disk'

module.exports = { uploadFile, getImageResponse, mode }
