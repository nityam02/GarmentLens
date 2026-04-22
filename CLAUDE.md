# GarmentLens — Project Context for Claude Code

## What this is
Internal intake tool for a single-store garment repair business. An employee uploads a photo, AI classifies the garment, tailors view and claim items from a queue.

## Stack
- **Backend**: Node.js 20, Express 4, SQLite (better-sqlite3), MinIO (minio SDK), Anthropic SDK
- **Frontend**: React 18, TypeScript 5, Vite 5, plain CSS (no framework)
- **Infrastructure**: Docker Compose (MinIO + backend + frontend/nginx)

## Directory Structure
```
garmentlens/
├── backend/src/
│   ├── index.js                  ← Express server entry, middleware setup
│   ├── db/database.js            ← SQLite schema + ALL prepared statements
│   ├── routes/garments.js        ← Route definitions only
│   ├── controllers/garmentsController.js  ← HTTP handlers
│   ├── middleware/upload.js      ← Multer config, file validation
│   ├── services/aiClassifier.js  ← Anthropic vision API + stub fallback
│   └── services/storageService.js ← MinIO upload + presigned URL + local fallback
└── frontend/src/
    ├── App.tsx                   ← Root layout
    ├── app.css                   ← Full CSS design system (CSS variables)
    ├── types/index.ts            ← All shared TypeScript types
    ├── api/garments.ts           ← All fetch calls (single source of truth)
    ├── hooks/useGarments.ts      ← Polling, state, optimistic updates
    └── components/
        ├── UploadForm.tsx        ← Drag-drop upload, loading state
        ├── GarmentList.tsx       ← Queue with active/completed sections
        ├── GarmentCard.tsx       ← Classification display + confidence bars
        └── OverrideModal.tsx     ← Edit classification form
```

## Key Conventions
- Backend uses CommonJS (`require`/`module.exports`)
- All SQL lives in `db/database.js` as prepared statements — never raw SQL elsewhere
- All fetch calls go through `api/garments.ts` — never fetch() in components
- AI and storage are abstracted in services — controllers never import minio or Anthropic directly
- Both AI and storage degrade gracefully: stub classifier if no API key; local disk if no MinIO endpoint

## Status Flow
`pending` → `classified` (or `classification_failed`) → `completed`
- pending: file uploaded, AI classifying
- classified: AI done, awaiting tailor
- completed: tailor claimed the garment

## Environment Variables (see backend/.env.sample)
- `ANTHROPIC_API_KEY` — optional, stub mode if absent
- `MINIO_ENDPOINT` — optional, local disk fallback if absent
- `SERVICE_PORT` — backend port (default 3001)
- `ALLOWED_ORIGIN` — CORS origin (default http://localhost:5173)

## Running locally (no Docker)
```bash
cd backend && cp .env.sample .env && npm run dev   # port 3001
cd frontend && npm run dev                          # port 5173
```
No API key or MinIO needed — stub AI and local disk work out of the box.

## Running with Docker
```bash
docker compose up --build
```
Frontend: http://localhost:5173 | Backend: http://localhost:3001 | MinIO console: http://localhost:9001 (minioadmin/minioadmin)

## What is deliberately OUT of scope
- Authentication (single-user internal tool)
- WebSockets (polling at 5s is sufficient at 200/week volume)
- Job queue / async processing
- Frontend routing (single page)
- Analytics UI (data model is prepared; UI is future work)
- WCAG accessibility compliance
