---
name: llm-judge
description: Add LLM-as-judge evaluation to the GarmentLens classifier — both an online judge that scores each classification at request time and an offline batch eval runner that scores past classifications against a rubric. Use when the user asks to add evaluation, scoring, quality checks, or a "judge" for the AI classifier; when they want to measure classifier accuracy, calibration, or regressions; or when they mention LLM-as-judge, eval harness, or rubric-based scoring.
---

# LLM-as-Judge for GarmentLens

## What this skill builds

A second LLM call ("the judge") that scores classifications from `aiClassifier.js` against a rubric, returning a numeric score and reasoning. Two surfaces:

1. **Online judge** — service `backend/src/services/aiJudge.js`, called from `garmentService.js` after classification. Score persisted on the garment row.
2. **Offline eval runner** — script `backend/scripts/run-eval.js` that replays the judge over historical garments and prints aggregate metrics.

## Quick start

1. Read `backend/src/services/aiClassifier.js` — match its style: stub fallback, structured outputs, single `_source` annotation, import config from `../config`.
2. Create `backend/src/services/aiJudge.js` exporting `judgeClassification({ imagePath, classification })`. Use the prompt + JSON schema from [REFERENCE.md](REFERENCE.md).
3. Add `ai.judgeModel` and `ai.judgeEnabled` to `backend/src/config/index.js` (default `gpt-4o-mini`, default `false`).
4. Add migration to `backend/src/repositories/garmentRepository.js`: columns `judge_score REAL`, `judge_reasoning TEXT`, `judge_model TEXT`. Update insert/select.
5. In `garmentService.js`, after `classifyGarment` succeeds, call `judgeClassification` (only when `config.ai.judgeEnabled`). Persist score alongside classification. **Failures must not fail the request** — log and continue.
6. Add unit tests `backend/tests/unit/aiJudge.test.js` covering: stub mode, schema compliance, error fallback. Mirror `aiClassifier.test.js` structure.
7. Copy `scripts/run-eval.js` from this skill into `backend/scripts/run-eval.js` and wire it to the real repository + judge service.

## Workflow checklist

- [ ] Judge is **stateless** — does not read DB, only takes inputs as args
- [ ] Judge **never throws into the request path** — wrap call site in try/catch, log, continue
- [ ] Judge uses **strict JSON schema** (Structured Outputs) — same pattern as `aiClassifier.js`
- [ ] Judge has a **stub mode** when `OPENAI_API_KEY` is absent, returning a deterministic mid-range score
- [ ] Judge **ai.judgeEnabled flag** defaults to `false` so existing tests don't break
- [ ] All SQL stays in `garmentRepository.js` — no queries in the judge service or controller
- [ ] All `process.env` reads stay in `config/index.js`
- [ ] No changes to `app.js` listen behavior — integration tests still import the app

## Rubric

The judge scores 0.0–1.0 on these dimensions (see [REFERENCE.md](REFERENCE.md) for full prompt):

- **plausibility** — does the classification match what's visible in the image?
- **specificity** — are the notes concrete and actionable, not vague?
- **calibration** — are the confidence scores reasonable given image clarity?

Final `judge_score` is the mean. Sub-scores live in `judge_reasoning` (JSON-stringified).

## Eval runner

`backend/scripts/run-eval.js` should:

1. Query last N classified garments (default 50, override via `--limit`).
2. For each, re-fetch image from storage, call the judge, collect score.
3. Print: mean score, p10/p50/p90, count below 0.6 threshold, per-garment-type breakdown.
4. Exit non-zero if mean drops below `--threshold` (default 0.7) — usable in CI.

A starter implementation lives at [scripts/run-eval.js](scripts/run-eval.js) — copy and adapt.

## Frontend surface

Add a small badge to `frontend/src/components/GarmentCard.tsx` that renders `judge_score` when present:

- `≥ 0.8` → green dot + score
- `0.6–0.8` → amber dot + score
- `< 0.6` or `flagged` → red dot + score + tooltip with `judge_reasoning`
- absent → render nothing (judge disabled or older row)

Extend the type in `frontend/src/types/index.ts` with optional `judge_score?: number` and `judge_reasoning?: string`. No new API endpoint needed — the score rides on the existing garment payload.

## Out of scope

- Ground-truth labeled datasets (rubric-only judge, no labels needed)
- Judge for re-classification or auto-correction (judge only scores; never overwrites)
- A/B prompt comparison harness (single-classifier scoring only)

## Reference material

- [REFERENCE.md](REFERENCE.md) — judge prompt, JSON schema, sub-score weights
- [scripts/run-eval.js](scripts/run-eval.js) — eval runner template
