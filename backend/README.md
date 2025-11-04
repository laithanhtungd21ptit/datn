## Backend (Express)

### Setup

1. Create `.env` from template:
   - Copy `.env.example` to `.env` and adjust values.

2. Install dependencies:
   - From the repository root: `cd backend && npm install`

3. Run locally:
   - Development: `npm run dev`
   - Production: `npm start`

### Environment variables

- `PORT` (default: 4000)
- `FRONTEND_URL` (CORS allowlist, e.g., http://localhost:3000)
- `JWT_SECRET` (secret used to sign JWT tokens)
- `MONGODB_URI` (Mongo connection string)
- `AI_SERVICE_URL` (Python AI service base URL, e.g., http://localhost:8000)

### Routes

- `GET /health` — health check
- `/* under /ai` — proxied to `AI_SERVICE_URL`
- `POST /api/auth/login` — trả JWT + thông tin người dùng
- Under `/api/teacher/*`, `/api/student/*`, `/api/admin/*` — yêu cầu JWT và kiểm tra role

### Notes

- All backend code lives under `backend/` to avoid impacting `frontend/`.
- The AI proxy forwards all `/ai/*` requests to the Python service; ensure `AI_SERVICE_URL` is reachable.

### Seeding

- Ensure `MONGODB_URI` in `.env`
- Run: `npm run seed`


