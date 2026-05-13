from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


class JobBase(BaseModel):
    title: str = Field(..., max_length=200, description="岗位名称")
    department: str = Field(..., max_length=100, description="所属部门")
    description: str = Field(..., description="岗位描述")
    requirements: str = Field(..., description="岗位要求")
    experience_years_min: int = Field(default=0, ge=0, description="最低经验年限")
    experience_years_max: int = Field(default=99, ge=0, description="最高经验年限")
    education_requirement: str = Field(default="本科", description="学历要求")
    key_skills: List[str] = Field(default_factory=list, description="关键技能")
    salary_range_min: Optional[float] = Field(default=None, description="薪资下限(K)")
    salary_range_max: Optional[float] = Field(default=None, description="薪资上限(K)")
    status: str = Field(default="开放", description="状态")
    evaluation_criteria: Optional[str] = Field(default=None, description="AI评估标准")


class JobCreate(JobBase):
    pass


class JobGenerateRequest(BaseModel):
    role_prompt: str = Field(..., min_length=2, description="岗位方向或招聘目标")
    department: Optional[str] = Field(default=None, max_length=100, description="所属部门")
    seniority: Optional[str] = Field(default=None, max_length=50, description="岗位级别")
    location: Optional[str] = Field(default=None, max_length=100, description="工作地点")
    business_context: Optional[str] = Field(default=None, description="业务背景")
    salary_budget: Optional[str] = Field(default=None, max_length=100, description="薪资预算")
    extra_requirements: Optional[str] = Field(default=None, description="补充要求")


class JobGenerateResponse(JobBase):
    generation_notes: Optional[str] = Field(default=None, description="生成说明")


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    experience_years_min: Optional[int] = None
    experience_years_max: Optional[int] = None
    education_requirement: Optional[str] = None
    key_skills: Optional[List[str]] = None
    salary_range_min: Optional[float] = None
    salary_range_max: Optional[float] = None
    status: Optional[str] = None
    evaluation_criteria: Optional[str] = None


class JobResponse(JobBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    total: int
    items: List[JobResponse]
