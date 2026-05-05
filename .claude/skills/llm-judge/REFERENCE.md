# LLM-Judge Reference

## Judge JSON schema (Structured Outputs)

```js
const JUDGE_SCHEMA = {
  name: 'classification_judgement',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      plausibility: { type: 'number', description: '0.0–1.0: does the classification match what is visible?' },
      specificity:  { type: 'number', description: '0.0–1.0: are notes concrete and actionable?' },
      calibration:  { type: 'number', description: '0.0–1.0: are confidence scores reasonable given image clarity?' },
      reasoning:    { type: 'string', description: '1–2 sentences explaining the lowest sub-score.' },
      flagged:      { type: 'boolean', description: 'true if any sub-score < 0.5 — surfaces obvious failures.' },
    },
    required: ['plausibility', 'specificity', 'calibration', 'reasoning', 'flagged'],
    additionalProperties: false,
  },
}
```

Final `judge_score = mean(plausibility, specificity, calibration)`.

## Judge prompts

```js
const SYSTEM_PROMPT = `You are a senior quality reviewer at a garment repair shop.
Your job is to evaluate AI-generated garment classifications for plausibility and usefulness — NOT to re-classify.
You see the image and the classification. Score how well the classification fits the image.
Be strict: a confident classification of "shirt/cotton" for a clearly leather jacket scores near 0 on plausibility.
Vague notes like "garment with damage" score low on specificity. Confidence of 0.95 on a blurry image scores low on calibration.`

const USER_PROMPT = (classification) => `Evaluate this classification against the image.

Classification produced by the AI:
${JSON.stringify(classification, null, 2)}

Score each dimension 0.0–1.0:
- plausibility: does type/material/damage match what is visible?
- specificity: are the notes concrete enough for a tailor to act on?
- calibration: do confidence scores match image clarity? (high confidence on blurry/ambiguous = low score)

Set flagged=true if any sub-score is below 0.5.
Reasoning: 1–2 sentences focused on the LOWEST sub-score.`
```

## Stub mode

When `OPENAI_API_KEY` is absent, return:

```js
{
  plausibility: 0.85,
  specificity:  0.80,
  calibration:  0.82,
  reasoning:    'Stub judge — no API key configured.',
  flagged:      false,
  _source:      'stub',
}
```

Mean score 0.82, deterministic, never flagged. Lets dev/test runs proceed.

## Service contract

```js
// backend/src/services/aiJudge.js
const judgeClassification = async ({ imagePath, classification }) => {
  // returns { score, sub_scores, reasoning, flagged, model, _source }
  // never throws — on error returns { _source: 'stub_fallback', _error: msg, ...stub }
}

module.exports = { judgeClassification }
```

## Repository changes

```js
// backend/src/repositories/garmentRepository.js — schema additions
db.exec(`
  ALTER TABLE garments ADD COLUMN judge_score     REAL;
  ALTER TABLE garments ADD COLUMN judge_reasoning TEXT;
  ALTER TABLE garments ADD COLUMN judge_model     TEXT;
`)
```

Wrap each `ALTER` in a try/catch ignoring "duplicate column" — SQLite has no `IF NOT EXISTS` for columns. See existing migration pattern in the file.

## Config additions

```js
// backend/src/config/index.js — inside the ai block
ai: {
  // ...existing fields...
  judgeEnabled: optional('AI_JUDGE_ENABLED', 'false') === 'true',
  judgeModel:   optional('AI_JUDGE_MODEL', 'gpt-4o-mini'),
}
```

Why `gpt-4o-mini` for judge: ~10x cheaper than `gpt-4o`, sufficient for rubric scoring. Override via env if needed.

## Call site (in `garmentService.js`)

```js
const classification = await classifyGarment(imagePath)
let judgement = null
if (config.ai.judgeEnabled) {
  try {
    judgement = await judgeClassification({ imagePath, classification })
  } catch (err) {
    logger.error({ err: err.message }, 'Judge failed; continuing without score')
  }
}
return repo.insertGarment({ ...classification, judgement })
```

Judgement failure must not block the upload flow.

## Test patterns

Mirror `backend/tests/unit/aiClassifier.test.js`:

- Stub returns deterministic shape when `OPENAI_API_KEY` unset
- Mocked OpenAI client returns valid schema-compliant JSON → service returns parsed result
- Mocked OpenAI throws → service returns stub_fallback with `_error`
- Score is mean of three sub-scores within 0.001 tolerance
- `flagged === true` when any sub-score is < 0.5

Integration test (optional): seed a garment via the API with judge enabled, assert `judge_score` is non-null in response.

## Aggregation metrics for eval runner

```js
const summarise = (scores) => ({
  count: scores.length,
  mean:  mean(scores),
  p10:   percentile(scores, 0.1),
  p50:   percentile(scores, 0.5),
  p90:   percentile(scores, 0.9),
  belowThreshold: scores.filter(s => s < 0.6).length,
})
```

Group by `garment_type` to surface which categories the classifier struggles with.
