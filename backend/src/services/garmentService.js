/**
 * Garment Service — pure business logic.
 *
 * Rules:
 * - No HTTP concepts (req/res). Receives plain values, returns plain objects.
 * - Throws domain errors from common/errors.js.
 * - Calls repository for persistence, aiClassifier for AI, storageService for files.
 */

const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const repo = require('../repositories/garmentRepository')
const { classifyGarment } = require('./aiClassifier')
const storageService = require('./storageService')
const { NotFoundError, ConflictError } = require('../common/errors')
const logger = require('../common/logger').child({ module: 'garmentService' })

// ---------- serialiser (DB row → public shape) ----------

const serialise = (row) => ({
  id: row.id,
  filename: row.filename,
  originalName: row.original_name,
  status: row.status,
  ai: row.ai_type
    ? {
        type: row.ai_type,
        material: row.ai_material,
        damage: row.ai_damage,
        complexity: row.ai_complexity,
        notes: row.ai_notes,
        confidence: row.ai_confidence ? JSON.parse(row.ai_confidence) : null,
      }
    : null,
  override: row.override_type
    ? {
        type: row.override_type,
        material: row.override_material,
        damage: row.override_damage,
        complexity: row.override_complexity,
        notes: row.override_notes,
      }
    : null,
  createdAt: row.created_at,
  classifiedAt: row.classified_at,
  completedAt: row.completed_at,
})

// ---------- service methods ----------

const ingestGarment = async ({ filename, originalname, mimetype, size, localPath }) => {
  const id = uuidv4()

  repo.create({ id, filename, original_name: originalname, mime_type: mimetype, file_size: size, status: 'pending' })
  logger.info({ id, filename }, 'Garment record created')

  const classification = await classifyGarment(localPath)

  // Upload to object storage (no-op in local-disk mode)
  await storageService.uploadFile(localPath, filename, mimetype)
  if (process.env.MINIO_ENDPOINT && fs.existsSync(localPath)) fs.unlinkSync(localPath)

  if (classification._error) {
    repo.saveClassificationFailed(id)
    logger.warn({ id, err: classification._error }, 'Classification failed; marked as failed')
  } else {
    repo.saveClassification({
      id,
      ai_type: classification.type,
      ai_material: classification.material,
      ai_damage: classification.damage,
      ai_complexity: classification.complexity,
      ai_notes: classification.notes ?? null,
      ai_confidence: JSON.stringify(classification.confidence),
    })
    logger.info({ id, type: classification.type, source: classification._source }, 'Classification saved')
  }

  return serialise(repo.findById(id))
}

const listGarments = () => repo.findAll().map(serialise)

const getGarment = (id) => {
  const row = repo.findById(id)
  if (!row) throw new NotFoundError('Garment')
  return serialise(row)
}

const overrideClassification = (id, { type, material, damage, complexity, notes }) => {
  if (!repo.findById(id)) throw new NotFoundError('Garment')

  repo.saveOverride({
    override_type: type ?? null,
    override_material: material ?? null,
    override_damage: damage ?? null,
    override_complexity: complexity ?? null,
    override_notes: notes ?? null,
    id,
  })

  logger.info({ id }, 'Override saved')
  return serialise(repo.findById(id))
}

const completeGarment = (id) => {
  const row = repo.findById(id)
  if (!row) throw new NotFoundError('Garment')
  if (row.status === 'completed') throw new ConflictError('Garment is already completed')

  repo.markCompleted(id)
  logger.info({ id }, 'Garment marked completed')
  return serialise(repo.findById(id))
}

module.exports = { ingestGarment, listGarments, getGarment, overrideClassification, completeGarment, serialise }
