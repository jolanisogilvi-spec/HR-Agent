from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, comment="关联岗位ID")
    candidate_name = Column(String(100), nullable=False, comment="候选人姓名")
    email = Column(String(200), nullable=True, comment="邮箱")
    phone = Column(String(30), nullable=True, comment="电话")
    file_path = Column(String(500), nullable=True, comment="简历文件路径")
    file_name = Column(String(300), nullable=True, comment="原始文件名")
    raw_text = Column(Text, nullable=True, comment="简历原文")
    parsed_data = Column(JSON, nullable=True, comment="解析后的结构化数据")
    match_score = Column(Float, nullable=True, comment="AI匹配分数 0-100")
    status = Column(
        String(20),
        default="新投递",
        comment="状态: 新投递/评估中/面试邀约/面试通过/淘汰",
    )
    ai_evaluation = Column(JSON, nullable=True, comment="AI评估结果(优势/风险/建议)")
    skills = Column(JSON, default=list, comment="技能列表")
    education = Column(JSON, default=list, comment="教育经历")
    experience = Column(JSON, default=list, comment="工作经验")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    job = relationship("Job", backref="resumes")
