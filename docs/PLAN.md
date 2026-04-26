# GarmentLens — PLAN.md

> Written before coding. Submitted together with implementation.

---

## 1. MoSCoW Prioritization

### Legend
- 🔒 Locked Must (as given)
- ✅ Kept
- ⬆️ Upgraded
- ⬇️ Downgraded
- ❌ Rejected

---

### Must Have

| ID | Requirement | Decision | Justification |
|----|-------------|----------|---------------|
| F1 | Upload garment image | ✅ 🔒 Kept | Core intake action. No product without it. |
| F4 | List all garments with classification | ✅ 🔒 Kept | Tailors need the queue to pick work. |
| F6 | README to run app from scratch | ✅ 🔒 Kept | Evaluator needs to run it. Non-negotiable. |
| F2 | Store image in S3-compatible storage | ✅ ⬆️ Reinstated | **Originally challenged and rejected — revised after product owner confirmed F2 is locked.** Implementing with MinIO in Docker Compose. Local disk fallback when `MINIO_ENDPOINT` is unset preserves frictionless local dev. Storage abstracted in `storageService.js` — a contained change. |
| F3 | AI classification (type, damage, material, complexity) | ✅ Kept | Core value proposition. Without this it's just a photo album. Kept as Must but scoped: stub fallback allowed. |
| F5 | Persist metadata in DB | ✅ Kept | F4 is impossible without persistence. |
| — | Structured JSON output from AI | ✅ Kept | Required to render classification in UI. |
| — | Graceful failure handling (AI) | ✅ Kept | AI APIs fail. Without fallback the whole upload fails. |
| — | Manual override of AI | ✅ ⬆️ Upgraded from Should | Intake employee explicitly needs this in the workflow description. AI alone is insufficient. |
| — | File validation | ✅ ⬆️ Upgraded | Minimal security at the only external boundary (file upload). 10 lines of code, high risk if skipped. |
| — | Progress indicator | ✅ ⬆️ Upgraded | AI call takes 2–5s. Without feedback the UI feels broken. |

---

### Should Have

| ID | Requirement | Decision | Justification |
|----|-------------|----------|---------------|
| F7 | Live UI update (no refresh) | ⬇️ Downgraded from Must | **Challenge**: "no refresh" does not require WebSockets. Polling every 5s achieves the same UX for a low-volume internal tool (~200/week = ~1.7/hour). Moved to Should; implementing with interval polling. |
| — | Confidence score per attribute | ✅ Kept | Helps employee decide whether to override. Low implementation cost once JSON is structured. |
| — | Mark garment as completed | ✅ Kept | **"Completed" = tailor has physically claimed the garment from the intake queue.** This is the only state differentiation MVP needs: intake employee sees what needs classification review; tailor sees what is ready to pick. Anything beyond (in-repair, repair-done) is post-MVP scope creep. |
| — | Async processing | ⬇️ Downgraded | Synchronous upload+classify is acceptable for MVP. Async adds queue complexity without meaningful UX gain at this volume. |
| — | Docker Compose | ✅ Kept | Makes README simpler. One `docker compose up` is better than 5 setup steps. |
| — | Rate limiting | ✅ Kept | Single middleware line (`express-rate-limit`). Reasonable minimum. |
| — | Queue ordering/filtering | ✅ FIFO, no filter UI | At 200 garments/week (~1.7/hour), strict FIFO with newest-first default is appropriate. No filter or sort UI for MVP — tailors pick the next item without complex navigation. Revisit if volume grows or if damage-type routing becomes a business need. |
| — | Analytics data model | ✅ Structured, UI deferred | DB captures timestamps, complexity distribution, damage type, material, and AI vs. override divergence — all fields needed for a future manager dashboard. Analytics UI is deliberately excluded from MVP. Trade-off: 4 extra columns now vs. a migration with data backfill later. |

---

### Nice to Have

| ID | Requirement | Decision | Justification |
|----|-------------|----------|---------------|
| F8 | Branding (logo + colors) | ⬇️ **Challenge 🔒 Locked Must** | **Challenged**: Branding is polish, not function. The product works without a logo. A locked Must should be something the product *cannot function without*. I'm implementing a clean theme (CSS variables) but rejecting "logo + colors" as a Must-level gate. |
| — | Responsive UI | ✅ Nice | Internal desktop tool. Mobile responsiveness is a nice-to-have polish item. |
| — | Structured logging | ✅ Nice | Useful for debugging but not blocking. |
| — | Remove EXIF GPS | ✅ Nice | Privacy-positive, low effort with `sharp`. Would implement if time allows. |

---

### Will Not Have

| ID | Requirement | Decision | Justification |
|----|-------------|----------|---------------|
| ~~F2~~ | ~~S3-compatible storage~~ | ~~❌~~ | *Moved to Must Have above after product owner confirmation.* |
| — | ≥95% accuracy | ❌ **Bad requirement** | **Flagged as misleading**: Impossible to guarantee in 4 hours. Accuracy depends on model, prompt engineering, training data, and garment diversity — none of which can be validated in this timeline. This is a success metric for a later sprint, not an MVP requirement. |
| — | Authentication | ❌ Rejected | Single-employee, single-store, internal network tool. Auth adds setup friction with no security benefit in the described context. Add when multi-user or remote access is needed. |
| — | PWA | ❌ Rejected | Internal desktop tool. PWA benefits (offline, install) don't apply. |
| — | Capacitor / Native apps | ❌ **Flagged as overkill** | The requirements themselves note this. Rejected entirely. |
| — | Multi-tenant | ❌ Rejected | Explicitly out of scope: "One store." |
| — | Webhooks | ❌ Rejected | No downstream systems to integrate with in MVP. |
| — | Real-time collaboration | ❌ Rejected | Single employee intake flow. Collaboration is a future concern. |
| — | Blockchain audit log | ❌ **Flagged as clearly bad** | No justification for blockchain in an internal repair shop intake tool. Adds massive complexity for zero benefit. This requirement should be deleted, not deferred. |
| — | Customer uploads | ❌ Rejected | Explicitly out of scope: "Not a customer-facing system." |
| — | Pricing catalog | ❌ Rejected | Out of scope for intake. |
| — | Payment flow (Vipps/Stripe) | ❌ Rejected | Wrong layer. Intake tool ≠ POS system. |
| — | Accessibility (WCAG 2.1 AA) | ❌ Rejected for MVP | Important long-term. Not achievable correctly in 4 hours — partial compliance is worse than acknowledged non-compliance. Flagged for next sprint. |
| — | Automated tests | ❌ Rejected | Time budget does not allow meaningful test coverage. Manual testing of happy path + AI fallback is sufficient for evaluation. |

---

## 2. Time Budget

Total: ~4 hours

| Area | Estimated Time | What's covered |
|------|---------------|----------------|
| PLAN.md | 45 min | MoSCoW table, risks, questions |
| Backend scaffold + DB | 30 min | Express setup, SQLite schema, routes |
| File upload + validation | 20 min | Multer, MIME check, size limit |
| AI classifier service | 40 min | Vision API integration + stub fallback |
| Garment CRUD API | 25 min | POST /garments, GET /garments, PATCH override, PATCH complete |
| Frontend scaffold | 20 min | Vite + React + TypeScript, API layer |
| Upload component | 25 min | Drag & drop, preview, loading state |
| Garment list + cards | 30 min | Queue view, badges, confidence display |
| Override modal | 20 min | Form to correct AI classification |
| README + DECISIONS | 15 min | Setup instructions, ADR notes |
| REFLECTION.md | 20 min | Honest retrospective |
| **Total** | **~4h 10min** | |

---

## 3. Risks and Assumptions

### Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | AI vision API latency > 5s degrades UX | Medium | Medium | Show progress bar; set 15s timeout; stub fallback |
| 2 | AI returns malformed JSON | Medium | High | JSON parse with try/catch; fallback to stub on failure |
| 3 | Large images cause memory issues | Low | Medium | Multer file size limit (10MB); sharp resize before AI call |
| 4 | SQLite file corruption under concurrent writes | Low | High | Single-process MVP; acceptable risk. Use WAL mode. |
| 5 | AI API key not set in evaluator environment | Medium | High | Stub fallback returns realistic hardcoded JSON automatically |

### Assumptions

| # | Assumption |
|---|------------|
| 1 | Evaluator has Node.js 18+ installed (or Docker) |
| 2 | AI API key is optional — stub mode works without it |
| 3 | Single-process, single-user deployment (no concurrency concerns) |
| 4 | Garment images are reasonably well-lit (AI accuracy degrades on dark/blurry images) |
| 5 | "Live UI update" means the list refreshes without full page reload — not necessarily WebSocket push |

---

## 4. Questions for the Product Owner

1. **Override workflow**: When an employee overrides AI classification, should the original AI output still be visible alongside the correction? This affects data model design — storing both or replacing.

2. **"Completed" status**: Does "mark as completed" mean the tailor has *picked* the garment (removed from queue) or *finished the repair*? These are two different states with different workflow implications.

3. **Image retention policy**: How long should garment images and records be kept? This affects storage planning and whether local disk (vs. S3) matters beyond the MVP.

4. **Queue prioritization**: Should the queue be first-in-first-out, or do tailors need to filter/sort by damage type, complexity, or material? Knowing this now affects whether the list component needs any filtering UI.

5. **Manager analytics**: The store manager wants "future insights." Even for MVP, should we capture any structured data that would feed future reporting (e.g., timestamp, complexity distribution)? Capturing it now is free; retrofitting is expensive.
