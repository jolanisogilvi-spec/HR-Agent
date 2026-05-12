import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.resume import Resume
from app.models.job import Job
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

VALID_STATUS_TRANSITIONS = {
    "新投递": ["评估中", "淘汰"],
    "评估中": ["面试邀约", "淘汰"],
    "面试邀约": ["面试通过", "淘汰"],
    "面试通过": [],
    "淘汰": [],
}


class PipelineService:

    def transition_status(
        self, db: Session, resume_id: int, new_status: str, send_email: bool = True
    ) -> dict:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return {"success": False, "message": "简历不存在"}

        current_status = resume.status
        allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            return {
                "success": False,
                "message": f"不允许从'{current_status}'转变为'{new_status}'",
            }

        resume.status = new_status
        db.commit()
        logger.info(f"候选人 {resume.candidate_name} 状态变更: {current_status} -> {new_status}")

        if send_email and resume.email:
            job = db.query(Job).filter(Job.id == resume.job_id).first()
            job_title = job.title if job else "未知岗位"
            self._send_status_email(resume, new_status, job_title)

        return {"success": True, "old_status": current_status, "new_status": new_status}

    def _send_status_email(self, resume: Resume, new_status: str, job_title: str):
        if new_status == "面试通过":
            email_service.send_interview_pass_notification(
                to_email=resume.email,
                candidate_name=resume.candidate_name,
                job_title=job_title,
            )
        elif new_status == "淘汰":
            email_service.send_rejection_notification(
                to_email=resume.email,
                candidate_name=resume.candidate_name,
                job_title=job_title,
            )

    def get_funnel_stats(self, db: Session, job_id: Optional[int] = None) -> dict:
        query = db.query(Resume)
        if job_id:
            query = query.filter(Resume.job_id == job_id)

        statuses = ["新投递", "评估中", "面试邀约", "面试通过", "淘汰"]
        stats = {}
        for status in statuses:
            stats[status] = query.filter(Resume.status == status).count()

        total = query.count()
        return {"total": total, "funnel": stats}


pipeline_service = PipelineService()
