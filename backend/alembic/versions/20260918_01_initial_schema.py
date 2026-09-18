"""Create the Darukaa geospatial schema."""

from backend.app import models  # noqa: F401
from backend.app.database import Base

from alembic import op

revision = "20260918_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
