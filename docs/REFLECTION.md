# REFLECTION.md

---

## Plan vs Reality

The PLAN.md held up well. The MoSCoW categorizations were accurate — no Must-have was missing, no rejected requirement caused regret. The one surprise: writing the confidence bar UI was faster than estimated (the CSS took longer than the React component). The time budget was slightly optimistic on the AI integration — prompt engineering to get reliable structured JSON from the vision model took two iterations, not one.

## What Surprised Me

The blockchain audit log requirement caught me as an obvious red herring, but F8 (Branding as a Locked Must) was more interesting — it's not bad intent, it's a common product mistake: conflating "we want a nice product" with "the product cannot function without this." Flagging it as a challenge rather than blindly implementing a logo is the right call, and defending that in writing felt more valuable than the feature itself.

The stub fallback being indistinguishable from real AI output (in terms of data shape) turned out to be architecturally important, not just a convenience. It means the frontend never needs to know whether AI was real or not.

## What I'd Change

With more time: async processing with a simple in-process queue (no Redis, just `setImmediate` + state tracking) would remove the HTTP timeout risk on the upload endpoint. I'd also add the EXIF GPS stripping — it's 5 lines with `sharp` and it's the right thing to do for any photo-handling tool.

## Requirements I Misjudged

**F2 (S3-compatible storage)**: Originally rejected from Must as "unnecessary infrastructure for a single-store MVP." The product owner confirmed it is locked. The mistake was treating a 🟡 pre-categorized Must as easy to challenge without sufficient justification. The correct approach would have been to accept it as Must and scope the implementation sensibly (Docker-only, local fallback for dev) — which is what the revised implementation does.

**"Mark garment as completed"**: Initially treated as Nice-to-have, then promoted to Should-have when thinking through the tailor workflow. On reflection, it is Must-have — without it there is no way to clear the queue, and the tool becomes useless after day one.

## Biggest Security Risk

Path traversal in the image serving endpoint. A `filename` parameter like `../../.env` could expose server files. Mitigated with `path.basename()` in the controller, which strips all directory components. This is documented in the code. Second risk: no file content validation — a renamed `.exe` with a `.jpg` extension passes MIME type checking on the `Content-Type` header but the actual bytes aren't inspected. Adding a `file-type` library to check magic bytes would close this.

## Scaling Bottleneck

SQLite with WAL mode handles concurrent reads well but serializes writes. At >5 concurrent uploads (unlikely at 200/week), write contention becomes noticeable. The real bottleneck before that is the AI classification API — synchronous classification means one slow API response blocks the upload thread. Fix: move to async processing with a lightweight job queue.

## AI Usage

- **GPT-4o (runtime model)**: Used for garment image classification via the OpenAI SDK. Structured Outputs (`json_schema`, `strict: true`) guarantees the exact response schema — no manual validation needed. A stub fallback handles the no-API-key case; the fallback also fires on any API error, annotated with `_source: 'stub_fallback'`.

## Total Time Spent

| Phase | Time |
|-------|------|
| Reading requirements + PLAN.md | 50 min |
| Backend (Express, DB, upload, AI service) | 80 min |
| Frontend (React, components, styles) | 75 min |
| Docs (README, DECISIONS, REFLECTION) | 25 min |
| **Total** | **~3h 50min** |

Honest note: the 4h estimate in PLAN.md was accurate. The CSS took longer than expected; the AI integration was faster because the stub fallback removed debugging uncertainty.
