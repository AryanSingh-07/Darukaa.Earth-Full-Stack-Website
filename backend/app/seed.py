from datetime import date

from shapely.geometry import Polygon
from sqlalchemy import select

from .database import SessionLocal
from .models import Measurement, Project, ProjectFocus, ProjectStatus, Site, User
from .security import hash_password

PROJECTS = [
    {
        "name": "Western Ghats Rewilding",
        "description": "Reconnect fragmented evergreen forest and restore native canopy.",
        "focus": ProjectFocus.integrated,
        "status": ProjectStatus.active,
        "color": "#2f7d55",
        "location_label": "Karnataka",
        "target_carbon_tonnes": 18000,
        "start_date": date(2023, 3, 1),
        "sites": [
            (
                "Kudremukh North",
                "Montane evergreen restoration and corridor monitoring.",
                2840,
                [(75.08, 13.23), (75.32, 13.23), (75.35, 13.43), (75.10, 13.46)],
                4250,
                72,
                0.71,
            ),
            (
                "Agumbe Canopy",
                "Rainforest canopy regeneration and endemic amphibian habitat.",
                1960,
                [(75.02, 13.43), (75.18, 13.42), (75.19, 13.58), (75.03, 13.60)],
                3380,
                78,
                0.76,
            ),
        ],
    },
    {
        "name": "Sundarbans Blue Carbon",
        "description": "Restore mangrove buffers while monitoring coastal carbon.",
        "focus": ProjectFocus.carbon,
        "status": ProjectStatus.monitoring,
        "color": "#4e7ca8",
        "location_label": "West Bengal",
        "target_carbon_tonnes": 14000,
        "start_date": date(2022, 8, 15),
        "sites": [
            (
                "Gosaba Mangrove Belt",
                "Community-led mangrove regeneration across tidal islands.",
                3210,
                [(88.68, 21.82), (88.92, 21.80), (88.95, 22.00), (88.70, 22.02)],
                5820,
                69,
                0.65,
            ),
            (
                "Basanti Estuary",
                "Shoreline protection and estuarine habitat monitoring.",
                1540,
                [(88.48, 22.05), (88.66, 22.05), (88.65, 22.20), (88.47, 22.19)],
                2670,
                66,
                0.62,
            ),
        ],
    },
    {
        "name": "Aravalli Habitat Link",
        "description": "Regenerate dry forest habitat and reconnect wildlife movement routes.",
        "focus": ProjectFocus.biodiversity,
        "status": ProjectStatus.active,
        "color": "#d39a45",
        "location_label": "Rajasthan",
        "target_carbon_tonnes": 9000,
        "start_date": date(2024, 1, 10),
        "sites": [
            (
                "Kumbhalgarh Corridor",
                "Dry deciduous habitat restoration between protected landscapes.",
                2180,
                [(73.45, 25.02), (73.67, 25.00), (73.69, 25.18), (73.47, 25.20)],
                2940,
                74,
                0.57,
            )
        ],
    },
]


def closed_polygon(points: list[tuple[float, float]]) -> Polygon:
    return Polygon([*points, points[0]])


def encode_geometry(db: object, polygon: Polygon) -> object:
    if db.get_bind().dialect.name == "postgresql":
        from geoalchemy2.shape import from_shape

        return from_shape(polygon, srid=4326)
    from shapely.geometry import mapping

    return mapping(polygon)


def seed_demo_data() -> None:
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == "admin@darukaa.earth")):
            return
        user = User(
            email="admin@darukaa.earth",
            full_name="Aryan Sharma",
            password_hash=hash_password("Demo123!"),
        )
        db.add(user)
        db.flush()
        for source in PROJECTS:
            project_data = {key: value for key, value in source.items() if key != "sites"}
            sites_data = source["sites"]
            project = Project(owner=user, **project_data)
            db.add(project)
            for site_name, description, hectares, points, carbon, biodiversity, ndvi in sites_data:
                site = Site(
                    project=project,
                    name=site_name,
                    description=description,
                    area_hectares=hectares,
                    geom=encode_geometry(db, closed_polygon(points)),
                )
                db.add(site)
                for index, recorded_at in enumerate(
                    [
                        date(2024, 1, 1),
                        date(2024, 4, 1),
                        date(2024, 7, 1),
                        date(2024, 10, 1),
                        date(2025, 1, 1),
                    ]
                ):
                    factor = 0.82 + index * 0.045
                    db.add(
                        Measurement(
                            site=site,
                            recorded_at=recorded_at,
                            carbon_tonnes=round(carbon * factor, 1),
                            biodiversity_score=round(biodiversity - 6.4 + index * 1.6, 1),
                            ndvi=round(ndvi - 0.08 + index * 0.02, 2),
                            trees_planted=0 if index == 0 else round(hectares * index * 0.8),
                        )
                    )
        db.commit()
