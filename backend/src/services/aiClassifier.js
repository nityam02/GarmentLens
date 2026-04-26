const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')

const GARMENT_TYPES = ['shirt', 'pants', 'jacket', 'dress', 'skirt', 'coat', 'sweater', 'suit', 'shoes', 'bag', 'other']
const MATERIALS = ['cotton', 'wool', 'silk', 'polyester', 'leather', 'denim', 'linen', 'synthetic', 'unknown']
const DAMAGES = ['torn_seam', 'hole', 'stain', 'broken_zipper', 'missing_button', 'worn_fabric', 'hem_damage', 'multiple', 'none_visible']
const COMPLEXITIES = ['low', 'medium', 'high']

const STUB_RESPONSES = [
  {
    type: 'jacket',
    material: 'wool',
    damage: 'torn_seam',
    complexity: 'medium',
    notes: 'Wool jacket with a torn inner lining seam at the left armhole. Moderate repair needed.',
    confidence: { type: 0.91, material: 0.87, damage: 0.79, complexity: 0.85 },
  },
  {
    type: 'pants',
    material: 'denim',
    damage: 'hole',
    complexity: 'low',
    notes: 'Denim jeans with a small hole at the right knee. Standard patch repair.',
    confidence: { type: 0.96, material: 0.94, damage: 0.88, complexity: 0.82 },
  },
  {
    type: 'dress',
    material: 'silk',
    damage: 'stain',
    complexity: 'high',
    notes: 'Silk evening dress with a wine stain near the hem. Delicate fabric requires specialist handling.',
    confidence: { type: 0.89, material: 0.72, damage: 0.95, complexity: 0.88 },
  },
  {
    type: 'shirt',
    material: 'cotton',
    damage: 'missing_button',
    complexity: 'low',
    notes: 'Cotton dress shirt missing two buttons on the front placket. Simple replacement needed.',
    confidence: { type: 0.98, material: 0.93, damage: 0.97, complexity: 0.91 },
  },
  {
    type: 'coat',
    material: 'wool',
    damage: 'worn_fabric',
    complexity: 'high',
    notes: 'Heavy wool overcoat with worn elbows and thinning fabric at stress points.',
    confidence: { type: 0.93, material: 0.90, damage: 0.84, complexity: 0.87 },
  },
]

// Strict JSON Schema — Structured Outputs enforces exact compliance, no regex fallback needed
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
      notes: {
        type: 'string',
        description: '1-2 sentences: garment description and specific damage location. Use empty string if no damage.',
      },
      confidence: {
        type: 'object',
        properties: {
          type: { type: 'number', description: '0.0–1.0 confidence in garment type classification' },
          material: { type: 'number', description: '0.0–1.0 confidence in material identification' },
          damage: { type: 'number', description: '0.0–1.0 confidence in damage assessment' },
          complexity: { type: 'number', description: '0.0–1.0 confidence in repair complexity estimate' },
        },
        required: ['type', 'material', 'damage', 'complexity'],
        additionalProperties: false,
      },
    },
    required: ['type', 'material', 'damage', 'complexity', 'notes', 'confidence'],
    additionalProperties: false,
  },
}

// System prompt sets expert context — placed before image per OpenAI best practice
const SYSTEM_PROMPT = `You are an expert garment repair classifier at a professional tailor shop with 20+ years of experience.
Your job is to analyze garment photos and produce accurate intake classifications for repair work.
You have deep knowledge of fabric types, common damage patterns, and repair complexity.
Set confidence scores based on image clarity: use 0.5–0.7 when ambiguous, 0.8–0.95 when clear.`

const USER_PROMPT = `Analyze this garment carefully. Examine fabric texture, weave pattern, visible damage, and construction details.

Complexity rubric:
- low: single simple repair (replace button, minor hem stitch, small patch)
- medium: requires skill (seam reconstruction, zipper replacement, lining repair)
- high: complex work or delicate material (full reconstruction, silk/leather, multiple damage areas)

Fill notes with a 1-2 sentence description: garment type + specific damage location and nature.
If no damage is visible, describe the garment and write an empty string for notes.`

const getMediaType = (imagePath) => {
  const ext = path.extname(imagePath).toLowerCase()
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }
  return map[ext] || 'image/jpeg'
}

const classifyWithGpt4o = async (imagePath) => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')
  const mediaType = getMediaType(imagePath)

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 800,
    // Structured Outputs: strict schema guarantees valid JSON with exact field types and enums
    response_format: { type: 'json_schema', json_schema: CLASSIFICATION_SCHEMA },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${base64}`,
              // high detail: tiles image into 512px crops for fine-grained fabric/damage analysis
              detail: 'high',
            },
          },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return { ...parsed, _source: 'gpt-4o' }
}

const stubClassify = () => ({
  ...STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)],
  _source: 'stub',
})

const classifyGarment = async (imagePath) => {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] No OPENAI_API_KEY set — using stub classifier')
    return stubClassify()
  }

  try {
    return await classifyWithGpt4o(imagePath)
  } catch (err) {
    console.error('[AI] GPT-4o classification failed, falling back to stub:', err.message)
    return { ...stubClassify(), _source: 'stub_fallback', _error: err.message }
  }
}

module.exports = { classifyGarment }
