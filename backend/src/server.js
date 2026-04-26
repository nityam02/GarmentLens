/**
 * Server entry point — only boots the HTTP server.
 * All app logic lives in app.js.
 */

require('dotenv').config()

const app = require('./app')
const config = require('./config')
const logger = require('./common/logger')
const storageService = require('./services/storageService')

app.listen(config.server.port, () => {
  logger.info({ port: config.server.port }, 'GarmentLens backend running')
  logger.info(
    { mode: config.ai.openaiApiKey ? `gpt-4o vision (OpenAI)` : 'stub (no OPENAI_API_KEY set)' },
    'AI classifier'
  )
  logger.info({ mode: storageService.mode() }, 'Storage')
})
