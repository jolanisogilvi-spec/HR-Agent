from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, comment="岗位名称")
    department = Column(String(100), nullable=False, comment="所属部门")
    description = Column(Text, nullable=False, comment="岗位描述")
    requirements = Column(Text, nullable=False, comment="岗位要求")
    experience_years_min = Column(Integer, default=0, comment="最低经验年限")
    experience_years_max = Column(Integer, default=99, comment="最高经验年限")
    education_requirement = Column(String(50), default="本科", comment="学历要求")
    key_skills = Column(JSON, default=list, comment="关键技能列表")
    salary_range_min = Column(Float, nullable=True, comment="薪资下限(K)")
    salary_range_max = Column(Float, nullable=True, comment="薪资上限(K)")
    status = Column(String(20), default="开放", comment="状态: 开放/暂停/关闭")
    evaluation_criteria = Column(Text, nullable=True, comment="AI评估标准")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
