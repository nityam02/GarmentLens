/**
 * Garment Repository — data-access layer.
 * All SQL lives here. Services never touch the DB directly.
 *
 * Methods return plain JS objects (no framework coupling).
 */

const Database = require('better-sqlite3')
const path = require('path')
const config = require('../config')

const DB_PATH = path.resolve(config.db.path)

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS garments (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',

    ai_type TEXT,
    ai_material TEXT,
    ai_damage TEXT,
    ai_complexity TEXT,
    ai_notes TEXT,
    ai_confidence TEXT,

    override_type TEXT,
    override_material TEXT,
    override_damage TEXT,
    override_complexity TEXT,
    override_notes TEXT,

    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    classified_at INTEGER,
    completed_at INTEGER
  )
`)

// ---------- prepared statements ----------

const stmts = {
  insert: db.prepare(`
    INSERT INTO garments (id, filename, original_name, mime_type, file_size, status)
    VALUES (@id, @filename, @original_name, @mime_type, @file_size, @status)
  `),

  classify: db.prepare(`
    UPDATE garments SET
      status = 'classified',
      ai_type = @ai_type,
      ai_material = @ai_material,
      ai_damage = @ai_damage,
      ai_complexity = @ai_complexity,
      ai_notes = @ai_notes,
      ai_confidence = @ai_confidence,
      classified_at = unixepoch()
    WHERE id = @id
  `),

  classifyFailed: db.prepare(`
    UPDATE garments SET status = 'classification_failed' WHERE id = @id
  `),

  override: db.prepare(`
    UPDATE garments SET
      override_type = @override_type,
      override_material = @override_material,
      override_damage = @override_damage,
      override_complexity = @override_complexity,
      override_notes = @override_notes
    WHERE id = @id
  `),

  complete: db.prepare(`
    UPDATE garments SET status = 'completed', completed_at = unixepoch() WHERE id = @id
  `),

  findById: db.prepare('SELECT * FROM garments WHERE id = ?'),
  findAll: db.prepare('SELECT * FROM garments ORDER BY created_at DESC LIMIT 100'),
  deleteById: db.prepare('DELETE FROM garments WHERE id = ?'),
}

// ---------- public API ----------

const garmentRepository = {
  create: (params) => stmts.insert.run(params),
  saveClassification: (params) => stmts.classify.run(params),
  saveClassificationFailed: (id) => stmts.classifyFailed.run({ id }),
  saveOverride: (params) => stmts.override.run(params),
  markCompleted: (id) => stmts.complete.run({ id }),
  findById: (id) => stmts.findById.get(id) ?? null,
  findAll: () => stmts.findAll.all(),
  deleteById: (id) => stmts.deleteById.run(id),
  /** Exposed for testing — allows swapping the DB instance */
  _db: db,
}

module.exports = garmentRepository
