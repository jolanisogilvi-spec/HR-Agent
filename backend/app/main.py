from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from app.config import settings
from app.database import create_tables
from app.routes import jobs, resumes, interviews, settings as settings_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="智能HR Agent API",
    description="AI驱动的招聘自动化系统",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(resumes.dashboard_router)
app.include_router(interviews.router)
app.include_router(interviews.hr_availability_router)
app.include_router(settings_routes.router)


@app.on_event("startup")
async def startup_event():
    create_tables()
    logger.info("数据库表已创建/确认")
    try:
        from app.services.file_watcher import file_watcher
        file_watcher.start()
    except Exception as e:
        logger.warning(f"文件监控启动失败（非致命）: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    try:
        from app.services.file_watcher import file_watcher
        file_watcher.stop()
    except Exception:
        pass


@app.get("/")
def root():
    return {"message": "智能HR Agent API 运行中", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
