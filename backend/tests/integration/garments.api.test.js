/**
 * Integration Tests — Garments API
 *
 * Uses supertest against the real Express app with:
 *  - In-memory (temp) SQLite DB (via DB_PATH env)
 *  - AI classifier STUBBED (no OPENAI_API_KEY)
 *  - Storage in local-disk mode (no MINIO_ENDPOINT)
 *
 * Tests verify the full HTTP contract: status codes, response shape, and state changes.
 */

process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = ''
process.env.MINIO_ENDPOINT = ''

const os = require('os')
const path = require('path')
const fs = require('fs')
const request = require('supertest')

// Use a temp DB so tests are isolated from dev data
const tmpDb = path.join(os.tmpdir(), `garmentlens-test-${process.pid}.db`)
process.env.DB_PATH = tmpDb
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `garmentlens-uploads-test-${process.pid}`)

// Load app AFTER env is set
const app = require('../../src/app')
const repo = require('../../src/repositories/garmentRepository')

// ── lifecycle ──────────────────────────────────────────────────────────────

afterAll(() => {
  repo._db.close()
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb)
  if (fs.existsSync(`${tmpDb}-shm`)) fs.unlinkSync(`${tmpDb}-shm`)
  if (fs.existsSync(`${tmpDb}-wal`)) fs.unlinkSync(`${tmpDb}-wal`)
})

// Helper: create a minimal 1x1 JPEG buffer (valid image, <1KB)
const tinyJpeg = () => {
  // Minimal valid JPEG bytes
  return Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffda00080101000003f0ffd9',
    'hex'
  )
}

// ── GET /health ────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body).toHaveProperty('ts')
  })
})

// ── GET /api/garments ──────────────────────────────────────────────────────

describe('GET /api/garments', () => {
  it('returns 200 with an array', async () => {
    const res = await request(app).get('/api/garments')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

// ── POST /api/garments ─────────────────────────────────────────────────────

describe('POST /api/garments', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/garments')
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 415 for unsupported file type', async () => {
    const res = await request(app)
      .post('/api/garments')
      .attach('image', Buffer.from('fake pdf content'), { filename: 'document.pdf', contentType: 'application/pdf' })
    expect(res.status).toBe(415)
    expect(res.body.code).toBe('INVALID_FILE_TYPE')
  })

  it('returns 201 with classified garment for valid JPEG', async () => {
    const res = await request(app)
      .post('/api/garments')
      .attach('image', tinyJpeg(), { filename: 'shirt.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      id: expect.any(String),
      filename: expect.any(String),
      originalName: 'shirt.jpg',
      status: expect.stringMatching(/^(classified|classification_failed)$/),
    })
    expect(res.body.ai).toBeDefined()
  }, 10_000)

  it('returned garment appears in GET /api/garments list', async () => {
    const post = await request(app)
      .post('/api/garments')
      .attach('image', tinyJpeg(), { filename: 'pants.jpg', contentType: 'image/jpeg' })

    expect(post.status).toBe(201)
    const { id } = post.body

    const list = await request(app).get('/api/garments')
    expect(list.body.some((g) => g.id === id)).toBe(true)
  }, 10_000)
})

// ── GET /api/garments/:id ──────────────────────────────────────────────────

describe('GET /api/garments/:id', () => {
  let createdId

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/garments')
      .attach('image', tinyJpeg(), { filename: 'coat.jpg', contentType: 'image/jpeg' })
    createdId = res.body.id
  }, 10_000)

  it('returns 200 with garment data', async () => {
    const res = await request(app).get(`/api/garments/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdId)
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/garments/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })
})

// ── PATCH /api/garments/:id/override ──────────────────────────────────────

describe('PATCH /api/garments/:id/override', () => {
  let garmentId

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/garments')
      .attach('image', tinyJpeg(), { filename: 'dress.jpg', contentType: 'image/jpeg' })
    garmentId = res.body.id
  }, 10_000)

  it('returns 200 with override applied', async () => {
    const res = await request(app)
      .patch(`/api/garments/${garmentId}/override`)
      .send({ type: 'jacket', material: 'leather', damage: 'torn_seam', complexity: 'high', notes: 'Staff correction' })

    expect(res.status).toBe(200)
    expect(res.body.override).toMatchObject({
      type: 'jacket',
      material: 'leather',
      damage: 'torn_seam',
      complexity: 'high',
      notes: 'Staff correction',
    })
    // Original AI output is preserved alongside
    expect(res.body.ai).toBeDefined()
  })

  it('returns 404 for unknown garment', async () => {
    const res = await request(app)
      .patch('/api/garments/ghost-id/override')
      .send({ type: 'shirt' })
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/garments/:id/complete ──────────────────────────────────────

describe('PATCH /api/garments/:id/complete', () => {
  let garmentId

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/garments')
      .attach('image', tinyJpeg(), { filename: 'sweater.jpg', contentType: 'image/jpeg' })
    garmentId = res.body.id
  }, 10_000)

  it('returns 200 and status=completed on first call', async () => {
    const res = await request(app).patch(`/api/garments/${garmentId}/complete`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(res.body.completedAt).toBeDefined()
  })

  it('returns 409 Conflict on second call (already completed)', async () => {
    const res = await request(app).patch(`/api/garments/${garmentId}/complete`)
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 404 for unknown garment', async () => {
    const res = await request(app).patch('/api/garments/ghost-id/complete')
    expect(res.status).toBe(404)
  })
})
