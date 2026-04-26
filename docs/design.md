# GarmentLens — Design Document

---

## 1. Product Overview

**GarmentLens** is an internal intake tool for a single-store garment repair business. It replaces manual paper/Excel intake with a photo-driven workflow backed by AI classification.

**Users:**
- Intake employee — uploads garments, reviews/corrects AI
- Tailors (×2, part-time) — view queue, pick next item
- Store manager — future analytics consumer

**Volume:** ~200 garments/week (~1.7/hour during business hours)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                      │
│  UploadForm │ GarmentList │ GarmentCard │ OverrideModal  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST (polling 5s)
┌────────────────────────▼────────────────────────────────┐
│              Backend (Node.js + Express)                  │
│  routes/garments → controllers → services                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  aiClassifier│  │storageService│  │  db/database   │  │
│  │  (Anthropic) │  │  (MinIO)     │  │  (SQLite WAL)  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────┘  │
└─────────┼────────────────┼────────────────────────────── ┘
          │                │
   ┌──────▼──────┐  ┌──────▼──────┐
   │  Anthropic  │  │    MinIO    │
   │  Vision API │  │  (S3 store) │
   └─────────────┘  └─────────────┘
```

### Request flow — Upload & Classify

```
1. User selects image in browser
2. POST /api/garments (multipart/form-data)
3. Multer validates MIME type + size → saves to /tmp
4. DB record created (status: pending)
5. aiClassifier reads temp file → sends base64 to Anthropic
   └─ fallback: stub data if no API key or model error
6. storageService uploads temp file to MinIO bucket
7. Temp file deleted from disk
8. DB updated (status: classified, AI fields populated)
9. Serialized garment returned to frontend
10. Frontend adds card to top of queue list
```

---

## 3. Data Model

### `garments` table (SQLite)

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | UUID v4 |
| `filename` | TEXT | Unique filename = MinIO object key |
| `original_name` | TEXT | Original upload filename |
| `mime_type` | TEXT | image/jpeg, image/png, image/webp |
| `file_size` | INTEGER | Bytes |
| `status` | TEXT | `pending` → `classified` → `completed` (or `classification_failed`) |
| `ai_type` | TEXT | AI-classified garment type |
| `ai_material` | TEXT | AI-classified material |
| `ai_damage` | TEXT | AI-classified damage type |
| `ai_complexity` | TEXT | low / medium / high |
| `ai_notes` | TEXT | AI free-text observation |
| `ai_confidence` | TEXT | JSON: `{type, material, damage, complexity}` (0–1) |
| `override_type` | TEXT | Human correction (nullable) |
| `override_material` | TEXT | Human correction (nullable) |
| `override_damage` | TEXT | Human correction (nullable) |
| `override_complexity` | TEXT | Human correction (nullable) |
| `override_notes` | TEXT | Human correction notes (nullable) |
| `created_at` | INTEGER | Unix timestamp |
| `classified_at` | INTEGER | Unix timestamp (nullable) |
| `completed_at` | INTEGER | Unix timestamp (nullable) |

**Design note:** AI and override fields are stored separately — never overwritten. This enables future accuracy analysis (how often does AI get damage type wrong? which materials have lowest confidence?).

### Status state machine

```
         upload
[pending] ──────────────────► [classified]
             AI fails                │
         ──────────────► [classification_failed]
                                     │
                              tailor claims
                                     ▼
                              [completed]
```

---

## 4. API Design

| Method | Path | Actor | Description |
|--------|------|-------|-------------|
| POST | `/api/garments` | Intake employee | Upload image, trigger AI classification |
| GET | `/api/garments` | All | List all garments, newest first (limit 100) |
| GET | `/api/garments/:id` | All | Single garment detail |
| PATCH | `/api/garments/:id/override` | Intake employee | Correct AI classification |
| PATCH | `/api/garments/:id/complete` | Tailor | Claim garment from queue |
| GET | `/api/garments/images/:filename` | All | Serve image (presigned MinIO redirect or local file) |
| GET | `/health` | Infra | Health check |

**Rate limiting:** 60 requests/minute per IP (express-rate-limit).

---

## 5. AI Classification Design

### Model
`claude-haiku-4-5` via Anthropic SDK — fastest Claude model with vision capability. Sufficient for structured output tasks with a constrained schema.

### Output schema
```json
{
  "type": "jacket | shirt | pants | dress | skirt | coat | sweater | suit | shoes | bag | other",
  "material": "cotton | wool | silk | polyester | leather | denim | linen | synthetic | unknown",
  "damage": "torn_seam | hole | stain | broken_zipper | missing_button | worn_fabric | hem_damage | multiple | none_visible",
  "complexity": "low | medium | high",
  "notes": "1-2 sentence description",
  "confidence": {
    "type": 0.0–1.0,
    "material": 0.0–1.0,
    "damage": 0.0–1.0,
    "complexity": 0.0–1.0
  }
}
```

### Failure handling
```
API key present?
  ├── No  → stub response (random realistic data)
  └── Yes → call Anthropic API
              ├── Success → parse JSON, validate enum values
              └── Failure → stub_fallback response + log error
```

### Complexity rubric
| Level | Description | Examples |
|-------|-------------|---------|
| `low` | Simple repair, any tailor | Button replacement, minor hem |
| `medium` | Moderate skill | Seam repair, zipper replacement |
| `high` | Complex or delicate material | Full reconstruction, silk repair |

---

## 6. Storage Design

### MinIO (S3-compatible, Docker)
- Single bucket: `garments`
- Object key = generated filename (`{timestamp}-{random}.{ext}`)
- Image access: 1-hour presigned GET URLs (auto-redirect via backend)
- Bucket auto-created on first upload

### Local disk fallback (dev without Docker)
- `MINIO_ENDPOINT` env var absent → files stored in `./uploads/`
- Backend serves files directly via `res.sendFile()`
- Zero config needed for local development

---

## 7. Frontend Component Design

```
App
├── Header (brand + "Internal Tool" tag)
└── AppGrid (2-column layout)
    ├── Sidebar: UploadForm
    │   ├── DropZone (drag-drop or click-to-browse)
    │   ├── ImagePreview (thumbnail + remove button)
    │   └── UploadButton (loading state during AI classification)
    │
    └── Content: GarmentList
        ├── QueueStats (N active, N completed)
        ├── Active garments
        │   └── GarmentCard ×N
        │       ├── Thumbnail (88×88px)
        │       ├── CardHeader (filename, status badge, time)
        │       ├── ClassificationView (AI or Override)
        │       │   ├── BadgeRow (type, material, damage, complexity)
        │       │   ├── Notes text
        │       │   └── ConfidenceBars ×4
        │       └── CardActions
        │           ├── "Edit Classification" → OverrideModal
        │           └── "Mark Complete" (classified only)
        └── Completed garments (dimmed)
```

### OverrideModal
- Opens on "Edit Classification"
- Pre-fills with current values (override if exists, else AI)
- Dropdowns for type, material, damage, complexity
- Textarea for notes
- Save → PATCH /:id/override → updates card in place

### Live updates
- `useGarments` hook polls `GET /api/garments` every 5 seconds
- `addGarment` called immediately on upload (optimistic update to queue top)
- No WebSockets — polling is appropriate at ~1.7 garments/hour

---

## 8. Security Design

| Threat | Mitigation |
|--------|------------|
| Path traversal (`../../.env`) | `path.basename()` strips all directory components before file lookup |
| Malicious file upload | MIME type validation on Content-Type header; 10MB size limit |
| API abuse | Rate limiting: 60 req/min per IP |
| CORS | Explicit origin whitelist via `ALLOWED_ORIGIN` env var |
| MinIO credential exposure | Credentials in `.env` (gitignored); never in source code |

**Known gap:** No magic-byte file content validation. A file renamed from `.exe` to `.jpg` passes MIME check. Adding `file-type` library would close this.

---

## 9. Deployment Design

### Docker Compose (recommended)
```
docker compose up --build
```
Services:
- `minio` — object storage, ports 9000 (API) + 9001 (console)
- `backend` — Node.js API, port 3001; starts after MinIO is healthy
- `frontend` — Nginx + React build, port 5173; proxies `/api/*` to backend

### Local development (no Docker)
- Backend: `npm run dev` in `/backend` (nodemon)
- Frontend: `npm run dev` in `/frontend` (Vite HMR)
- Storage: local disk (no MinIO needed)
- AI: stub mode (no API key needed)

---

## 10. Future Design Considerations

These are explicitly NOT in MVP but the current design does not block them:

| Future feature | Current preparation |
|----------------|---------------------|
| Manager analytics dashboard | All fields (timestamps, complexity, AI vs override) already stored |
| AI accuracy tracking | AI fields never overwritten; override stored separately |
| Multi-store / multi-tenant | Store ID column can be added to garments table |
| Authentication | Express middleware layer ready; no auth wired yet |
| Async processing | Controller structure allows extracting classification to a job queue |
| S3 CDN / presigned URL caching | storageService.js is the single abstraction point |
