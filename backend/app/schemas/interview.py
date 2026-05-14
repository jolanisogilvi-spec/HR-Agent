from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, time


class InterviewCreate(BaseModel):
    resume_id: int = Field(..., description="关联简历ID")
    job_id: Optional[int] = Field(default=None, description="关联岗位ID，未传时使用简历关联岗位")
    scheduled_time: datetime = Field(..., description="面试时间")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="面试时长(分钟)")
    location: Optional[str] = Field(default=None, max_length=300, description="面试地点")
    meeting_link: Optional[str] = Field(default=None, max_length=500, description="线上会议链接")
    interviewer_name: Optional[str] = Field(default=None, max_length=100, description="面试官姓名")
    notes: Optional[str] = Field(default=None, description="面试备注")


class InterviewResponse(BaseModel):
    id: int
    resume_id: int
    job_id: int
    scheduled_time: datetime
    duration_minutes: int
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_name: Optional[str] = None
    status: str = "已安排"
    email_sent: bool = False
    notes: Optional[str] = None
    meeting_minutes_file_name: Optional[str] = None
    meeting_minutes_text: Optional[str] = None
    interview_ai_score: Optional[float] = None
    interview_ai_evaluation: Optional[dict[str, Any]] = None
    interview_ai_evaluated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None

    model_config = {"from_attributes": True}


class InterviewListResponse(BaseModel):
    total: int
    items: List[InterviewResponse]


class AutoScheduleRequest(BaseModel):
    resume_id: int = Field(..., description="关联简历ID")
    job_id: Optional[int] = Field(default=None, description="关联岗位ID，未传时使用简历关联岗位")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="面试时长(分钟)")
    interviewer_name: Optional[str] = Field(default=None, description="面试官姓名")


class AutoScheduleResponse(BaseModel):
    suggested_times: List[datetime] = Field(default_factory=list, description="建议面试时间列表")


class HrAvailabilityCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="星期几 0=周一 6=周日")
    start_time: str = Field(..., description="开始时间 HH:MM 格式")
    end_time: str = Field(..., description="结束时间 HH:MM 格式")
    is_active: bool = Field(default=True, description="是否启用")


class HrAvailabilityResponse(BaseModel):
    id: int
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool
    day_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
