from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Darukaa.Earth API"
    database_url: str = "postgresql+psycopg://darukaa:darukaa_local_password@localhost:5432/darukaa"
    jwt_secret: str = "local-development-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 120
    cors_origins: str = "http://localhost:5173,http://localhost:8000"
    seed_demo_data: bool = True
    auto_create_schema: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
