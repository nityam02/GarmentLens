const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { garmentQueries } = require('../db/database')
const { classifyGarment } = require('../services/aiClassifier')
const { uploadDir } = require('../middleware/upload')
const storageService = require('../services/storageService')

const serializeGarment = (row) => ({
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

const uploadGarment = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const id = uuidv4()
  const { filename, originalname, mimetype, size } = req.file

  garmentQueries.insert.run({
    id,
    filename,
    original_name: originalname,
    mime_type: mimetype,
    file_size: size,
    status: 'pending',
  })

  const imagePath = path.join(uploadDir, filename)
  const classification = await classifyGarment(imagePath)

  // Upload to MinIO (no-op if running in local disk mode)
  await storageService.uploadFile(imagePath, filename, mimetype)
  // Clean up local temp file after MinIO upload
  if (process.env.MINIO_ENDPOINT && fs.existsSync(imagePath)) fs.unlinkSync(imagePath)

  if (classification._error) {
    garmentQueries.updateClassificationFailed.run({ id })
  } else {
    garmentQueries.updateClassification.run({
      id,
      ai_type: classification.type,
      ai_material: classification.material,
      ai_damage: classification.damage,
      ai_complexity: classification.complexity,
      ai_notes: classification.notes || null,
      ai_confidence: JSON.stringify(classification.confidence),
    })
  }

  const garment = garmentQueries.findById.get(id)
  return res.status(201).json(serializeGarment(garment))
}

const listGarments = (req, res) => {
  const rows = garmentQueries.findAll.all()
  res.json(rows.map(serializeGarment))
}

const getGarment = (req, res) => {
  const row = garmentQueries.findById.get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Garment not found' })
  res.json(serializeGarment(row))
}

const overrideClassification = (req, res) => {
  const { id } = req.params
  const row = garmentQueries.findById.get(id)
  if (!row) return res.status(404).json({ error: 'Garment not found' })

  const { type, material, damage, complexity, notes } = req.body

  garmentQueries.updateOverride.run({
    override_type: type || null,
    override_material: material || null,
    override_damage: damage || null,
    override_complexity: complexity || null,
    override_notes: notes || null,
    id,
  })

  const updated = garmentQueries.findById.get(id)
  res.json(serializeGarment(updated))
}

const completeGarment = (req, res) => {
  const { id } = req.params
  const row = garmentQueries.findById.get(id)
  if (!row) return res.status(404).json({ error: 'Garment not found' })
  if (row.status === 'completed') return res.status(400).json({ error: 'Already completed' })

  garmentQueries.markCompleted.run({ id })
  const updated = garmentQueries.findById.get(id)
  res.json(serializeGarment(updated))
}

const getImage = async (req, res) => {
  await storageService.getImageResponse(req, res, req.params.filename)
}

module.exports = { uploadGarment, listGarments, getGarment, overrideClassification, completeGarment, getImage }
