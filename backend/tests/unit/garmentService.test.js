/**
 * Unit Tests — garmentService
 *
 * Tests business logic in isolation by mocking the repository.
 * No HTTP, no DB, no AI calls.
 */

jest.mock('../../src/repositories/garmentRepository')
jest.mock('../../src/services/aiClassifier')
jest.mock('../../src/services/storageService')

const repo = require('../../src/repositories/garmentRepository')
const { classifyGarment } = require('../../src/services/aiClassifier')
const storageService = require('../../src/services/storageService')
const { NotFoundError, ConflictError } = require('../../src/common/errors')
const garmentService = require('../../src/services/garmentService')

// ── helpers ───────────────────────────────────────────────────────────────

const makeRow = (overrides = {}) => ({
  id: 'abc-123',
  filename: 'img.jpg',
  original_name: 'shirt.jpg',
  mime_type: 'image/jpeg',
  file_size: 1024,
  status: 'classified',
  ai_type: 'shirt',
  ai_material: 'cotton',
  ai_damage: 'missing_button',
  ai_complexity: 'low',
  ai_notes: 'Front button missing',
  ai_confidence: JSON.stringify({ type: 0.98, material: 0.93, damage: 0.97, complexity: 0.91 }),
  override_type: null,
  override_material: null,
  override_damage: null,
  override_complexity: null,
  override_notes: null,
  created_at: 1700000000,
  classified_at: 1700000010,
  completed_at: null,
  ...overrides,
})

const mockClassification = {
  type: 'shirt', material: 'cotton', damage: 'missing_button', complexity: 'low',
  notes: 'Test note',
  confidence: { type: 0.98, material: 0.93, damage: 0.97, complexity: 0.91 },
  _source: 'stub',
}

// ── setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  classifyGarment.mockResolvedValue(mockClassification)
  storageService.uploadFile.mockResolvedValue(undefined)
})

// ── tests ──────────────────────────────────────────────────────────────────

describe('garmentService.listGarments()', () => {
  it('returns serialised list', () => {
    repo.findAll.mockReturnValue([makeRow()])
    const result = garmentService.listGarments()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('abc-123')
    expect(result[0].ai.type).toBe('shirt')
  })

  it('returns empty array when no garments', () => {
    repo.findAll.mockReturnValue([])
    expect(garmentService.listGarments()).toEqual([])
  })
})

describe('garmentService.getGarment()', () => {
  it('returns garment when found', () => {
    repo.findById.mockReturnValue(makeRow())
    const g = garmentService.getGarment('abc-123')
    expect(g.id).toBe('abc-123')
  })

  it('throws NotFoundError when garment does not exist', () => {
    repo.findById.mockReturnValue(null)
    expect(() => garmentService.getGarment('missing')).toThrow(NotFoundError)
  })
})

describe('garmentService.overrideClassification()', () => {
  it('saves override and returns updated garment', () => {
    const updatedRow = makeRow({ override_type: 'jacket', override_material: 'wool', override_damage: 'torn_seam', override_complexity: 'medium', override_notes: 'corrected' })
    repo.findById
      .mockReturnValueOnce(makeRow())   // existence check
      .mockReturnValueOnce(updatedRow)  // re-fetch after update
    repo.saveOverride.mockReturnValue({ changes: 1 })

    const result = garmentService.overrideClassification('abc-123', {
      type: 'jacket', material: 'wool', damage: 'torn_seam', complexity: 'medium', notes: 'corrected',
    })

    expect(repo.saveOverride).toHaveBeenCalledWith(expect.objectContaining({ override_type: 'jacket', id: 'abc-123' }))
    expect(result.override.type).toBe('jacket')
  })

  it('throws NotFoundError for unknown garment', () => {
    repo.findById.mockReturnValue(null)
    expect(() => garmentService.overrideClassification('missing', {})).toThrow(NotFoundError)
  })
})

describe('garmentService.completeGarment()', () => {
  it('marks garment as completed', () => {
    const completedRow = makeRow({ status: 'completed', completed_at: 1700001000 })
    repo.findById
      .mockReturnValueOnce(makeRow())    // status check
      .mockReturnValueOnce(completedRow) // re-fetch
    repo.markCompleted.mockReturnValue({ changes: 1 })

    const result = garmentService.completeGarment('abc-123')
    expect(repo.markCompleted).toHaveBeenCalledWith('abc-123')
    expect(result.status).toBe('completed')
  })

  it('throws NotFoundError for unknown garment', () => {
    repo.findById.mockReturnValue(null)
    expect(() => garmentService.completeGarment('missing')).toThrow(NotFoundError)
  })

  it('throws ConflictError if already completed', () => {
    repo.findById.mockReturnValue(makeRow({ status: 'completed' }))
    expect(() => garmentService.completeGarment('abc-123')).toThrow(ConflictError)
  })
})

describe('garmentService.ingestGarment()', () => {
  it('creates garment record, calls classifier, saves classification', async () => {
    // findById is called once at the end to return serialised garment
    repo.findById.mockReturnValue(makeRow())
    repo.create.mockReturnValue({ lastInsertRowid: 1 })
    repo.saveClassification.mockReturnValue({ changes: 1 })

    const result = await garmentService.ingestGarment({
      filename: 'img.jpg',
      originalname: 'shirt.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      localPath: '/tmp/img.jpg',
    })

    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(classifyGarment).toHaveBeenCalledWith('/tmp/img.jpg')
    expect(repo.saveClassification).toHaveBeenCalledTimes(1)
    expect(result).toHaveProperty('id')
  })

  it('saves classification_failed when AI returns _error', async () => {
    classifyGarment.mockResolvedValue({ ...mockClassification, _error: 'API down', _source: 'stub_fallback' })
    repo.findById.mockReturnValue(makeRow({ status: 'classification_failed', ai_type: null }))
    repo.create.mockReturnValue({ lastInsertRowid: 1 })
    repo.saveClassificationFailed.mockReturnValue({ changes: 1 })

    await garmentService.ingestGarment({
      filename: 'img.jpg', originalname: 'shirt.jpg', mimetype: 'image/jpeg', size: 1024, localPath: '/tmp/img.jpg',
    })

    expect(repo.saveClassificationFailed).toHaveBeenCalledTimes(1)
    expect(repo.saveClassification).not.toHaveBeenCalled()
  })
})
