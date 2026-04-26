/**
 * Structured logger (pino-style API using console, zero extra deps).
 * Swap this file for pino/winston in production without touching callers.
 *
 * Usage:
 *   const logger = require('./common/logger').child({ module: 'aiClassifier' })
 *   logger.info({ imageSize: 1024 }, 'Classification started')
 *   logger.error({ err }, 'Classification failed')
 */

const config = require('../config')

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const MIN_LEVEL = config.server.nodeEnv === 'test' ? 99 : LEVELS.debug // silence in tests

const format = (level, bindings, msg, data) => {
  const base = { ts: new Date().toISOString(), level, ...bindings, msg }
  if (data && Object.keys(data).length) Object.assign(base, data)
  return JSON.stringify(base)
}

const makeLogger = (bindings = {}) => ({
  debug: (data, msg) => {
    if (LEVELS.debug < MIN_LEVEL) return
    console.debug(format('debug', bindings, msg ?? data, typeof data === 'object' ? data : {}))
  },
  info: (data, msg) => {
    if (LEVELS.info < MIN_LEVEL) return
    console.info(format('info', bindings, msg ?? data, typeof data === 'object' ? data : {}))
  },
  warn: (data, msg) => {
    if (LEVELS.warn < MIN_LEVEL) return
    console.warn(format('warn', bindings, msg ?? data, typeof data === 'object' ? data : {}))
  },
  error: (data, msg) => {
    if (LEVELS.error < MIN_LEVEL) return
    console.error(format('error', bindings, msg ?? data, typeof data === 'object' ? data : {}))
  },
  child: (extra) => makeLogger({ ...bindings, ...extra }),
})

module.exports = makeLogger()
