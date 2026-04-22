require('dotenv').config()

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const garmentsRouter = require('./routes/garments')

const app = express()
const PORT = process.env.SERVICE_PORT || 3001

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

app.use('/api/garments', garmentsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' })
  console.error('[ERROR]', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

const { mode: storageMode } = require('./services/storageService')

app.listen(PORT, () => {
  console.log(`[GarmentLens] Backend running on http://localhost:${PORT}`)
  console.log(`[AI] Mode: ${process.env.OPENAI_API_KEY ? 'GPT-4o vision' : 'stub (no API key)'}`)
  console.log(`[Storage] Mode: ${storageMode()}`)
})
