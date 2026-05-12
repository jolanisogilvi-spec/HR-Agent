from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, comment="关联简历ID")
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, comment="关联岗位ID")
    scheduled_time = Column(DateTime(timezone=True), nullable=False, comment="面试时间")
    duration_minutes = Column(Integer, default=60, comment="面试时长(分钟)")
    location = Column(String(300), nullable=True, comment="面试地点")
    meeting_link = Column(String(500), nullable=True, comment="线上会议链接")
    interviewer_name = Column(String(100), nullable=True, comment="面试官姓名")
    status = Column(String(20), default="已安排", comment="状态: 已安排/已完成/已取消")
    email_sent = Column(Boolean, default=False, comment="是否已发送邮件通知")
    notes = Column(Text, nullable=True, comment="面试备注")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    resume = relationship("Resume", backref="interviews")
    job = relationship("Job", backref="interviews")

    @property
    def candidate_name(self):
        return self.resume.candidate_name if self.resume else None

    @property
    def job_title(self):
        return self.job.title if self.job else None
