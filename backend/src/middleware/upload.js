const multer = require('multer')
const path = require('path')
const fs = require('fs')

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safe = ext || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safe}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`))
  }
  cb(null, true)
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE_BYTES } })

module.exports = { upload, uploadDir }
