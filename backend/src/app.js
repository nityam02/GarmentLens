/**
 * Express application factory.
 * Exported without calling .listen() — allows supertest to import it in tests
 * without binding a port.
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const config = require('./config')
const logger = require('./common/logger')
const { AppError } = require('./common/errors')
const garmentsRouter = require('./routes/garments')

const app = express()

// ── Security / Transport ───────────────────────────────────────────────────

app.use(cors({ origin: config.server.allowedOrigin }))
app.use(express.json())

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// ── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/garments', garmentsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

// ── Global Error Handler ───────────────────────────────────────────────────
// Must have 4 params for Express to recognise it as error middleware

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', code: 'FILE_TOO_LARGE' })
  }

  // Multer invalid file type (thrown as a plain Error in upload.js)
  if (err.message?.startsWith('Invalid file type')) {
    return res.status(415).json({ error: err.message, code: 'INVALID_FILE_TYPE' })
  }

  // Domain errors (NotFoundError, ConflictError, ValidationError…)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code })
  }

  // Unknown errors — never leak internals in production
  logger.error({ err: { message: err.message, stack: err.stack } }, 'Unhandled error')
  const message = config.server.nodeEnv === 'production' ? 'Internal server error' : err.message
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' })
})

module.exports = app
