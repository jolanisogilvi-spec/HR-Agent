import json
from pathlib import Path
from typing import Any, Dict

from app.config import settings


CONFIG_FILE = Path(__file__).resolve().parents[2] / "runtime_settings.json"

SETTING_FIELDS = {
    "AI_API_KEY",
    "AI_BASE_URL",
    "AI_MODEL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
    "SMTP_FROM_NAME",
    "RESUME_WATCH_DIR",
    "CORS_ORIGINS",
}


class RuntimeSettingsService:
    def load(self) -> Dict[str, Any]:
        if not CONFIG_FILE.exists():
            return {}
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def save(self, values: Dict[str, Any]) -> Dict[str, Any]:
        current = self.load()
        for key, value in values.items():
            if key not in SETTING_FIELDS:
                continue
            if value is None:
                continue
            if key in {"AI_API_KEY", "SMTP_PASSWORD"} and value == "":
                continue
            current[key] = value
        CONFIG_FILE.write_text(
            json.dumps(current, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return current

    def get_value(self, key: str) -> Any:
        runtime = self.load()
        value = runtime.get(key)
        if value not in (None, ""):
            return value
        return getattr(settings, key)

    def get_ai_config(self) -> Dict[str, Any]:
        return {
            "api_key": self.get_value("AI_API_KEY"),
            "base_url": self.get_value("AI_BASE_URL"),
            "model": self.get_value("AI_MODEL"),
        }

    def get_email_config(self) -> Dict[str, Any]:
        return {
            "smtp_host": self.get_value("SMTP_HOST"),
            "smtp_port": int(self.get_value("SMTP_PORT")),
            "smtp_user": self.get_value("SMTP_USER"),
            "smtp_password": self.get_value("SMTP_PASSWORD"),
            "smtp_from_email": self.get_value("SMTP_FROM_EMAIL"),
            "smtp_from_name": self.get_value("SMTP_FROM_NAME"),
        }

    def public_payload(self) -> Dict[str, Any]:
        runtime = self.load()
        ai_key = self.get_value("AI_API_KEY")
        smtp_password = self.get_value("SMTP_PASSWORD")
        return {
            "ai": {
                "api_key": "",
                "api_key_set": bool(ai_key),
                "base_url": self.get_value("AI_BASE_URL"),
                "model": self.get_value("AI_MODEL"),
            },
            "email": {
                "smtp_host": self.get_value("SMTP_HOST"),
                "smtp_port": int(self.get_value("SMTP_PORT")),
                "smtp_user": self.get_value("SMTP_USER"),
                "smtp_password": "",
                "smtp_password_set": bool(smtp_password),
                "smtp_from_email": self.get_value("SMTP_FROM_EMAIL"),
                "smtp_from_name": self.get_value("SMTP_FROM_NAME"),
            },
            "app": {
                "resume_watch_dir": self.get_value("RESUME_WATCH_DIR"),
                "cors_origins": self.get_value("CORS_ORIGINS"),
            },
            "overrides": sorted(runtime.keys()),
        }


runtime_settings_service = RuntimeSettingsService()
