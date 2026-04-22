const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '../../garmentlens.db')

const db = new Database(DB_PATH)

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

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

const garmentQueries = {
  insert: db.prepare(`
    INSERT INTO garments (id, filename, original_name, mime_type, file_size, status)
    VALUES (@id, @filename, @original_name, @mime_type, @file_size, @status)
  `),

  updateClassification: db.prepare(`
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

  updateClassificationFailed: db.prepare(`
    UPDATE garments SET status = 'classification_failed' WHERE id = @id
  `),

  updateOverride: db.prepare(`
    UPDATE garments SET
      override_type = @override_type,
      override_material = @override_material,
      override_damage = @override_damage,
      override_complexity = @override_complexity,
      override_notes = @override_notes
    WHERE id = @id
  `),

  markCompleted: db.prepare(`
    UPDATE garments SET status = 'completed', completed_at = unixepoch() WHERE id = @id
  `),

  findById: db.prepare('SELECT * FROM garments WHERE id = ?'),

  findAll: db.prepare(`
    SELECT * FROM garments ORDER BY created_at DESC LIMIT 100
  `),

  delete: db.prepare('DELETE FROM garments WHERE id = ?'),
}

module.exports = { db, garmentQueries }
