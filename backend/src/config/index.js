/**
 * Centralised configuration.
 * Reads and validates environment variables once at startup.
 * All other modules import from here — never from process.env directly.
 */

const required = (key) => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

const optional = (key, fallback = '') => process.env[key] ?? fallback

module.exports = {
  server: {
    port: parseInt(optional('SERVICE_PORT', '3001')),
    allowedOrigin: optional('ALLOWED_ORIGIN', 'http://localhost:5173'),
    nodeEnv: optional('NODE_ENV', 'development'),
  },

  db: {
    path: optional('DB_PATH', './garmentlens.db'),
  },

  upload: {
    dir: optional('UPLOAD_DIR', './uploads'),
    maxFileSizeMb: parseInt(optional('MAX_FILE_SIZE_MB', '10')),
  },

  ai: {
    // Optional: if absent, stub mode activates automatically
    openaiApiKey: optional('OPENAI_API_KEY'),
    model: optional('OPENAI_MODEL', 'gpt-4o'),
    timeoutMs: parseInt(optional('AI_TIMEOUT_MS', '15000')),
  },

  storage: {
    minioEndpoint: optional('MINIO_ENDPOINT'),
    minioPort: parseInt(optional('MINIO_PORT', '9000')),
    minioUseSsl: optional('MINIO_USE_SSL', 'false') === 'true',
    minioAccessKey: optional('MINIO_ACCESS_KEY', 'minioadmin'),
    minioSecretKey: optional('MINIO_SECRET_KEY', 'minioadmin'),
    minioBucket: optional('MINIO_BUCKET', 'garments'),
  },

  rateLimit: {
    windowMs: 60 * 1000,
    max: parseInt(optional('RATE_LIMIT_MAX', '60')),
  },
}
