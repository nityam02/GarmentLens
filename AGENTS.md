# GarmentLens — AGENTS.md

> This file is read by AI coding agents (OpenAI Codex, Claude Code, Cursor, GitHub Copilot Workspace, etc.)
> before editing this repository. Read it fully before writing any code.

---

## What This Repo Is

**GarmentLens** is an internal garment repair intake tool.
- Intake employee photos a garment → AI classifies it (type, material, damage, complexity)
- Tailors view the queue and claim items

Single-store, single-user, no auth. Internal network only.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express 4 (CommonJS) |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| AI | OpenAI GPT-4o vision (Structured Outputs) — stub fallback if no key |
| Storage | MinIO (S3-compatible) — local disk fallback if no endpoint |
| Frontend | React 18 + TypeScript 5 + Vite 5, plain CSS |
| Container | Docker Compose (minio + backend + frontend/nginx) |
| Tests | Jest + Supertest |

---

## Directory Layout

```
garmentlens/
├── README.md                     ← Setup instructions (evaluator entry point)
├── CLAUDE.md                     ← Context for Claude Code
├── AGENTS.md                     ← This file
├── docker-compose.yml
│
├── docs/                         ← All project documentation
│   ├── PLAN.md                   ← MoSCoW prioritization + time budget
│   ├── REFLECTION.md             ← Post-implementation retrospective
│   ├── DECISIONS.md              ← Architecture Decision Records (ADR-001–008)
│   ├── design.md                 ← Full system design: data model, API, components
│   └── skills.md                 ← Skills demonstrated
│
├── backend/
│   ├── src/
│   │   ├── app.js                ← Express app factory (NO app.listen here)
│   │   ├── server.js             ← Entry point: calls app.listen()
│   │   ├── config/index.js       ← ALL env var access lives here
│   │   ├── common/
│   │   │   ├── errors.js         ← Domain error classes (NotFoundError, ConflictError…)
│   │   │   └── logger.js         ← Structured logger (JSON, silent in tests)
│   │   ├── routes/garments.js    ← Route definitions only
│   │   ├── controllers/
│   │   │   └── garmentsController.js  ← HTTP adapter: extract → call service → respond
│   │   ├── middleware/
│   │   │   └── upload.js         ← Multer: MIME allowlist, size limit
│   │   ├── repositories/
│   │   │   └── garmentRepository.js   ← ALL SQL lives here
│   │   └── services/
│   │       ├── garmentService.js       ← Business logic
│   │       ├── aiClassifier.js         ← GPT-4o vision + stub
│   │       └── storageService.js       ← MinIO / local-disk abstraction
│   └── tests/
│       ├── unit/
│       │   ├── aiClassifier.test.js
│       │   └── garmentService.test.js
│       └── integration/
│           └── garments.api.test.js    ← Supertest against real Express + temp SQLite
│
└── frontend/src/
    ├── App.tsx
    ├── app.css                   ← Full CSS design system (CSS variables)
    ├── types/index.ts            ← All shared TypeScript types
    ├── api/garments.ts           ← All fetch calls (single source of truth)
    ├── hooks/useGarments.ts      ← Polling + state + optimistic updates
    └── components/
        ├── UploadForm.tsx
        ├── GarmentList.tsx
        ├── GarmentCard.tsx
        └── OverrideModal.tsx
```

---

## Architectural Rules (Do Not Violate)

| Rule | Why |
|------|-----|
| **Never read `process.env` outside `src/config/index.js`** | Single source of truth; validated at startup |
| **No SQL outside `repositories/garmentRepository.js`** | All queries are prepared statements here |
| **No business logic in controllers** | Controllers are HTTP adapters only: extract → service → respond |
| **Services throw domain errors (`common/errors.js`)** | Global error handler in `app.js` maps them to HTTP status codes |
| **No `app.listen()` in `app.js`** | Tests import `app.js` without binding a port |
| **No fetch/axios in React components** | All API calls go through `api/garments.ts` |
| **All TypeScript types in `types/index.ts`** | Single source for frontend type safety |

---

## Data Flow

```
POST /api/garments
  └─ upload.js (Multer: validate MIME/size, save temp file)
      └─ garmentsController.uploadGarment
          └─ garmentService.ingestGarment
              ├─ garmentRepository.create          (DB: status=pending)
              ├─ aiClassifier.classifyGarment      (GPT-4o or stub)
              ├─ storageService.uploadFile         (MinIO or no-op)
              └─ garmentRepository.saveClassification (DB: status=classified)
```

---

## Status State Machine

```
pending → classified (AI succeeded)
pending → classification_failed (AI errored)
classified → completed (tailor claimed)
classification_failed → (no further transitions in MVP)
```

---

## Running Tests

```bash
cd backend
npm test                    # all tests
npm run test:unit           # unit only (fast, ~100ms)
npm run test:integration    # integration only (supertest + temp SQLite)
npm run test:coverage       # with coverage report
```

Tests use a **temp SQLite DB** (`/tmp/garmentlens-test-{pid}.db`) — never the dev DB.
AI runs in **stub mode** (no `OPENAI_API_KEY`).
Storage runs in **local-disk mode** (no `MINIO_ENDPOINT`).

---

## Environment Variables

All defined and documented in `backend/src/config/index.js`.
Sample values in `backend/.env.sample`.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | No | — | Enables GPT-4o; stub mode if absent |
| `MINIO_ENDPOINT` | No | — | Enables MinIO; local disk if absent |
| `SERVICE_PORT` | No | 3001 | Backend HTTP port |
| `ALLOWED_ORIGIN` | No | http://localhost:5173 | CORS origin |
| `DB_PATH` | No | ./garmentlens.db | SQLite file path |
| `UPLOAD_DIR` | No | ./uploads | Temp upload directory |
| `MAX_FILE_SIZE_MB` | No | 10 | Upload size limit |

---

## What Is Deliberately Out of Scope

Do **not** implement these without explicit instruction:

- Authentication or sessions
- WebSockets (polling at 5s is intentional)
- Async job queue for AI classification
- Analytics UI (data model is ready; UI is post-MVP)
- WCAG accessibility compliance
- Multi-store / multi-tenant
- Customer-facing features
- Payment flows

---

## Common Agent Mistakes to Avoid

1. **Don't re-add `process.env` calls** — use `config/index.js`
2. **Don't put SQL in controllers or services** — belongs in the repository
3. **Don't add `app.listen()` to `app.js`** — it breaks integration tests
4. **Don't create a new DB connection** — import `garmentRepository.js` which owns the connection
5. **Don't skip the error class hierarchy** — throw `NotFoundError`, not `res.status(404)`
6. **Don't add frontend routing** — single-page app by design
