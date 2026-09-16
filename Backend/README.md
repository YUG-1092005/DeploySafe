# DeploySafe — Phase 2 Backend

Node.js + Express + PostgreSQL REST API that connects to the Phase 1 React/Vite frontend.

## 1. Requirements

- Node.js 18+
- PostgreSQL 14+
- Phase 1 frontend running on port 5173

## 2. Create database

Create a PostgreSQL database named:

```sql
CREATE DATABASE deploysafe;
```

Then copy `.env.example` to `.env` and set your PostgreSQL credentials.

## 3. Install and start

```bash
npm install
npm run dev
```

API:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

The server automatically creates the required tables and seeds demo data on first start.

## API

Public:
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated:
- `GET /api/dashboard`
- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/releases`
- `GET /api/releases/:id`
- `GET /api/pipelines/:id`
- `GET /api/risk/:releaseId`
- `GET /api/deployments`
- `POST /api/releases/:id/deploy`
- `POST /api/releases/:id/evaluate`
- `POST /api/webhooks/jenkins`

Use the token returned by login/register as:

```text
Authorization: Bearer <token>
```

## Jenkins webhook

Phase 3 will make Jenkins call:

```text
POST /api/webhooks/jenkins
```

Example body:

```json
{
  "releaseId": 1,
  "pipelineId": 1,
  "status": "SUCCESS",
  "buildNumber": 284,
  "durationSeconds": 270,
  "commit": "8f31ac2",
  "branch": "main",
  "metrics": {
    "testsPassed": 196,
    "testsTotal": 200,
    "coverage": 91,
    "sonarRating": "A",
    "securityWarnings": 2,
    "criticalVulnerabilities": 0,
    "p95ResponseMs": 280
  }
}
```

## Architecture

```text
React/Vite
    |
    | REST + JWT
    v
Express API
    |
    +--> PostgreSQL
    |
    +--> Risk Engine
    |
    +--> Jenkins webhook
```

The backend is intentionally API-first so Phase 3 can add real Jenkins/SonarQube/security/performance integrations without changing the database contract dramatically.
