import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from .models import ProjectFocus, ProjectStatus


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProjectCreate(BaseModel):
    name: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=10, max_length=2000)
    focus: ProjectFocus
    status: ProjectStatus = ProjectStatus.planning
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    location_label: str = Field(min_length=2, max_length=160)
    target_carbon_tonnes: float = Field(ge=0)
    start_date: date
    end_date: date | None = None


class ProjectOut(ProjectCreate):
    id: uuid.UUID
    site_count: int
    total_area_hectares: float
    carbon_tonnes: float
    biodiversity_score: float


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]

    @field_validator("coordinates")
    @classmethod
    def validate_polygon(cls, coordinates: list[list[list[float]]]) -> list[list[list[float]]]:
        if not coordinates or len(coordinates[0]) < 4:
            raise ValueError("A polygon requires at least four coordinate positions")
        ring = coordinates[0]
        if ring[0] != ring[-1]:
            raise ValueError("The polygon ring must be closed")
        for position in ring:
            if len(position) < 2 or not (-180 <= position[0] <= 180 and -90 <= position[1] <= 90):
                raise ValueError("Polygon coordinates must use valid longitude and latitude")
        return coordinates


class SiteCreate(BaseModel):
    project_id: uuid.UUID
    name: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=3, max_length=2000)
    area_hectares: float = Field(gt=0)
    geometry: PolygonGeometry


class MeasurementOut(BaseModel):
    recorded_at: date
    carbon_tonnes: float
    biodiversity_score: float
    ndvi: float
    trees_planted: int

    model_config = {"from_attributes": True}


class SiteOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    project_name: str
    project_color: str
    name: str
    description: str
    area_hectares: float
    geometry: PolygonGeometry
    latest_carbon_tonnes: float
    latest_biodiversity_score: float
    latest_ndvi: float
    measurement_count: int


class SiteAnalytics(SiteOut):
    measurements: list[MeasurementOut]
    carbon_change_percent: float
    biodiversity_change_percent: float
    total_trees_planted: int


class SummaryOut(BaseModel):
    project_count: int
    site_count: int
    total_area_hectares: float
    carbon_tonnes: float
    average_biodiversity_score: float


class DashboardOut(BaseModel):
    projects: list[ProjectOut]
    sites: list[SiteOut]
    summary: SummaryOut
