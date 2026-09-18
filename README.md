# Darukaa.Earth

**A geospatial restoration portfolio for carbon and biodiversity projects.** Darukaa.Earth lets an administrator organize restoration initiatives, draw and manage geographic monitoring sites, and inspect site-level environmental indicators over time.

**Live demo:** [darukaa-earth-sigma.vercel.app](https://darukaa-earth-sigma.vercel.app/)<br>
**API health:** [darukaa-earth-sigma.vercel.app/api/health](https://darukaa-earth-sigma.vercel.app/api/health)<br>
**Interactive API docs:** [darukaa-earth-sigma.vercel.app/docs](https://darukaa-earth-sigma.vercel.app/docs)

> The bundled portfolio and environmental measurements are synthetic demonstration data, not independently verified ecological results. The schema can store field observations, but this project does not yet ingest or validate real sensor, survey, satellite, or carbon-credit data.

## 1. Hackathon requirements and implementation

The challenge asks for an authenticated full-stack platform for carbon and biodiversity projects, project sites shown on a map, polygon drawing, interactive analytics, automated code checks, GitHub Actions CI/CD, and a publicly accessible deployment.

| Challenge requirement                            | Darukaa.Earth implementation                                                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| React frontend                                   | React 19, TypeScript, and Vite                                                                                                                                                                         |
| Mapbox GL JS                                     | Mapbox GL JS renders interactive maps; OSM raster tiles are used so a Mapbox access token is not needed for the demo                                                                                   |
| Chart.js or Highcharts                           | Chart.js displays carbon and biodiversity time series                                                                                                                                                  |
| Python backend                                   | FastAPI, Pydantic, SQLAlchemy, and Alembic                                                                                                                                                             |
| PostgreSQL + PostGIS                             | Supabase PostgreSQL with PostGIS stores EPSG:4326 site polygons                                                                                                                                        |
| JWT authentication                               | Register/login endpoints issue signed JWT access tokens; passwords are securely hashed                                                                                                                 |
| Projects, sites, and analytics                   | Project/site forms, polygon drawing, portfolio map, search/filter, site details, and analytics views                                                                                                   |
| Automated code quality                           | ESLint, Prettier, Ruff, Pytest, Vitest, Husky, and lint-staged                                                                                                                                         |
| GitHub Actions                                   | `.github/workflows/ci.yml` checks frontend, backend, migrations, and container builds                                                                                                                  |
| Public deployment                                | Production deployment on Vercel; live URL above                                                                                                                                                        |
| Private GitHub repository + access for reviewers | Repository: [AryanSingh-07/Darukaa.Earth-Full-Stack-Website](https://github.com/AryanSingh-07/Darukaa.Earth-Full-Stack-Website). Repository access for the hiring reviewers still needs to be granted. |
| Automatic deployment after every GitHub push     | Vercel CLI production deployment is live, but a GitHub repository is not linked; connect one to enable automatic deployments.                                                                          |

### What the application does

The administrator flow is:

1. Register an account or sign in.
2. Create a project and choose its focus, status, region, carbon target, start date, and map color.
3. Add one or more monitoring sites under that project. Click at least three points on the map to draw a polygon, finish the boundary, review the calculated area, then save.
4. Inspect site boundaries in the project landscape map or the Sites registry. Click a boundary or site row to open its details and time-series chart.
5. Compare portfolio indicators and project contributions in Impact analytics.

## 2. Architecture

```text
React + TypeScript + Vite
Mapbox GL JS + OpenStreetMap raster tiles + Chart.js
                         │ same-origin /api requests, JWT bearer token
                         ▼
                   FastAPI (Python)
          Pydantic validation + SQLAlchemy ORM
                         │ SQLAlchemy / psycopg
                         ▼
         Supabase PostgreSQL + PostGIS extension
```

The production [Dockerfile.vercel](Dockerfile.vercel) builds the frontend and runs FastAPI as one container. FastAPI serves the compiled React application and `/api` routes from the same origin. This keeps deployment and browser API calls simple. PostGIS stores site boundaries as `geometry(POLYGON, 4326)`; the API serializes them to GeoJSON for the map.

## 3. Project structure

```text
.
├── backend/
│   ├── app/                  # FastAPI app, routes, models, schemas, auth, seed data
│   ├── alembic/              # Database migration history
│   ├── tests/                # Backend tests
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   └── src/
│       ├── components/       # Auth, dashboard sections, map, forms, site analytics
│       ├── api.ts            # Typed fetch client for the REST API
│       └── styles.css
├── .github/workflows/ci.yml # Pull request / main branch checks
├── Dockerfile                # Local / general production container
├── Dockerfile.vercel         # Vercel container build
├── docker-compose.yml        # Local app + PostgreSQL/PostGIS
├── render.yaml               # Optional Render Blueprint configuration
└── vercel.json               # Vercel service and route configuration
```

## 4. Database schema

UUID primary keys are used throughout. Foreign keys cascade when a user, project, or site is removed. Geometry is indexed with a PostGIS GIST index; account ownership and measurement dates have B-tree indexes.

| Table          | Purpose and key fields                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`        | Administrator accounts: `id`, unique `email`, `full_name`, password hash, creation timestamp.                                                |
| `projects`     | User-owned initiatives: `owner_id`, `name`, `description`, `focus`, `status`, map `color`, `location_label`, carbon target, start/end dates. |
| `sites`        | Monitoring areas within a project: `project_id`, `name`, description, area in hectares, and `geom` (`POLYGON`, SRID 4326).                   |
| `measurements` | Site time series: `site_id`, date, carbon tonnes, biodiversity score, NDVI, and trees planted.                                               |

Relationships: `users 1 → many projects`, `projects 1 → many sites`, and `sites 1 → many measurements`. Alembic migration `20260918_01` enables PostGIS and creates the schema.

## 5. Run locally with Docker (recommended)

**Prerequisites:** Git and Docker Desktop with Docker Compose.

1. Clone the repository and enter its folder:

   ```bash
   git clone <your-repository-url>
   cd <repository-folder>
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

3. Build and start the app and PostGIS database:

   ```bash
   docker compose up --build
   ```

4. Open [http://localhost:8000](http://localhost:8000). Interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

Docker Compose starts PostGIS, waits for its health check, applies Alembic migrations in the application container, and seeds the synthetic reviewer portfolio when `SEED_DEMO_DATA=true`.

### Demo login

- Email: `admin@darukaa.earth`
- Password: `Demo123!`

The login page also has an **Explore demo workspace** button. Change or remove demo credentials before using a database for real accounts or public production use.

### Stop the local services

Press `Ctrl+C` in the Docker Compose terminal, then run:

```bash
docker compose down
```

This stops and removes the containers but preserves the named database volume. To also remove local database data, run `docker compose down --volumes` (destructive; it permanently deletes the local Docker database volume).

## 6. Developer mode (Vite + FastAPI separately)

Use this workflow when working on frontend or backend files with hot reload.

1. Start only the local PostGIS database:

   ```bash
   docker compose up db -d
   ```

2. Create and activate a Python virtual environment, then install development requirements:

   ```bash
   python -m venv backend/.venv
   # Windows PowerShell:
   .\backend\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source backend/.venv/bin/activate
   pip install -r backend/requirements-dev.txt
   ```

3. From the repository root, migrate the schema and start FastAPI:

   ```bash
   python -m alembic -c backend/alembic.ini upgrade head
   uvicorn backend.app.main:app --reload
   ```

   API: [http://localhost:8000](http://localhost:8000); docs: [http://localhost:8000/docs](http://localhost:8000/docs).

4. In another terminal, install JavaScript dependencies and start Vite:

   ```bash
   npm ci
   npm run dev
   ```

   Frontend: [http://localhost:5173](http://localhost:5173). Vite proxies `/api` calls to FastAPI on port 8000.

## 7. Environment configuration

Copy `.env.example` to `.env` for Docker Compose. `.env` and `.env.*` files are ignored by Git; never commit credentials.

| Variable             | Needed when                 | Description                                                                                                                                                          |
| -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_DB`        | Local Docker Compose        | Local database name; defaults to `darukaa`.                                                                                                                          |
| `POSTGRES_USER`      | Local Docker Compose        | Local database user; defaults to `darukaa`.                                                                                                                          |
| `POSTGRES_PASSWORD`  | Local Docker Compose        | Local database password. Replace the example before sharing/deploying.                                                                                               |
| `DATABASE_URL`       | API / production            | SQLAlchemy connection URL, such as `postgresql+psycopg://user:password@host:5432/database`. Use the Supabase pooler/connection string configured for the deployment. |
| `JWT_SECRET`         | Production                  | Long, random signing secret for JWTs. Keep it private and different from local development.                                                                          |
| `SEED_DEMO_DATA`     | Optional                    | Seeds a synthetic reviewer account and portfolio on app startup if true. Set false for production; it does not reset an existing database.                           |
| `AUTO_CREATE_SCHEMA` | Optional                    | Creates tables automatically on startup if true. Prefer applying Alembic migrations explicitly and leave false in production.                                        |
| `CORS_ORIGINS`       | Separate frontend/API hosts | Comma-separated allowed browser origins. Same-origin Vercel deployment does not need additional CORS origins.                                                        |
| `VITE_API_URL`       | Separate frontend/API hosts | Frontend API base URL; defaults to `/api` for same-origin deployment.                                                                                                |

## 8. How to use each section

### Sign in / create an account

Use **Work email** and **Password** to sign in. For a new user, choose **Create an account** and provide your name, email, and password (minimum 8 characters). Registration creates a user account; the seeded sample projects belong to the demo administrator, not newly registered accounts.

### Overview

The landing dashboard summarizes monitored carbon stock, projects, mapped area, and average biodiversity. The **Project landscape** map draws site polygons using each project’s selected color. Use the selector to filter boundaries to one project; click a boundary to inspect its site. **Current initiatives** shows project-level site count, area, carbon, and target progress. **New project** and **Add site** start their corresponding workflows.

> Demo KPIs and observations are synthetic. Labels such as “verified” in the demonstration UI mean data/geometry has been validated by the app, not independently certified ecological results.

### Projects

Browse the initiative cards or search by project name, region, or focus. **Create project** asks for:

- **Project name and description:** initiative identity and intended ecological outcome.
- **Primary focus:** carbon, biodiversity, or integrated.
- **Status:** planning, active, monitoring, or completed.
- **Region:** a human-readable state or landscape label. It does not set a map coordinate.
- **Carbon target:** target in tonnes of CO₂ equivalent (`tCO₂e`).
- **Start date** and optional end date (available through the API/schema).
- **Map color:** used to distinguish its site polygons and project indicators.

Save the project, then select **Add first site** on an empty project to give it a geographic boundary. Projects without sites will not appear as a polygon on the map.

### Sites

The registry lists boundaries and their parent project, area, latest carbon, and biodiversity values. Search by site name, project name, or site description; click a row to open site details. Choose **Add monitoring site** to open the drawing form:

1. Choose the project this site belongs to.
2. Enter a site name and habitat/monitoring description.
3. Click three or more map locations around the area—each click adds a vertex and redraws the draft outline. Use **Undo** to remove the last point or **Reset** to start over.
4. Click **Finish boundary** to close the polygon and calculate its area in hectares. If it self-intersects or encloses no area, redraw it.
5. Click **Save site**. The polygon is saved as GeoJSON through the API and stored in PostGIS. The demo workflow adds synthetic time-series measurements for the new site.

Use distinct, non-crossing points around the perimeter; longitude/latitude coordinates must be valid and the polygon must close.

### Impact analytics

Portfolio indicators summarize carbon versus project targets, average biodiversity, and the number of sites with observations. The outcome ledger compares project carbon contribution. Open a site from a contribution row to inspect its time series. Current percentage-growth and observation figures use the stored demonstration measurements and should not be presented as independently audited impact.

### Site analytics panel

Open it by clicking a polygon on the Overview map or a row in Sites. The panel shows the project and mapped area, latest carbon and biodiversity, change since the baseline measurement, trees planted, observation count, and a Chart.js timeline for carbon and biodiversity. The data-provenance note identifies demo values as synthetic.

### Settings

Toggle map labels, compact number display, field observation alerts, and a monthly digest preference, then choose **Save preferences**. These demonstration preferences are stored in this browser’s `localStorage`; the alert/digest switches do not yet send real notifications or email.

### Notifications

The bell opens a sample field-signal popover. It is an interface demonstration, not a live monitoring/alert service.

### Help & documentation

The Field Manual summarizes drawing a site, reading impact, and the PostGIS data model. **Open API documentation** opens FastAPI’s Swagger UI at `/docs`.

### Search

The top search field filters project/site lists while those sections are open. It does not query a remote external dataset.

## 9. API routes

All application API routes are under `/api`. Authenticated routes expect `Authorization: Bearer <access_token>`.

| Method | Route                            | Purpose                                               |
| ------ | -------------------------------- | ----------------------------------------------------- |
| `GET`  | `/api/health`                    | Health check.                                         |
| `POST` | `/api/auth/register`             | Register and receive a JWT.                           |
| `POST` | `/api/auth/login`                | Sign in and receive a JWT.                            |
| `GET`  | `/api/dashboard`                 | Load the current user’s projects, sites, and summary. |
| `POST` | `/api/projects`                  | Create a project.                                     |
| `POST` | `/api/sites`                     | Create a site boundary and demo observations.         |
| `GET`  | `/api/sites/{site_id}/analytics` | Get a site and measurement time series.               |

## 10. CI, code quality, and deployment

### Automated checks

The GitHub Actions workflow in `.github/workflows/ci.yml` runs for pull requests and pushes to `main`:

1. **Frontend:** checks out code, installs the locked npm dependency tree with `npm ci`, runs ESLint, Vitest, and a Vite production build.
2. **Backend:** starts a PostGIS 16 service, installs Python development dependencies, checks Ruff lint and formatting, applies Alembic migrations, and runs Pytest.
3. **Container:** after frontend and backend checks pass, builds the app Docker image without publishing it.
4. **Deploy job:** the workflow file contains an optional Render deploy-hook step for pushes to `main`, but it is inactive unless `RENDER_DEPLOY_HOOK_URL` is configured. It does **not** deploy to Vercel automatically.

### Pre-commit hooks

Husky installs the Git pre-commit hook when `npm install`/`npm ci` runs its `prepare` script. `lint-staged` formats/lints staged TypeScript, JSON, Markdown, YAML, and CSS files, and formats staged Python files with Ruff. The hook also runs backend tests. CI independently repeats checks on GitHub.

If hooks are not installed in an existing checkout, run:

```bash
npm run prepare
```

### Production deployment

The live deployment currently runs on Vercel using `Dockerfile.vercel`, `vercel.json`, production environment variables, and the Supabase PostgreSQL/PostGIS database. Database migrations were applied before deployment; the Vercel container does not automatically migrate on each cold start.

To redeploy from an authenticated Vercel CLI session:

```bash
npm install
npx vercel link
npx vercel --prod
```

For automatic preview and production deployments on pushes, push the code to GitHub and connect the repository to the Vercel project’s Git settings. Keep `DATABASE_URL` and `JWT_SECRET` in Vercel’s encrypted Environment Variables, not in GitHub source or tracked files. Apply future database migrations deliberately before routing production traffic to code that requires them.

`render.yaml` is an optional Render Blueprint and is not the configuration used by the currently live Vercel deployment.

## 11. Run quality checks locally

From the repository root:

```bash
npm ci
npm run lint
npm run test
npm run build
```

With the Python virtual environment activated:

```bash
ruff check backend
ruff format --check backend
pytest backend/tests -q
```

Build the general Docker image with:

```bash
docker build -t darukaa-earth .
```

## 12. Hackathon submission checklist

The challenge requires a **private GitHub repository**, a **public live demo URL**, a comprehensive README, and a Word document submitted through the applied-job page. The project has a live demo and the source repository is [AryanSingh-07/Darukaa.Earth-Full-Stack-Website](https://github.com/AryanSingh-07/Darukaa.Earth-Full-Stack-Website). Confirm that the repository visibility is private and grant access to the reviewers before submitting the application materials.

Before submission:

1. Push the project to the private GitHub repository with a logical, reviewed commit history. Do not add `.env`, `.env.production.local`, database dumps, or any other secrets.
2. Connect that repository to the existing Vercel project to enable automatic deployments. Confirm the Vercel project continues to have its encrypted production `DATABASE_URL` and `JWT_SECRET` environment variables.
3. Grant repository access to the four accounts specified in the hackathon PDF, using the repository’s collaborator settings:
   - `ankita.dasgupta@darukaa.com`
   - `harsh.kumar@darukaa.com`
   - `utkarsh.gauniyal@darukaa.com`
   - `guneet.mutreja@darukaa.com`
4. Prepare the required `.docx` containing the repository URL, live demo URL, architecture/database/setup/CI summary, and review credentials/notes. Submit it using the **My Jobs / Applied Job** document-submission control.
5. Keep `https://darukaa-earth-sigma.vercel.app/` available and test the demo sign-in and map before sending the submission.

> The PDF’s instructions describe an external job-application/document submission. This README only documents those steps; no job application, Word document upload, repository sharing, or reviewer invitation is performed by this file.

## 13. Data and technical trade-offs

- **Synthetic portfolio:** seeded values make the demo repeatable and exercise all views without representing sample figures as measured ecological outcomes. Replace them with sourced observations and record provenance, units, dates, and validation before using the platform for real reporting.
- **OSM raster tiles with Mapbox GL JS:** provides map interactions without requiring a Mapbox token for reviewer setup. Respect OpenStreetMap tile policies; a production service with higher use should use an appropriate tile provider or organization-owned Mapbox style/token.
- **JWT in memory:** the browser does not persist access tokens in local storage, limiting persistence after closing/reloading the page. A production multi-user service should add short-lived access tokens, rotating secure HttpOnly refresh cookies, email verification, password recovery, and administrative account lifecycle controls.
- **Single application container:** serves frontend and API from the same origin for a simpler deployment. PostGIS remains external and durable in Supabase; Vercel instances are stateless.
- **Map polygons:** coordinates are interpreted as longitude/latitude in EPSG:4326. Area displayed at drawing time is computed geodesically by Turf.js.

## License

No license file is currently included. Add a license before redistributing or reusing the source code.
