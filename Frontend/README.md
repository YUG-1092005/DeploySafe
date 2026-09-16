# DeploySafe Phase 2 — Integrated Frontend

This replaces the Phase 1 mock-data frontend with an API-connected frontend.

**There is no frontend demo/mock dataset.** Dashboard, projects, releases, pipeline, risk and deployment history are loaded from the Phase 2 backend.

## Setup

1. Run the Phase 2 backend first.
2. Copy `.env.example` to `.env`.
3. Confirm:

```env
VITE_API_URL=http://localhost:5000/api
```

4. Install and run:

```bash
npm install
npm run dev
```

## Authentication

The UI now uses real `/api/auth/login` and `/api/auth/register` endpoints and stores the JWT locally.

## Connected API screens

- Dashboard → `/api/dashboard`
- Projects → `/api/projects`
- Add project → `POST /api/projects`
- Project details → `/api/projects/:id`
- Releases → `/api/releases`
- Release details → `/api/releases/:id`
- Evaluate → `POST /api/releases/:id/evaluate`
- Deploy → `POST /api/releases/:id/deploy`
- Pipeline → `/api/pipelines/:id`
- Risk → `/api/risk/:releaseId`
- History → `/api/deployments`

## Typography

The Phase 2 UI intentionally uses larger typography and larger controls than Phase 1 for easier readability while remaining responsive.

## Empty state

If PostgreSQL contains no records, the frontend shows empty states instead of inventing data.

**Note:** the current Phase 2 backend package itself contains an optional first-run seed block. Disable that block in `src/db.js` if you want the PostgreSQL database to start completely blank.
