# Darukaa.Earth

## 1. High-level architecture

Darukaa.Earth is a full-stack geospatial application for managing nature-restoration projects and monitoring sites. The React web client uses TypeScript and Vite, Mapbox GL JS for interactive maps, and Chart.js for environmental time-series charts. It calls a Python FastAPI backend over same-origin REST endpoints under `/api`, sending JWT bearer tokens for authenticated requests. FastAPI validates API payloads with Pydantic and uses SQLAlchemy/psycopg to read and write PostgreSQL data. PostGIS stores site boundaries as geographic polygons; the API serializes these as GeoJSON for the map.

```text
React + TypeScript + Vite
Mapbox GL JS + OpenStreetMap raster tiles + Chart.js
                 │ REST / JSON + JWT
                 ▼
        FastAPI + Pydantic
         SQLAlchemy + psycopg
                 │
                 ▼
       PostgreSQL + PostGIS
```

The production container builds the React frontend and serves it alongside FastAPI. The live deployment uses Vercel and Supabase PostgreSQL/PostGIS. Demo portfolio and measurement values are synthetic and are not independently verified ecological results.

## 2. Database schema

The schema uses UUID primary keys and foreign keys with cascading deletion. Alembic migration `20260918_01` enables PostGIS and creates the tables. Site geometry uses SRID 4326 (longitude/latitude) and a GIST index; account ownership and measurement dates use B-tree indexes.

| Table          | Purpose and important fields                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`        | Accounts: `id`, unique `email`, `full_name`, `password_hash`, `created_at`. Passwords are stored as hashes, never plaintext.                                                    |
| `projects`     | User-owned restoration initiatives: `owner_id`, `name`, `description`, `focus`, `status`, `color`, `location_label`, `target_carbon_tonnes`, `start_date`, optional `end_date`. |
| `sites`        | Geographic monitoring areas: `project_id`, `name`, `description`, `area_hectares`, `geom` (`POLYGON`, SRID 4326). Each belongs to one project.                                  |
| `measurements` | Time series for a site: `site_id`, `recorded_at`, `carbon_tonnes`, `biodiversity_score`, `ndvi`, `trees_planted`. Each belongs to one site.                                     |

Relationships: one user owns many projects; one project contains many sites; one site has many measurements. This supports project-level portfolio summaries and site-level time-series analytics.

## 3. Environment setup and local run

### Requirements

- Git
- Docker Desktop with Docker Compose (recommended), or Python 3.12 and Node.js 22 for developer mode

### Run the full app with Docker

1. Clone the repository and change into the project directory:

   ```bash
   git clone https://github.com/AryanSingh-07/Darukaa.Earth-Full-Stack-Website.git
   cd Darukaa.Earth-Full-Stack-Website
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   In Windows PowerShell, use `Copy-Item .env.example .env`.

3. Build and start the application and PostGIS database:

   ```bash
   docker compose up --build
   ```

   The app applies database migrations on startup and seeds the synthetic demo portfolio when `SEED_DEMO_DATA=true`.

4. Open [http://localhost:8000](http://localhost:8000). Swagger API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

Demo login: `admin@darukaa.earth` / `Demo123!`. You can also choose **Explore demo workspace** on the login screen. This account and password are for the synthetic demo database only; replace or disable them before using real accounts.

Stop the services with `Ctrl+C`, then run `docker compose down`. The named database volume is preserved. To intentionally delete local database data too, run `docker compose down --volumes`.

### Developer mode (separate frontend and backend)

1. Start the local database:

   ```bash
   docker compose up db -d
   ```

2. Create and activate a Python virtual environment, then install backend development dependencies:

   ```bash
   python -m venv backend/.venv
   # Windows PowerShell:
   .\backend\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source backend/.venv/bin/activate
   pip install -r backend/requirements-dev.txt
   ```

3. From the repository root, migrate the database and run FastAPI:

   ```bash
   python -m alembic -c backend/alembic.ini upgrade head
   uvicorn backend.app.main:app --reload
   ```

4. In a second terminal, install frontend dependencies and run Vite:

   ```bash
   npm ci
   npm run dev
   ```

   The frontend is available at [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to FastAPI on port 8000.

### Environment variables

`.env.example` contains local Docker Compose defaults. `.env` and other `.env.*` files are ignored by Git; do not commit credentials.

| Variable             | Purpose                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `POSTGRES_DB`        | Local database name; default `darukaa`.                                                        |
| `POSTGRES_USER`      | Local database username; default `darukaa`.                                                    |
| `POSTGRES_PASSWORD`  | Local database password; change the example for non-local use.                                 |
| `DATABASE_URL`       | SQLAlchemy connection URL for PostgreSQL/PostGIS.                                              |
| `JWT_SECRET`         | Secret used to sign access tokens; use a long, random value outside local development.         |
| `SEED_DEMO_DATA`     | Seeds the synthetic demo account and portfolio when true. Use false for a production database. |
| `AUTO_CREATE_SCHEMA` | Optional automatic table creation; production schema changes should use Alembic migrations.    |
| `CORS_ORIGINS`       | Comma-separated trusted browser origins when frontend and API use separate origins.            |
| `VITE_API_URL`       | Frontend API base path; defaults to `/api` for same-origin hosting.                            |

## 4. CI/CD pipeline and GitHub Actions

The GitHub Actions workflow is [`/.github/workflows/ci.yml`](.github/workflows/ci.yml). It runs for pull requests and pushes to `main` and defines four jobs:

1. **Frontend:** checks out the source, installs the locked npm dependencies using `npm ci`, then runs `npm run lint`, `npm run test`, and `npm run build` using Node.js 22.
2. **Backend:** starts a PostgreSQL 16/PostGIS service and waits for its health check. With Python 3.12 it installs `backend/requirements-dev.txt`, runs `ruff check backend` and `ruff format --check backend`, applies Alembic migrations, and runs `pytest backend/tests -q`.
3. **Container:** waits for frontend and backend checks to pass, then builds the application Docker image with Docker Buildx. The CI build does not publish the image.
4. **Deploy:** only runs on pushes to `main` after the container job succeeds. Its optional Render deploy-hook step runs only when the GitHub Actions secret `RENDER_DEPLOY_HOOK_URL` is configured. This workflow does not automatically deploy to the currently used Vercel project; connect the GitHub repository in Vercel settings to enable Vercel Git-based preview and production deployments.

The local pre-commit workflow uses Husky and lint-staged. `npm ci` runs the root `prepare` script to install Husky hooks. Before a commit, lint-staged formats and lints staged frontend files, formats staged JSON/Markdown/YAML/CSS, and formats/lints staged Python files with Ruff. The hook also runs backend tests. GitHub Actions repeats the main checks independently on the remote runner.

Run the same checks locally from the repository root:

```bash
npm ci
npm run lint
npm run test
npm run build
```

With the backend virtual environment activated:

```bash
ruff check backend
ruff format --check backend
pytest backend/tests -q
```

Production currently runs as a Vercel container built from `Dockerfile.vercel`, with Supabase providing PostgreSQL/PostGIS. Keep `DATABASE_URL` and `JWT_SECRET` in Vercel’s encrypted environment-variable settings, never in source control. Apply Alembic migrations deliberately before deploying code that depends on a schema change. `render.yaml` describes an optional Render setup; it is not used by the current Vercel deployment.
