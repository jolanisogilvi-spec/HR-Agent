import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.models.resume import Resume
from app.schemas.job import JobCreate, JobUpdate, JobResponse, JobListResponse
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["岗位管理"])


@router.get("", response_model=JobListResponse)
def list_jobs(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)
    total = query.count()
    items = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": items}


@router.post("", response_model=JobResponse)
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    db_job = Job(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job_update: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    for field, value in job_update.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    db.delete(job)
    db.commit()
    return {"message": "岗位已删除"}


@router.post("/{job_id}/generate-criteria")
async def generate_evaluation_criteria(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")
    try:
        criteria = await ai_service.generate_evaluation_criteria(
            job_title=job.title,
            job_requirements=job.requirements,
            key_skills=job.key_skills or [],
            education_requirement=job.education_requirement,
            experience_years_min=job.experience_years_min,
            experience_years_max=job.experience_years_max,
        )
        job.evaluation_criteria = criteria
        db.commit()
        return {"evaluation_criteria": criteria}
    except Exception as e:
        logger.error(f"生成评估标准失败: {e}")
        error_text = str(e)
        if "401" in error_text or "Invalid API Key" in error_text or "invalid_key" in error_text:
            raise HTTPException(
                status_code=400,
                detail="AI API Key 无效，请在系统设置中更新有效密钥后重试",
            )
        raise HTTPException(status_code=500, detail=f"AI生成失败: {error_text}")
