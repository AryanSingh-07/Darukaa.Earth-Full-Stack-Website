import enum
import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ProjectFocus(str, enum.Enum):
    carbon = "carbon"
    biodiversity = "biodiversity"
    integrated = "integrated"


class ProjectStatus(str, enum.Enum):
    planning = "planning"
    active = "active"
    monitoring = "monitoring"
    completed = "completed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    projects: Mapped[list["Project"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    focus: Mapped[ProjectFocus] = mapped_column(Enum(ProjectFocus, name="project_focus"))
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, name="project_status"))
    color: Mapped[str] = mapped_column(String(7), default="#2f7d55")
    location_label: Mapped[str] = mapped_column(String(160))
    target_carbon_tonnes: Mapped[float] = mapped_column(Float, default=0)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship(back_populates="projects")
    sites: Mapped[list["Site"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    area_hectares: Mapped[float] = mapped_column(Float)
    geom: Mapped[object] = mapped_column(
        JSON().with_variant(
            Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
            "postgresql",
        )
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="sites")
    measurements: Mapped[list["Measurement"]] = relationship(
        back_populates="site",
        cascade="all, delete-orphan",
        order_by="Measurement.recorded_at",
    )

    __table_args__ = (Index("ix_sites_geom_gist", "geom", postgresql_using="gist"),)


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sites.id", ondelete="CASCADE"), index=True
    )
    recorded_at: Mapped[date] = mapped_column(Date, index=True)
    carbon_tonnes: Mapped[float] = mapped_column(Float)
    biodiversity_score: Mapped[float] = mapped_column(Float)
    ndvi: Mapped[float] = mapped_column(Float)
    trees_planted: Mapped[int] = mapped_column(Integer, default=0)

    site: Mapped[Site] = relationship(back_populates="measurements")
