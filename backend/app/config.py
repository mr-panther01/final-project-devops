import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "TaskBoard API"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard"
    )

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
