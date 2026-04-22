# GarmentLens

Internal intake tool for repair businesses. Upload a garment photo → AI classifies it → queue displayed for tailors.

---

## Quick Start (without Docker)

### Prerequisites
- Node.js 18+
- npm or pnpm

### Backend

```bash
cd backend
npm install
cp .env.sample .env
# Optional: add your ANTHROPIC_API_KEY to .env for real AI classification
# Without it, a realistic stub classifier runs automatically
npm run dev
```

Backend runs at **http://localhost:3001**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

Open http://localhost:5173 in your browser.

---

## Quick Start (Docker Compose)

```bash
# From the garmentlens/ root
cp backend/.env.sample backend/.env
# Optional: edit backend/.env to add ANTHROPIC_API_KEY

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

---

## AI Classification

The app supports two modes, selected automatically:

| Mode | When | Behaviour |
|------|------|-----------|
| **Claude vision** | `ANTHROPIC_API_KEY` is set | Calls `claude-haiku-4-5` with the garment image |
| **Stub** | No API key | Returns randomised realistic classification instantly |

No configuration needed — stub mode works out of the box.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/garments` | Upload image + trigger classification |
| `GET` | `/api/garments` | List all garments (newest first) |
| `GET` | `/api/garments/:id` | Single garment |
| `PATCH` | `/api/garments/:id/override` | Override AI classification |
| `PATCH` | `/api/garments/:id/complete` | Mark garment as completed |
| `GET` | `/api/garments/images/:filename` | Serve image file |
| `GET` | `/health` | Health check |

### POST /api/garments

Form data: `image` (file, JPEG/PNG/WebP, max 10 MB)

Response:
```json
{
  "id": "uuid",
  "filename": "...",
  "status": "classified",
  "ai": {
    "type": "jacket",
    "material": "wool",
    "damage": "torn_seam",
    "complexity": "medium",
    "notes": "...",
    "confidence": { "type": 0.91, "material": 0.87, "damage": 0.79, "complexity": 0.85 }
  },
  "override": null,
  "createdAt": 1714000000
}
```

---

## Project Structure

```
garmentlens/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Express server entry
│   │   ├── db/database.js            # SQLite setup + prepared statements
│   │   ├── routes/garments.js        # Route definitions
│   │   ├── controllers/garmentsController.js
│   │   ├── middleware/upload.js      # Multer + file validation
│   │   └── services/aiClassifier.js  # Claude API + stub fallback
│   ├── uploads/                      # Garment images (gitignored)
│   └── garmentlens.db                # SQLite database (auto-created)
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── app.css
│       ├── types/index.ts
│       ├── api/garments.ts
│       ├── hooks/useGarments.ts
│       └── components/
│           ├── UploadForm.tsx
│           ├── GarmentList.tsx
│           ├── GarmentCard.tsx
│           └── OverrideModal.tsx
├── PLAN.md
├── DECISIONS.md
├── REFLECTION.md
└── docker-compose.yml
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVICE_PORT` | `3001` | Backend port |
| `ANTHROPIC_API_KEY` | _(empty)_ | Optional. Enables real AI classification |
| `UPLOAD_DIR` | `./uploads` | Directory to store images |
| `MAX_FILE_SIZE_MB` | `10` | Upload size limit |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS allowed origin |

---

## AI Usage

This project uses the Anthropic SDK (`@anthropic-ai/sdk`) with `claude-haiku-4-5` for garment image classification. The model receives the uploaded image as base64 and returns a structured JSON object with garment type, material, damage type, repair complexity, and per-attribute confidence scores. All prompt design and fallback logic live in `backend/src/services/aiClassifier.js`.
