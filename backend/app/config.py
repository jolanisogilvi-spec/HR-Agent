from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # 数据库
    DATABASE_URL: str = "postgresql://hr_agent:hr_agent_pass@localhost:5432/hr_agent_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI 接口配置（兼容 OpenAI 协议，当前使用 MiMo）
    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://token-plan-cn.xiaomimimo.com/v1"
    AI_MODEL: str = "mimo-v2.5-pro"

    # 邮件
    SMTP_HOST: str = "smtp.example.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "hr@example.com"
    SMTP_FROM_NAME: str = "HR智能招聘系统"

    # 简历文件监控目录
    RESUME_WATCH_DIR: str = "./watched_resumes"

    # 应用
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_ENV: str = "development"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
