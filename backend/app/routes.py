import uuid
from datetime import date, timedelta
from statistics import fmean

from fastapi import APIRouter, HTTPException, status
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, shape
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from .dependencies import CurrentUser, DbSession
from .models import Measurement, Project, Site, User
from .schemas import (
    AuthResponse,
    DashboardOut,
    LoginRequest,
    MeasurementOut,
    PolygonGeometry,
    ProjectCreate,
    ProjectOut,
    RegisterRequest,
    SiteAnalytics,
    SiteCreate,
    SiteOut,
    SummaryOut,
    UserOut,
)
from .security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api")


def latest_measurement(site: Site) -> Measurement | None:
    return site.measurements[-1] if site.measurements else None


def encode_geometry(db: DbSession, polygon: object) -> object:
    if db.get_bind().dialect.name == "postgresql":
        return from_shape(polygon, srid=4326)
    return mapping(polygon)


def decode_geometry(value: object) -> dict:
    if isinstance(value, dict):
        return value
    return mapping(to_shape(value))


def project_response(project: Project) -> ProjectOut:
    latest = [item for site in project.sites if (item := latest_measurement(site))]
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        focus=project.focus,
        status=project.status,
        color=project.color,
        location_label=project.location_label,
        target_carbon_tonnes=project.target_carbon_tonnes,
        start_date=project.start_date,
        end_date=project.end_date,
        site_count=len(project.sites),
        total_area_hectares=sum(site.area_hectares for site in project.sites),
        carbon_tonnes=sum(item.carbon_tonnes for item in latest),
        biodiversity_score=fmean(item.biodiversity_score for item in latest) if latest else 0,
    )


def site_response(site: Site) -> SiteOut:
    latest = latest_measurement(site)
    geometry = PolygonGeometry.model_validate(decode_geometry(site.geom))
    return SiteOut(
        id=site.id,
        project_id=site.project_id,
        project_name=site.project.name,
        project_color=site.project.color,
        name=site.name,
        description=site.description,
        area_hectares=site.area_hectares,
        geometry=geometry,
        latest_carbon_tonnes=latest.carbon_tonnes if latest else 0,
        latest_biodiversity_score=latest.biodiversity_score if latest else 0,
        latest_ndvi=latest.ndvi if latest else 0,
        measurement_count=len(site.measurements),
    )


def load_projects(db: DbSession, user: User) -> list[Project]:
    return list(
        db.scalars(
            select(Project)
            .where(Project.owner_id == user.id)
            .options(selectinload(Project.sites).selectinload(Site.measurements))
            .order_by(Project.created_at.desc())
        ).all()
    )


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "darukaa-earth"}


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        ) from exc
    db.refresh(user)
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: DbSession, user: CurrentUser) -> DashboardOut:
    projects = load_projects(db, user)
    sites = [site for project in projects for site in project.sites]
    project_items = [project_response(project) for project in projects]
    site_items = [site_response(site) for site in sites]
    latest = [item for site in sites if (item := latest_measurement(site))]
    return DashboardOut(
        projects=project_items,
        sites=site_items,
        summary=SummaryOut(
            project_count=len(projects),
            site_count=len(sites),
            total_area_hectares=sum(site.area_hectares for site in sites),
            carbon_tonnes=sum(item.carbon_tonnes for item in latest),
            average_biodiversity_score=(
                fmean(item.biodiversity_score for item in latest) if latest else 0
            ),
        ),
    )


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: DbSession, user: CurrentUser) -> ProjectOut:
    project = Project(owner_id=user.id, **payload.model_dump())
    db.add(project)
    db.commit()
    return project_response(project)


@router.post("/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
def create_site(payload: SiteCreate, db: DbSession, user: CurrentUser) -> SiteOut:
    project = db.scalar(
        select(Project)
        .where(Project.id == payload.project_id, Project.owner_id == user.id)
        .options(selectinload(Project.sites))
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    polygon = shape(payload.geometry.model_dump())
    if not polygon.is_valid:
        raise HTTPException(status_code=422, detail="The polygon boundary is invalid.")
    site = Site(
        project=project,
        name=payload.name,
        description=payload.description,
        area_hectares=payload.area_hectares,
        geom=encode_geometry(db, polygon),
    )
    db.add(site)
    db.flush()
    baseline_carbon = max(120, payload.area_hectares * 1.6)
    for index in range(4):
        db.add(
            Measurement(
                site=site,
                recorded_at=date.today() - timedelta(days=(3 - index) * 90),
                carbon_tonnes=round(baseline_carbon * (1 + index * 0.035), 1),
                biodiversity_score=round(58 + index * 2.4, 1),
                ndvi=round(0.49 + index * 0.035, 2),
                trees_planted=0 if index == 0 else round(payload.area_hectares * 4 * index),
            )
        )
    db.commit()
    hydrated = db.scalar(
        select(Site)
        .where(Site.id == site.id)
        .options(selectinload(Site.project), selectinload(Site.measurements))
    )
    if hydrated is None:
        raise HTTPException(status_code=500, detail="Site could not be loaded after creation.")
    return site_response(hydrated)


@router.get("/sites/{site_id}/analytics", response_model=SiteAnalytics)
def site_analytics(site_id: uuid.UUID, db: DbSession, user: CurrentUser) -> SiteAnalytics:
    site = db.scalar(
        select(Site)
        .join(Site.project)
        .where(Site.id == site_id, Project.owner_id == user.id)
        .options(selectinload(Site.project), selectinload(Site.measurements))
    )
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found.")
    base = site_response(site)
    first = site.measurements[0] if site.measurements else None
    latest = site.measurements[-1] if site.measurements else None

    def percent_change(current: float, baseline: float) -> float:
        return ((current - baseline) / baseline * 100) if baseline else 0

    return SiteAnalytics(
        **base.model_dump(),
        measurements=[MeasurementOut.model_validate(item) for item in site.measurements],
        carbon_change_percent=(
            percent_change(latest.carbon_tonnes, first.carbon_tonnes) if first and latest else 0
        ),
        biodiversity_change_percent=(
            percent_change(latest.biodiversity_score, first.biodiversity_score)
            if first and latest
            else 0
        ),
        total_trees_planted=sum(item.trees_planted for item in site.measurements),
    )
