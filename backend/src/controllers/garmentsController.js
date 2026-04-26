/**
 * Garments Controller — HTTP adapter only.
 *
 * Responsibilities:
 * - Extract data from req
 * - Call the service
 * - Map service result / errors to HTTP responses
 *
 * No business logic. No SQL. No AI calls.
 */

const garmentService = require('../services/garmentService')
const storageService = require('../services/storageService')
const { uploadDir } = require('../middleware/upload')
const path = require('path')

// Wrap async route handlers — unhandled promise rejections propagate to the global error handler
const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next)

const uploadGarment = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const localPath = path.join(uploadDir, req.file.filename)

  const garment = await garmentService.ingestGarment({
    ...req.file,
    localPath,
  })

  res.status(201).json(garment)
})

const listGarments = (req, res) => {
  res.json(garmentService.listGarments())
}

const getGarment = asyncHandler(async (req, res) => {
  const garment = garmentService.getGarment(req.params.id)
  res.json(garment)
})

const overrideClassification = asyncHandler(async (req, res) => {
  const garment = garmentService.overrideClassification(req.params.id, req.body)
  res.json(garment)
})

const completeGarment = asyncHandler(async (req, res) => {
  const garment = garmentService.completeGarment(req.params.id)
  res.json(garment)
})

const getImage = asyncHandler(async (req, res) => {
  await storageService.getImageResponse(req, res, req.params.filename)
})

module.exports = { uploadGarment, listGarments, getGarment, overrideClassification, completeGarment, getImage }
