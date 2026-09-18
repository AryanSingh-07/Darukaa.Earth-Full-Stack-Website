import pytest
from backend.app.schemas import PolygonGeometry, RegisterRequest
from pydantic import ValidationError


def test_polygon_requires_closed_ring() -> None:
    with pytest.raises(ValidationError):
        PolygonGeometry(
            type="Polygon",
            coordinates=[[[75.0, 13.0], [75.2, 13.0], [75.2, 13.2], [75.0, 13.2]]],
        )


def test_valid_polygon() -> None:
    geometry = PolygonGeometry(
        type="Polygon",
        coordinates=[[[75.0, 13.0], [75.2, 13.0], [75.2, 13.2], [75.0, 13.2], [75.0, 13.0]]],
    )
    assert geometry.type == "Polygon"


def test_registration_requires_strong_minimum_length() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="A", email="not-an-email", password="short")
