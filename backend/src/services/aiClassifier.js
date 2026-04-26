/**
 * AI Classifier Service
 *
 * Modes (selected automatically):
 *   1. GPT-4o vision — when OPENAI_API_KEY is present
 *   2. Stub          — when no key is set (returns realistic hardcoded data)
 *   3. Stub fallback — when the API call fails (with _error annotation)
 *
 * The strict JSON Schema (Structured Outputs) guarantees field types and enum
 * compliance, so we never need to validate or sanitise the AI response.
 */

const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
const config = require('../config')
const logger = require('../common/logger').child({ module: 'aiClassifier' })

// ---------- constants ----------

const GARMENT_TYPES = ['shirt', 'pants', 'jacket', 'dress', 'skirt', 'coat', 'sweater', 'suit', 'shoes', 'bag', 'other']
const MATERIALS = ['cotton', 'wool', 'silk', 'polyester', 'leather', 'denim', 'linen', 'synthetic', 'unknown']
const DAMAGES = ['torn_seam', 'hole', 'stain', 'broken_zipper', 'missing_button', 'worn_fabric', 'hem_damage', 'multiple', 'none_visible']
const COMPLEXITIES = ['low', 'medium', 'high']

const STUB_RESPONSES = [
  {
    type: 'jacket', material: 'wool', damage: 'torn_seam', complexity: 'medium',
    notes: 'Wool jacket with a torn inner lining seam at the left armhole. Moderate repair needed.',
    confidence: { type: 0.91, material: 0.87, damage: 0.79, complexity: 0.85 },
  },
  {
    type: 'pants', material: 'denim', damage: 'hole', complexity: 'low',
    notes: 'Denim jeans with a small hole at the right knee. Standard patch repair.',
    confidence: { type: 0.96, material: 0.94, damage: 0.88, complexity: 0.82 },
  },
  {
    type: 'dress', material: 'silk', damage: 'stain', complexity: 'high',
    notes: 'Silk evening dress with a wine stain near the hem. Delicate fabric requires specialist handling.',
    confidence: { type: 0.89, material: 0.72, damage: 0.95, complexity: 0.88 },
  },
  {
    type: 'shirt', material: 'cotton', damage: 'missing_button', complexity: 'low',
    notes: 'Cotton dress shirt missing two buttons on the front placket. Simple replacement needed.',
    confidence: { type: 0.98, material: 0.93, damage: 0.97, complexity: 0.91 },
  },
  {
    type: 'coat', material: 'wool', damage: 'worn_fabric', complexity: 'high',
    notes: 'Heavy wool overcoat with worn elbows and thinning fabric at stress points.',
    confidence: { type: 0.93, material: 0.90, damage: 0.84, complexity: 0.87 },
  },
]

// ---------- schema (Structured Outputs — strict mode) ----------

const CLASSIFICATION_SCHEMA = {
  name: 'garment_classification',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: GARMENT_TYPES },
      material: { type: 'string', enum: MATERIALS },
      damage: { type: 'string', enum: DAMAGES },
      complexity: { type: 'string', enum: COMPLEXITIES },
      notes: { type: 'string', description: '1–2 sentences: garment description + damage location. Empty string if no damage.' },
      confidence: {
        type: 'object',
        properties: {
          type: { type: 'number', description: '0.0–1.0' },
          material: { type: 'number', description: '0.0–1.0' },
          damage: { type: 'number', description: '0.0–1.0' },
          complexity: { type: 'number', description: '0.0–1.0' },
        },
        required: ['type', 'material', 'damage', 'complexity'],
        additionalProperties: false,
      },
    },
    required: ['type', 'material', 'damage', 'complexity', 'notes', 'confidence'],
    additionalProperties: false,
  },
}

const SYSTEM_PROMPT = `You are an expert garment repair classifier at a professional tailor shop with 20+ years of experience.
Analyse garment photos and produce accurate intake classifications for repair work.
Set confidence scores based on image clarity: 0.5–0.7 when ambiguous, 0.8–0.95 when clear.`

const USER_PROMPT = `Analyse this garment carefully. Examine fabric texture, weave pattern, visible damage, and construction details.

Complexity rubric:
- low: single simple repair (replace button, minor hem stitch, small patch)
- medium: requires skill (seam reconstruction, zipper replacement, lining repair)
- high: complex work or delicate material (full reconstruction, silk/leather, multiple areas)

Fill notes with 1–2 sentences: garment type + specific damage location and nature. Empty string if no damage.`

// ---------- internals ----------

const mediaType = (imagePath) => {
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }
  return map[path.extname(imagePath).toLowerCase()] ?? 'image/jpeg'
}

const callGpt4o = async (imagePath) => {
  const client = new OpenAI({ apiKey: config.ai.openaiApiKey })
  const base64 = fs.readFileSync(imagePath).toString('base64')

  const response = await Promise.race([
    client.chat.completions.create({
      model: config.ai.model,
      max_tokens: 800,
      response_format: { type: 'json_schema', json_schema: CLASSIFICATION_SCHEMA },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType(imagePath)};base64,${base64}`, detail: 'high' } },
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI timeout after ${config.ai.timeoutMs}ms`)), config.ai.timeoutMs)
    ),
  ])

  return { ...JSON.parse(response.choices[0].message.content), _source: 'gpt-4o' }
}

const stubClassify = () => ({
  ...STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)],
  _source: 'stub',
})

// ---------- public ----------

const classifyGarment = async (imagePath) => {
  if (!config.ai.openaiApiKey) {
    logger.info('No OPENAI_API_KEY — using stub classifier')
    return stubClassify()
  }

  try {
    const result = await callGpt4o(imagePath)
    logger.info({ source: result._source }, 'Classification complete')
    return result
  } catch (err) {
    logger.error({ err: err.message }, 'GPT-4o classification failed; falling back to stub')
    return { ...stubClassify(), _source: 'stub_fallback', _error: err.message }
  }
}

module.exports = { classifyGarment, stubClassify, STUB_RESPONSES }
