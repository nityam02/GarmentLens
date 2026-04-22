# DECISIONS.md — Architecture Decision Records

---

## ADR-001: SQLite over MongoDB

**Decision**: Use `better-sqlite3` instead of MongoDB.

**Reason**: The cairn-backend skeleton specified MongoDB, but it requires a running external service, connection strings, and setup steps that add friction for evaluators. SQLite is a single file, zero-config, and sufficient for a single-process MVP. Switching to MongoDB later is straightforward since the query layer is isolated in `db/database.js`.

**Trade-off**: No horizontal scaling. Acceptable for "one store, one employee" scope.

---

## ADR-002: MinIO for S3-compatible storage, with local disk fallback

**Decision**: Store uploaded images in MinIO (S3-compatible). Fall back to local disk when `MINIO_ENDPOINT` env var is not set.

**Reason**: Originally challenged and rejected in the first draft — product owner confirmed F2 is locked and non-negotiable. Revised decision: implement MinIO as primary storage, exposed as a Docker Compose service. The original instinct (keep local dev frictionless) is preserved via the fallback: without `MINIO_ENDPOINT`, the app runs entirely on local disk, which is correct for development without Docker.

Storage is abstracted in `services/storageService.js`. The controller and AI classifier were minimally changed — `uploadFile()` is a no-op in local mode and a MinIO `fPutObject` in Docker mode. Image serving uses MinIO presigned URLs (1-hour TTL) when MinIO is active, or `res.sendFile()` when local.

**Trade-off**: Docker Compose startup now requires MinIO to be healthy before the backend starts. Mitigated with a `depends_on: condition: service_healthy` check.

---

## ADR-003: Synchronous AI classification

**Decision**: Classification happens inline during the POST request (synchronous), not via a background queue.

**Reason**: Async processing (Bull, worker threads, etc.) adds queue infrastructure for marginal UX gain at 200 garments/week. The frontend shows a loading state during the 2–5s classification window. If Claude API is slow, the stub fallback returns instantly.

**Trade-off**: Slow AI responses block the HTTP response. Mitigation: 15s timeout on AI call; stub fallback.

---

## ADR-004: Polling over WebSockets for live updates

**Decision**: Frontend polls GET /api/garments every 5 seconds.

**Reason**: F7 required "live UI update (no refresh)" but didn't mandate WebSockets. At 200 garments/week, polling is architecturally appropriate. WebSockets add server-side state management and reconnection logic for no meaningful benefit at this volume.

**Trade-off**: 5s lag on updates from other clients. Acceptable for single-employee tool.

---

## ADR-005: No authentication

**Decision**: No auth layer in MVP.

**Reason**: The product description is explicit: "One employee, one store, one purpose." Auth adds setup (JWT secrets, login flow, session management) that would consume ~1 hour of the 4h budget with zero user-visible benefit in a single-user internal tool.

**Trade-off**: Any network-accessible endpoint is open. Mitigation: rate limiting; designed to run on internal network only.

---

## ADR-006: Claude Haiku for AI classification

**Decision**: Use `claude-haiku-4-5` (not Sonnet or Opus).

**Reason**: Haiku is the fastest and cheapest Claude model with vision capability. For a structured JSON classification task with a constrained output schema, Haiku is sufficient. Opus would add latency and cost for the same output.

**Trade-off**: Slightly lower accuracy on ambiguous images compared to Sonnet. Mitigation: manual override is a core feature.

---

## ADR-007: Keep both AI and override data in DB

**Decision**: Store original AI classification AND override fields separately, never overwrite AI output.

**Reason**: Preserving AI output alongside human corrections enables future accuracy analysis ("how often does the intake employee override the AI, and on which attributes?"). This is free to implement now and invaluable for the manager analytics the product owner mentioned.

**Trade-off**: Slightly more complex DB schema and serialization. Worth it.

---

## ADR-008: React + Vite over Next.js / CRA

**Decision**: Plain React with Vite.

**Reason**: No SSR needed for an internal tool. Next.js adds complexity (routing conventions, server components) without benefit. Vite gives fast HMR and minimal config. This mirrors the frontend philosophy of Tokopedia-lite-phoenix (Skipper + React) but without the SSR overhead.
