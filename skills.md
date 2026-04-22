# GarmentLens — Skills & Technologies

---

## Languages

| Language | Where used |
|----------|-----------|
| **JavaScript (ES2020+)** | Backend — Node.js, Express, all server-side logic |
| **TypeScript (5.x)** | Frontend — all React components, hooks, API layer, types |
| **SQL** | SQLite schema, prepared statements |
| **CSS (custom properties)** | Frontend — full design system via CSS variables, no framework |
| **YAML** | Docker Compose configuration |
| **Markdown** | All documentation files |

---

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2 | UI framework, component model |
| **TypeScript** | 5.x | Type safety across all components and API calls |
| **Vite** | 5.x | Build tool, dev server, HMR |
| **Fetch API** | native | HTTP calls to backend (no axios) |
| Custom hooks | — | `useGarments` — polling, state, optimistic updates |
| CSS Variables | — | Design token system (colors, radius, shadows, typography) |

**Patterns used:**
- Custom hooks for data fetching + polling
- Controlled components for forms
- Prop drilling (shallow enough to not need Context at this scale)
- Optimistic UI update on upload
- Drag-and-drop via native HTML5 drag events

---

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime |
| **Express** | 4.18 | HTTP server, routing, middleware |
| **better-sqlite3** | 9.x | Synchronous SQLite — database layer |
| **Multer** | 1.4 | Multipart file upload handling |
| **minio** | 7.x | S3-compatible object storage client |
| **@anthropic-ai/sdk** | 0.39 | Vision model API for garment classification |
| **express-rate-limit** | 7.x | Request rate limiting (60 req/min) |
| **cors** | 2.x | Cross-origin resource sharing |
| **dotenv** | 16.x | Environment variable loading |
| **uuid** | 9.x | UUID v4 generation for garment IDs |
| **sharp** | 0.33 | Image processing / file type validation |

**Patterns used:**
- MVC separation: routes → controllers → services
- Prepared statements (SQL injection prevention)
- Service abstraction (`storageService.js`, `aiClassifier.js`)
- Graceful degradation (stub AI, local disk fallback)
- WAL mode SQLite for concurrent reads

---

## AI / Machine Learning

| Technology | Purpose |
|------------|---------|
| **Anthropic SDK** | Client for calling vision model |
| **claude-haiku-4-5** | Fast, cost-effective vision model for structured classification |
| **Prompt engineering** | Zero-shot structured JSON output with constrained enum values |
| **Confidence scores** | Per-attribute 0–1 scores returned alongside classification |
| **Stub classifier** | Realistic hardcoded fallback — no API key needed to demo |

---

## Storage & Infrastructure

| Technology | Purpose |
|------------|---------|
| **MinIO** | Self-hosted S3-compatible object storage for garment images |
| **SQLite** | Embedded relational database (no external service needed) |
| **Docker** | Containerisation of backend and frontend |
| **Docker Compose** | Multi-service orchestration (MinIO + backend + frontend) |
| **Nginx** | Serves React build in Docker; proxies `/api/*` to backend |

---

## Developer Tooling

| Tool | Purpose |
|------|---------|
| **nodemon** | Auto-restart backend on file changes (dev) |
| **Vite HMR** | Hot module replacement in frontend (dev) |
| **TypeScript compiler** | Type checking (`tsc --noEmit`) |
| **Git** | Version control |

---

## Architecture Patterns

| Pattern | Applied where |
|---------|--------------|
| **MVC** | Backend: routes / controllers / services / db |
| **Service layer** | `aiClassifier.js`, `storageService.js` — swappable implementations |
| **Repository pattern (light)** | `db/database.js` — all SQL in one place via prepared statements |
| **Graceful degradation** | AI stub, local disk fallback — system works without external dependencies |
| **Polling** | Frontend refreshes queue every 5s — appropriate at 200 garments/week |
| **Optimistic UI** | Uploaded garment appears in list immediately before server confirms |
| **State machine** | `pending → classified → completed` with explicit transitions |

---

## Concepts Demonstrated

- REST API design (resource-oriented endpoints, correct HTTP verbs)
- File upload handling and validation (MIME type, size limit, path traversal prevention)
- Environment-based configuration (`.env`, Docker env vars)
- S3-compatible object storage integration with presigned URLs
- AI API integration with structured output and fallback strategy
- SQLite WAL mode for concurrent-read workloads
- Docker multi-stage builds (frontend: Node build → Nginx serve)
- CSS design system using custom properties
- TypeScript strict mode with full type coverage
