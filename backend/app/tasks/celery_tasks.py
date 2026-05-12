from celery import Celery
import logging
from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "hr_agent",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
)


@celery_app.task(bind=True, max_retries=3)
def process_resume_file(self, file_path: str, resume_id=None, job_id=None):
    try:
        from app.database import SessionLocal
        from app.models.resume import Resume
        from app.services.document_parser import document_parser
        from app.services.ai_service import ai_service
        import asyncio
        import os

        db = SessionLocal()
        try:
            raw_text = document_parser.parse_file(file_path)
            logger.info(f"文档解析完成: {file_path}")

            loop = asyncio.new_event_loop()
            parsed_data = loop.run_until_complete(ai_service.extract_resume_info(raw_text))
            loop.close()

            resume = None
            if resume_id is not None:
                resume = db.query(Resume).filter(Resume.id == resume_id).first()

            if resume is None:
                resume = Resume(
                    job_id=job_id or 1,
                    candidate_name="待解析",
                    file_path=file_path,
                    file_name=os.path.basename(file_path),
                    status="新投递",
                )
                db.add(resume)

            resume.job_id = resume.job_id or job_id or 1
            resume.candidate_name = parsed_data.get("candidate_name") or "未知"
            resume.email = parsed_data.get("email")
            resume.phone = parsed_data.get("phone")
            resume.file_path = file_path
            resume.file_name = resume.file_name or os.path.basename(file_path)
            resume.raw_text = raw_text
            resume.parsed_data = parsed_data
            resume.skills = parsed_data.get("skills", [])
            resume.education = parsed_data.get("education", [])
            resume.experience = parsed_data.get("experience", [])
            db.commit()
            db.refresh(resume)
            logger.info(f"简历已解析并保存，ID: {resume.id}")
            return {"status": "success", "resume_id": resume.id}
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"处理简历文件失败: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def evaluate_resume_task(self, resume_id: int):
    try:
        from app.database import SessionLocal
        from app.models.resume import Resume
        from app.models.job import Job
        from app.services.ai_service import ai_service
        import asyncio

        db = SessionLocal()
        try:
            resume = db.query(Resume).filter(Resume.id == resume_id).first()
            if not resume:
                return {"status": "error", "message": "简历不存在"}

            job = db.query(Job).filter(Job.id == resume.job_id).first()
            if not job:
                return {"status": "error", "message": "岗位不存在"}

            resume.status = "评估中"
            db.commit()

            loop = asyncio.new_event_loop()
            evaluation = loop.run_until_complete(
                ai_service.evaluate_resume(
                    raw_text=resume.raw_text or "",
                    job_title=job.title,
                    job_requirements=job.requirements,
                    evaluation_criteria=job.evaluation_criteria or "",
                    key_skills=job.key_skills or [],
                )
            )
            loop.close()

            resume.match_score = evaluation.get("match_score", 0)
            resume.ai_evaluation = evaluation
            db.commit()
            logger.info(f"简历评估完成，ID: {resume_id}, 得分: {resume.match_score}")
            return {"status": "success", "match_score": resume.match_score}
        finally:
            db.close()
    except Exception as exc:
        logger.error(f"评估简历失败: {exc}")
        raise self.retry(exc=exc, countdown=60)
