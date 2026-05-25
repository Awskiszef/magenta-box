import os
import time
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Telekom Router Admin API"
    database_url: str = "sqlite+aiosqlite:///./router.db"
    jwt_secret: str = "super-secret-key-for-router-demo"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30
    boot_time: float = time.time()

    class Config:
        env_file = ".env"

settings = Settings()
