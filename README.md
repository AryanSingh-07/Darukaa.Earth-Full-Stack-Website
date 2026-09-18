# Darukaa.Earth

Darukaa.Earth is a full-stack geospatial analytics platform for managing carbon and biodiversity projects. Administrators can register, create projects, draw site boundaries, explore every site on an interactive map, and inspect environmental performance over time.

## Architecture

```text
React + TypeScript + Mapbox GL + Chart.js
                    |
             REST / JSON + JWT
                    |
        FastAPI + SQLAlchemy + Pydantic
                    |
          PostgreSQL 16 + PostGIS
```

The production Docker image compiles the React application and serves it from FastAPI, providing one deployable service and one public URL. PostGIS remains the source of truth for polygon geometry; the API converts it to GeoJSON at the boundary. This keeps geospatial concerns in the database while giving the frontend a native format.

## Features

- Secure registration and login with bcrypt password hashing and expiring JWT access tokens
- Project creation, status/focus metadata, carbon targets, and portfolio KPIs
- Polygon drawing with Mapbox GL Draw and automatic geodesic area calculation
- Interactive portfolio map with project filtering and site selection
- Carbon, biodiversity, NDVI, and restoration analytics with Chart.js
- Responsive UI with accessible forms, keyboard focus states, loading/error states, and demo data
- Automated linting, formatting, tests, pre-commit hooks, container builds, and deployment checks

## Database schema

| Table          | Purpose                                | Important fields                                                      |
| -------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `users`        | Administrator accounts                 | `id`, `email` (unique), `password_hash`, `full_name`                  |
| `projects`     | Carbon/biodiversity initiatives        | `owner_id`, `name`, `focus`, `status`, `target_carbon_tonnes`, dates  |
| `sites`        | Geographic project areas               | `project_id`, `name`, `area_hectares`, `geom geometry(POLYGON, 4326)` |
| `measurements` | Time-series environmental observations | `site_id`, `recorded_at`, carbon, biodiversity, NDVI, trees planted   |

Relationships are `user 1--n projects`, `project 1--n sites`, and `site 1--n measurements`. Cascading deletes prevent orphan records. GIST indexes support spatial queries, and B-tree indexes support ownership and time-series lookups.

## Local setup

### Recommended: Docker

Requirements: Docker Desktop and Git.

```bash
cp .env.example .env
docker compose up --build
```

Open <http://localhost:8000>. The seeded reviewer account is `admin@darukaa.earth` / `Demo123!`.

### Developer mode

Start the database with `docker compose up db -d`, then:

```bash
python -m venv backend/.venv
# Windows: backend\.venv\Scripts\activate
# macOS/Linux: source backend/.venv/bin/activate
pip install -r backend/requirements-dev.txt
alembic -c backend/alembic.ini upgrade head
uvicorn backend.app.main:app --reload
```

In another terminal:

```bash
npm install
npm run dev
```

The frontend runs at <http://localhost:5173> and proxies `/api` to FastAPI at port 8000.

If PostGIS is temporarily unavailable, contributors can smoke-test with
`DATABASE_URL=sqlite+pysqlite:///./backend/darukaa-dev.db` and
`AUTO_CREATE_SCHEMA=true`. This fallback is for local development only; Docker, CI, migrations,
and production use PostgreSQL/PostGIS.

## Environment variables

| Variable         | Required   | Description                                                          |
| ---------------- | ---------- | -------------------------------------------------------------------- |
| `DATABASE_URL`   | Production | SQLAlchemy PostgreSQL URL; `postgres://` is normalized automatically |
| `JWT_SECRET`     | Production | Long random signing secret                                           |
| `SEED_DEMO_DATA` | No         | Seeds the reviewer account and realistic sample portfolio            |
| `CORS_ORIGINS`   | No         | Comma-separated trusted browser origins                              |
| `VITE_API_URL`   | No         | Frontend API base; defaults to same-origin `/api`                    |

## Quality and tests

```bash
npm run lint
npm run test
npm run build
python -m ruff check backend
python -m ruff format --check backend
python -m pytest backend/tests -q
```

Husky installs a Git pre-commit hook through the root `prepare` script. `lint-staged` formats and lints staged frontend and backend files, then the hook runs backend tests. CI repeats these checks in clean environments so hooks cannot be bypassed accidentally.

## CI/CD

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

1. Frontend job installs locked dependencies, lints, tests, and creates a production build.
2. Backend job starts PostGIS, installs Python dependencies, runs Ruff and Pytest, and applies migrations.
3. Container job builds the same multi-stage Docker image used in production.
4. Deploy job calls `RENDER_DEPLOY_HOOK_URL` only after all checks pass on `main`.

For Render, create a Blueprint from `render.yaml`, then add its deploy hook as the GitHub Actions secret `RENDER_DEPLOY_HOOK_URL`. The startup command applies Alembic migrations before serving traffic.

## Dataset and trade-offs

The demo uses a synthetic, clearly labeled dataset modeled on restoration projects across India. Synthetic data keeps the hiring review deterministic and avoids implying that unverified impact figures are real. The schema is ready for monitored measurements or remote-sensing ingestion later.

Mapbox GL JS 1.13 renders OpenStreetMap raster tiles by default, so reviewers do not need a
Mapbox token. The version is pinned intentionally: later Mapbox GL releases require a token even
for external raster styles. This preserves the required Mapbox interaction layer while avoiding
credential friction. A production rollout should use an organization-owned Mapbox style/token and
licensed tiles.

JWT access tokens are kept in memory rather than local storage to reduce persistence after browser close. A production multi-device system should add short-lived access tokens, rotating HttpOnly refresh cookies, email verification, and password recovery.

## API documentation

With the app running, interactive OpenAPI documentation is available at <http://localhost:8000/docs>. The main routes are `/api/auth/*`, `/api/projects`, `/api/sites`, and `/api/sites/{id}/analytics`.
