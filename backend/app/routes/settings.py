from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.settings_service import runtime_settings_service


router = APIRouter(prefix="/api/settings", tags=["系统设置"])


class AISettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(default=None, ge=1, le=65535)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class AppSettingsUpdate(BaseModel):
    resume_watch_dir: Optional[str] = None
    cors_origins: Optional[str] = None


class SettingsUpdate(BaseModel):
    ai: Optional[AISettingsUpdate] = None
    email: Optional[EmailSettingsUpdate] = None
    app: Optional[AppSettingsUpdate] = None


@router.get("")
def get_settings():
    return runtime_settings_service.public_payload()


@router.put("")
def update_settings(payload: SettingsUpdate):
    values = {}
    if payload.ai:
        ai = payload.ai.model_dump(exclude_unset=True)
        values.update(
            {
                "AI_API_KEY": ai.get("api_key"),
                "AI_BASE_URL": ai.get("base_url"),
                "AI_MODEL": ai.get("model"),
            }
        )
    if payload.email:
        email = payload.email.model_dump(exclude_unset=True)
        values.update(
            {
                "SMTP_HOST": email.get("smtp_host"),
                "SMTP_PORT": email.get("smtp_port"),
                "SMTP_USER": email.get("smtp_user"),
                "SMTP_PASSWORD": email.get("smtp_password"),
                "SMTP_FROM_EMAIL": email.get("smtp_from_email"),
                "SMTP_FROM_NAME": email.get("smtp_from_name"),
            }
        )
    if payload.app:
        app = payload.app.model_dump(exclude_unset=True)
        values.update(
            {
                "RESUME_WATCH_DIR": app.get("resume_watch_dir"),
                "CORS_ORIGINS": app.get("cors_origins"),
            }
        )
    runtime_settings_service.save(values)
    if values.get("RESUME_WATCH_DIR"):
        try:
            from app.services.file_watcher import file_watcher

            file_watcher.stop()
            file_watcher.start()
        except Exception:
            pass
    return runtime_settings_service.public_payload()
