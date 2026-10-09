from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./signal_clone.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    cors_origins: list[str] = ["http://localhost:3000"]
    upload_dir: str = "./uploads"
    max_upload_bytes: int = 50 * 1024 * 1024  # 50MB — generous enough for short video clips
    disappearing_sweep_interval_seconds: float = 5.0


settings = Settings()
