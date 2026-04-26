# GarmentLens — Project Context for Claude Code

## What this is
Internal intake tool for a single-store garment repair business.
Employee uploads a photo → AI classifies the garment → tailors view and claim items from a queue.

---

## Stack
- **Backend**: Node.js 20, Express 4 (CommonJS), SQLite (`better-sqlite3`), MinIO SDK, OpenAI SDK (GPT-4o vision)
- **Frontend**: React 18, TypeScript 5, Vite 5, plain CSS (no framework)
- **Tests**: Jest + Supertest (unit + integration)
- **Infrastructure**: Docker Compose (MinIO + backend + frontend/nginx)

---

## Repository Layout
```
garmentlens/
├── README.md                     ← Setup instructions (start here)
├── CLAUDE.md                     ← This file
├── AGENTS.md                     ← Context for all AI agents (read this too)
├── docker-compose.yml
│
├── docs/                         ← All project documentation
│   ├── PLAN.md                   ← MoSCoW + time budget (pre-code)
│   ├── REFLECTION.md             ← Post-implementation retrospective
│   ├── DECISIONS.md              ← Architecture Decision Records
│   ├── design.md                 ← Full system design doc
│   └── skills.md                 ← Skills demonstrated
│
├── backend/src/
│   ├── app.js                    ← Express app factory (no listen — tests import this)
│   ├── server.js                 ← Entry: calls app.listen()
│   ├── config/index.js           ← ALL env var reads live here
│   ├── common/errors.js          ← Domain error classes
│   ├── common/logger.js          ← Structured logger (silent in tests)
│   ├── routes/garments.js        ← Route definitions only
│   ├── controllers/garmentsController.js  ← HTTP adapter
│   ├── middleware/upload.js       ← Multer + MIME validation
│   ├── repositories/garmentRepository.js  ← ALL SQL (prepared statements)
│   └── services/
│       ├── garmentService.js     ← Business logic
│       ├── aiClassifier.js       ← GPT-4o vision + stub fallback
│       └── storageService.js     ← MinIO / local-disk abstraction
│
├── backend/tests/
│   ├── unit/aiClassifier.test.js
│   ├── unit/garmentService.test.js
│   └── integration/garments.api.test.js
│
└── frontend/src/
    ├── App.tsx, app.css
    ├── types/index.ts, api/garments.ts, hooks/useGarments.ts
    └── components/ (UploadForm, GarmentList, GarmentCard, OverrideModal)
```

---

## Critical Architectural Rules

- **`config/index.js`** is the only place that reads `process.env` — everywhere else imports from config
- **`garmentRepository.js`** owns all SQL — no raw queries in services or controllers
- **Controllers are HTTP adapters only** — no business logic, no SQL, no AI calls
- **Services throw domain errors** (`NotFoundError`, `ConflictError`) — the global handler in `app.js` maps them to HTTP status codes
- **`app.js` must not call `app.listen()`** — integration tests import it without binding a port
- **All frontend fetch calls go through `api/garments.ts`** — never fetch() in components

---

## Status Flow
```
pending → classified (AI succeeded)
pending → classification_failed (AI errored)
classified → completed (tailor claimed)
```

---

## Running
```bash
# Local (no Docker)
cd backend && cp .env.sample .env && npm run dev   # :3001, stub AI, local disk
cd frontend && npm run dev                          # :5173

# Tests
cd backend && npm test              # all (30 tests)
cd backend && npm run test:unit     # unit only
cd backend && npm run test:integration

# Docker
docker compose up --build           # :5173 frontend, :3001 backend, :9001 MinIO console
```

---

## What is deliberately OUT of scope
- Auth, WebSockets, async job queue, analytics UI, WCAG compliance, multi-tenant, payments

> For full detail on architecture, data model, and agent guidelines → see **AGENTS.md**
