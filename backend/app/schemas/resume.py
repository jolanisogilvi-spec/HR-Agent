from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from datetime import datetime


class ResumeBase(BaseModel):
    job_id: int = Field(..., description="关联岗位ID")
    candidate_name: str = Field(..., max_length=100, description="候选人姓名")
    email: Optional[EmailStr] = Field(default=None, description="邮箱")
    phone: Optional[str] = Field(default=None, max_length=30, description="电话")


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    candidate_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ResumeResponse(ResumeBase):
    id: int
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    raw_text: Optional[str] = None
    parsed_data: Optional[Any] = None
    match_score: Optional[float] = None
    status: str
    ai_evaluation: Optional[Any] = None
    skills: Optional[List[Any]] = None
    education: Optional[List[Any]] = None
    experience: Optional[List[Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeListResponse(BaseModel):
    total: int
    items: List[ResumeResponse]
