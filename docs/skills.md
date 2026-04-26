# GarmentLens — Skills & Technologies

---

## Languages

| Language | Where used |
|----------|-----------|
| **JavaScript (ES2020+)** | Backend — Node.js, Express, all server-side logic |
| **TypeScript (5.x strict)** | Frontend — all React components, hooks, API layer, shared types |
| **SQL** | SQLite schema, WAL-mode prepared statements |
| **CSS (custom properties)** | Full design system via CSS variables — no framework |
| **YAML** | Docker Compose configuration |
| **Markdown** | Documentation (PLAN, DESIGN, DECISIONS, REFLECTION, README) |

---

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI framework, component model, hooks |
| **TypeScript** | 5.x strict | Full type coverage across components, hooks, API layer |
| **Vite** | 5.x | Build tool, dev server, hot module replacement |
| **Fetch API** | native | HTTP calls to backend — no axios, no react-query |
| Custom hooks | — | `useGarments` — polling, state, optimistic updates |
| CSS custom properties | — | Token-based design system (colors, radius, shadows, spacing) |

**Patterns applied:**
- Custom hooks as the data and state layer
- Controlled components for all form inputs
- Optimistic UI update on upload (card appears immediately)
- Drag-and-drop via native HTML5 drag events (no library)
- Polling every 5s via `setInterval` with cleanup on unmount

---

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime |
| **Express** | 4.18 | HTTP server, routing, middleware chain |
| **better-sqlite3** | 9.x | Synchronous, embedded SQLite — zero-config database |
| **Multer** | 1.4 | Multipart file upload, MIME validation, size limits |
| **minio** | 7.x | S3-compatible object storage client (F2 requirement) |
| **openai** | 4.x | GPT-4o vision API for garment image classification |
| **express-rate-limit** | 7.x | 60 req/min per IP — protects AI API cost exposure |
| **cors** | 2.x | Cross-origin resource sharing with explicit origin whitelist |
| **dotenv** | 16.x | Environment variable loading from `.env` |
| **uuid** | 9.x | UUID v4 for garment IDs |
| **sharp** | 0.33 | Image processing, resizing, future EXIF stripping |

**Patterns applied:**
- MVC: routes → controllers → services → db
- Prepared statements for all SQL (injection prevention by architecture)
- Service abstraction layer (`storageService.js`, `aiClassifier.js`) — swappable implementations
- Graceful degradation: stub AI when no API key; local disk when no MinIO endpoint
- WAL-mode SQLite for concurrent read access
- Path traversal prevention via `path.basename()` on all user-supplied filenames

---

## AI — GPT-4o Vision

| Topic | Detail |
|-------|--------|
| **Model** | `gpt-4o` via OpenAI SDK |
| **Image detail** | `"high"` — tiles image into 512px crops for fine-grained fabric/damage analysis |
| **Output format** | `response_format: { type: "json_object" }` — guaranteed valid JSON, no regex parsing |
| **Prompt strategy** | System prompt (expert context) → image → user instructions (schema + rubric) |
| **Output schema** | `type`, `material`, `damage`, `complexity`, `notes`, `confidence` (per-attribute 0–1) |
| **Fallback** | Stub classifier with 5 realistic responses — works without API key |
| **Error recovery** | API failure → `stub_fallback` with `_error` field logged |

**Why GPT-4o over alternatives:**
- `response_format: json_object` eliminates fragile regex JSON parsing
- `detail: "high"` significantly improves accuracy on fabric texture and small damage detection
- System prompt + image-before-text ordering follows OpenAI's documented best practice for vision tasks

---

## Storage & Infrastructure

| Technology | Purpose |
|------------|---------|
| **MinIO** | Self-hosted S3-compatible object storage — satisfies F2 requirement |
| **Presigned URLs** | 1-hour time-limited image access — no public bucket exposure |
| **SQLite WAL mode** | Embedded database with concurrent read support |
| **Docker** | Backend and frontend containerisation |
| **Docker Compose** | Orchestrates MinIO + backend + frontend in one `docker compose up` |
| **Nginx** | Serves Vite build in Docker; reverse-proxies `/api/*` to backend |

---

## Developer Tooling

| Tool | Purpose |
|------|---------|
| **nodemon** | Auto-restart backend on file save (dev) |
| **Vite HMR** | Instant frontend updates without full reload (dev) |
| **tsc --noEmit** | TypeScript type checking (zero errors in CI) |
| **Git** | Version control |

---

## Architecture Patterns

| Pattern | Where |
|---------|-------|
| **MVC** | Backend: routes / controllers / services / db |
| **Service layer** | `aiClassifier.js`, `storageService.js` — implementations are swappable |
| **Repository (light)** | `db/database.js` — all SQL in one place as prepared statements |
| **Graceful degradation** | Stub AI + local disk fallback — zero external dependencies for local dev |
| **Optimistic UI** | Uploaded garment appears immediately in queue, reconciled on next poll |
| **State machine** | `pending → classified → completed` with explicit DB transitions |
| **Polling** | 5s interval — appropriate at ~1.7 garments/hour; no WebSocket complexity |

---

## Security Concepts Applied

| Concept | Implementation |
|---------|---------------|
| Path traversal prevention | `path.basename()` on all user-supplied filenames |
| MIME type validation | Multer `fileFilter` — whitelist of 3 types |
| Rate limiting | 60 req/min per IP via `express-rate-limit` |
| Secret management | All credentials in `.env` (gitignored), never in source |
| CORS policy | Explicit origin whitelist via `ALLOWED_ORIGIN` env var |
| SQL injection prevention | Prepared statements with named params — enforced by architecture |
| Presigned URL TTL | 1-hour expiry — images not permanently exposed |

---

## Concepts Demonstrated Overall

- REST API design (resource-oriented, correct HTTP verbs and status codes)
- GPT-4o vision integration with structured JSON output and fallback strategy
- S3-compatible object storage with presigned URL image serving
- SQLite WAL-mode for embedded production-quality persistence
- Docker multi-stage builds (Node → Nginx for frontend)
- TypeScript strict mode with zero `any` usage
- CSS design token system using custom properties
- Scope management: MoSCoW prioritization, requirement challenges with justification
