from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import Optional
from datetime import date, datetime, time, timedelta
from pydantic import BaseModel
import asyncio
import os
import uuid
import logging

from app.database import get_db
from app.models.resume import Resume
from app.models.job import Job
from app.schemas.resume import ResumeResponse, ResumeListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["简历管理"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "resumes")


class ResumeStatusUpdate(BaseModel):
    status: str


async def parse_resume_record(resume: Resume, db: Session) -> None:
    from app.services.document_parser import document_parser
    from app.services.ai_service import ai_service

    raw_text = await asyncio.to_thread(document_parser.parse_file, resume.file_path)
    resume.raw_text = raw_text
    db.commit()

    try:
        parsed_data = await ai_service.extract_resume_info(raw_text)
    except Exception as e:
        logger.warning(f"AI解析简历信息失败，仅保存原文，简历ID: {resume.id}, 错误: {e}")
        return

    resume.candidate_name = parsed_data.get("candidate_name") or "未知"
    resume.email = parsed_data.get("email")
    resume.phone = parsed_data.get("phone")
    resume.parsed_data = parsed_data
    resume.skills = parsed_data.get("skills", [])
    resume.education = parsed_data.get("education", [])
    resume.experience = parsed_data.get("experience", [])
    db.commit()


@router.get("", response_model=ResumeListResponse)
def list_resumes(
    job_id: Optional[int] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Resume)
    if job_id:
        query = query.filter(Resume.job_id == job_id)
    if status:
        query = query.filter(Resume.status == status)
    if min_score is not None:
        query = query.filter(Resume.match_score >= min_score)
    if max_score is not None:
        query = query.filter(Resume.match_score <= max_score)
    total = query.count()
    items = query.order_by(Resume.created_at.desc()).offset(skip).limit(limit).all()
    return ResumeListResponse(total=total, items=items)


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return resume


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: int = Form(...),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".doc"):
        raise HTTPException(status_code=400, detail="仅支持 PDF、DOCX、DOC 格式")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    resume = Resume(
        job_id=job_id,
        candidate_name="待解析",
        file_path=file_path,
        file_name=file.filename,
        status="新投递",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return resume


@router.put("/{resume_id}/status", response_model=ResumeResponse)
def update_resume_status(
    resume_id: int,
    payload: ResumeStatusUpdate,
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    valid_statuses = ["新投递", "评估中", "面试邀约", "面试通过", "淘汰"]
    status = payload.status
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，可选值: {valid_statuses}")
    resume.status = status
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/{resume_id}/evaluate")
async def evaluate_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    if not resume.raw_text:
        if resume.file_path and os.path.exists(resume.file_path):
            try:
                await parse_resume_record(resume, db)
                db.refresh(resume)
            except Exception as e:
                logger.error(f"评估前解析简历失败: {e}")
        if not resume.raw_text:
            raise HTTPException(status_code=400, detail="简历尚未解析，无法评估")

    job = db.query(Job).filter(Job.id == resume.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="关联岗位不存在")

    previous_status = resume.status
    try:
        from app.services.ai_service import ai_service
        resume.status = "评估中"
        db.commit()
        evaluation = await ai_service.evaluate_resume(
            raw_text=resume.raw_text,
            job_title=job.title,
            job_description=job.description,
            job_requirements=job.requirements,
            evaluation_criteria=job.evaluation_criteria or "",
            key_skills=job.key_skills or [],
        )
        resume.match_score = evaluation.get("match_score", 0)
        resume.ai_evaluation = evaluation
        resume.status = previous_status if previous_status != "评估中" else "新投递"
        db.commit()
        db.refresh(resume)
        return {"message": "AI评估完成", "resume_id": resume_id, "match_score": resume.match_score}
    except Exception as e:
        logger.error(f"AI评估失败: {e}")
        resume.status = previous_status
        db.commit()
        error_text = str(e)
        if "401" in error_text or "Invalid API Key" in error_text or "invalid_key" in error_text:
            raise HTTPException(
                status_code=400,
                detail="AI API Key 无效，请在系统设置中更新有效密钥后重试",
            )
        raise HTTPException(status_code=500, detail=f"AI评估失败: {error_text}")


dashboard_router = APIRouter(prefix="/api/dashboard", tags=["数据看板"])


@dashboard_router.get("/stats")
def get_dashboard_stats(job_id: Optional[int] = None, db: Session = Depends(get_db)):
    resume_query = db.query(Resume)
    if job_id:
        resume_query = resume_query.filter(Resume.job_id == job_id)

    total_resumes = resume_query.count()
    status_counts = (
        resume_query.with_entities(Resume.status, sql_func.count(Resume.id))
        .group_by(Resume.status)
        .all()
    )
    status_map = {status: count for status, count in status_counts}

    job_query = db.query(Job)
    if job_id:
        job_query = job_query.filter(Job.id == job_id)
    total_jobs = job_query.count()
    open_jobs = job_query.filter(Job.status == "开放").count()

    avg_query = resume_query.with_entities(sql_func.avg(Resume.match_score)).filter(
        Resume.match_score.isnot(None)
    )
    avg_score = avg_query.scalar()

    funnel = {
        "新投递": status_map.get("新投递", 0),
        "评估中": status_map.get("评估中", 0),
        "面试邀约": status_map.get("面试邀约", 0),
        "面试通过": status_map.get("面试通过", 0),
        "淘汰": status_map.get("淘汰", 0),
    }

    today = date.today()
    day_counts = {today - timedelta(days=offset): 0 for offset in range(6, -1, -1)}
    start_datetime = datetime.combine(today - timedelta(days=6), time.min)
    recent_resumes = resume_query.filter(Resume.created_at >= start_datetime).all()
    for resume in recent_resumes:
        if resume.created_at:
            created_day = resume.created_at.date()
            if created_day in day_counts:
                day_counts[created_day] += 1
    daily_resumes = [
        {"date": day.isoformat(), "count": count}
        for day, count in day_counts.items()
    ]

    distribution_query = (
        db.query(Job.id, Job.title, sql_func.count(Resume.id))
        .outerjoin(Resume, Resume.job_id == Job.id)
    )
    if job_id:
        distribution_query = distribution_query.filter(Job.id == job_id)
    distribution_rows = (
        distribution_query.group_by(Job.id, Job.title)
        .order_by(sql_func.count(Resume.id).desc(), Job.id.asc())
        .all()
    )
    job_distribution = [
        {"job_id": row[0], "job_title": row[1], "count": row[2]}
        for row in distribution_rows
    ]

    return {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "average_score": round(avg_score, 1) if avg_score else 0,
        "status_distribution": status_map,
        "funnel": {"total": total_resumes, "funnel": funnel},
        "daily_resumes": daily_resumes,
        "job_distribution": job_distribution,
    }
