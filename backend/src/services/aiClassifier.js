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

// System prompt sets expert context — placed before image per OpenAI best practice
const SYSTEM_PROMPT = `You are an expert garment repair classifier at a professional tailor shop with 20+ years of experience.
Your job is to analyze garment photos and produce accurate intake classifications for repair work.
You have deep knowledge of fabric types, common damage patterns, and repair complexity.
Always respond with valid JSON only — no markdown, no explanation, no preamble.`

// User prompt is sent after the image in the content array
const buildUserPrompt = () => `Analyze this garment image carefully. Examine the fabric texture, weave pattern, visible damage, and construction details.

Return a JSON object with exactly this structure:
{
  "type": one of ${JSON.stringify(GARMENT_TYPES)},
  "material": one of ${JSON.stringify(MATERIALS)},
  "damage": one of ${JSON.stringify(DAMAGES)},
  "complexity": one of ${JSON.stringify(COMPLEXITIES)},
  "notes": "1-2 sentences: garment description + specific damage location and nature",
  "confidence": {
    "type": <0.0–1.0>,
    "material": <0.0–1.0>,
    "damage": <0.0–1.0>,
    "complexity": <0.0–1.0>
  }
}

Complexity rubric:
- low: single simple repair (replace button, minor hem stitch, small patch)
- medium: requires skill (seam reconstruction, zipper replacement, lining repair)
- high: complex work or delicate material (full reconstruction, silk/leather, multiple damage areas)

Set confidence based on image clarity and certainty. Use lower scores (0.5–0.7) when the image is unclear or ambiguous.`

const validateClassification = (data) => {
  if (!GARMENT_TYPES.includes(data.type)) data.type = 'other'
  if (!MATERIALS.includes(data.material)) data.material = 'unknown'
  if (!DAMAGES.includes(data.damage)) data.damage = 'none_visible'
  if (!COMPLEXITIES.includes(data.complexity)) data.complexity = 'low'

  const clamp = (v) => Math.min(1, Math.max(0, typeof v === 'number' ? v : 0.5))
  data.confidence = {
    type: clamp(data.confidence?.type),
    material: clamp(data.confidence?.material),
    damage: clamp(data.confidence?.damage),
    complexity: clamp(data.confidence?.complexity),
  }

  return data
}

const stubClassify = () => ({
  ...STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)],
  _source: 'stub',
})

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
    max_tokens: 600,
    // JSON mode — GPT-4o guarantees valid JSON output, no regex parsing needed
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${base64}`,
              // high detail: GPT-4o splits image into 512px tiles for fine-grained analysis
              // better at detecting fabric texture, seam damage, small tears
              detail: 'high',
            },
          },
          { type: 'text', text: buildUserPrompt() },
        ],
      },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content)
  return { ...validateClassification(parsed), _source: 'gpt-4o' }
}

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
