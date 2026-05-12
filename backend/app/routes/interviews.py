from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta, time
import logging

from app.database import get_db
from app.models.interview import Interview
from app.models.resume import Resume
from app.models.job import Job
from app.models.hr_availability import HrAvailability
from app.schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewListResponse,
    AutoScheduleRequest,
    AutoScheduleResponse,
    HrAvailabilityCreate,
    HrAvailabilityResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interviews", tags=["面试管理"])


@router.get("", response_model=InterviewListResponse)
def list_interviews(
    job_id: Optional[int] = None,
    resume_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Interview)
    if job_id:
        query = query.filter(Interview.job_id == job_id)
    if resume_id:
        query = query.filter(Interview.resume_id == resume_id)
    if status:
        query = query.filter(Interview.status == status)
    total = query.count()
    items = query.order_by(Interview.scheduled_time.desc()).offset(skip).limit(limit).all()
    return InterviewListResponse(total=total, items=items)


@router.post("", response_model=InterviewResponse)
def create_interview(interview: InterviewCreate, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == interview.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    job_id = interview.job_id or resume.job_id
    if interview.job_id is not None and interview.job_id != resume.job_id:
        raise HTTPException(status_code=400, detail="面试岗位必须与简历关联岗位一致")
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")

    data = interview.model_dump()
    data["job_id"] = job_id
    db_interview = Interview(**data)
    db.add(db_interview)

    resume.status = "面试邀约"
    db.commit()
    db.refresh(db_interview)
    return db_interview


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(interview_id: int, db: Session = Depends(get_db)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="面试记录不存在")
    return interview


@router.put("/{interview_id}/status")
def update_interview_status(
    interview_id: int,
    status: str,
    db: Session = Depends(get_db),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="面试记录不存在")
    valid_statuses = ["已安排", "已完成", "已取消"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态，可选值: {valid_statuses}")
    interview.status = status
    db.commit()
    db.refresh(interview)
    return {"message": "面试状态已更新", "status": status}


@router.delete("/{interview_id}")
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="面试记录不存在")
    db.delete(interview)
    db.commit()
    return {"message": "面试记录已删除", "id": interview_id}


@router.post("/auto-schedule", response_model=AutoScheduleResponse)
def auto_schedule(request: AutoScheduleRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    job_id = request.job_id or resume.job_id
    if request.job_id is not None and request.job_id != resume.job_id:
        raise HTTPException(status_code=400, detail="推荐岗位必须与简历关联岗位一致")
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="岗位不存在")

    availabilities = db.query(HrAvailability).filter(HrAvailability.is_active == True).all()

    existing_interviews = (
        db.query(Interview)
        .filter(
            Interview.status == "已安排",
            Interview.scheduled_time >= datetime.now(),
        )
        .all()
    )
    busy_slots = []
    for iv in existing_interviews:
        busy_slots.append(
            (iv.scheduled_time, iv.scheduled_time + timedelta(minutes=iv.duration_minutes))
        )

    suggested_times = []
    now = datetime.now()
    for day_offset in range(1, 15):
        candidate_date = now + timedelta(days=day_offset)
        weekday = candidate_date.weekday()

        day_availabilities = [a for a in availabilities if a.day_of_week == weekday]
        if not day_availabilities:
            continue

        for avail in day_availabilities:
            start_hour, start_min = avail.start_time.hour, avail.start_time.minute
            end_hour, end_min = avail.end_time.hour, avail.end_time.minute

            slot_start = candidate_date.replace(
                hour=start_hour, minute=start_min, second=0, microsecond=0
            )
            slot_end = candidate_date.replace(
                hour=end_hour, minute=end_min, second=0, microsecond=0
            )

            current = slot_start
            while current + timedelta(minutes=request.duration_minutes) <= slot_end:
                interview_end = current + timedelta(minutes=request.duration_minutes)
                conflict = any(
                    not (interview_end <= busy_start or current >= busy_end)
                    for busy_start, busy_end in busy_slots
                )
                if not conflict:
                    suggested_times.append(current)
                    if len(suggested_times) >= 5:
                        return AutoScheduleResponse(suggested_times=suggested_times)
                current += timedelta(minutes=30)

    return AutoScheduleResponse(suggested_times=suggested_times)


hr_availability_router = APIRouter(prefix="/api/hr-availability", tags=["HR可用时间"])


@hr_availability_router.get("", response_model=list[HrAvailabilityResponse])
def list_availability(db: Session = Depends(get_db)):
    return db.query(HrAvailability).order_by(HrAvailability.day_of_week).all()


@hr_availability_router.post("", response_model=HrAvailabilityResponse)
def create_availability(avail: HrAvailabilityCreate, db: Session = Depends(get_db)):
    start_time = time.fromisoformat(avail.start_time)
    end_time = time.fromisoformat(avail.end_time)
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="开始时间必须早于结束时间")
    db_avail = HrAvailability(
        day_of_week=avail.day_of_week,
        start_time=start_time,
        end_time=end_time,
        is_active=avail.is_active,
    )
    db.add(db_avail)
    db.commit()
    db.refresh(db_avail)
    return db_avail


@hr_availability_router.delete("/{avail_id}")
def delete_availability(avail_id: int, db: Session = Depends(get_db)):
    avail = db.query(HrAvailability).filter(HrAvailability.id == avail_id).first()
    if not avail:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(avail)
    db.commit()
    return {"message": "已删除", "id": avail_id}
