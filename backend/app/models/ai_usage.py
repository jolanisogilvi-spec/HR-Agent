from sqlalchemy import Column, DateTime, Integer, String, Float, func

from app.database import Base


class AiUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(Integer, primary_key=True, index=True)
    purpose = Column(String(80), nullable=False, index=True, comment="调用场景")
    model = Column(String(100), nullable=False, index=True, comment="实际调用模型")
    prompt_tokens = Column(Integer, default=0, nullable=False)
    prompt_cache_hit_tokens = Column(Integer, default=0, nullable=False)
    prompt_cache_miss_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    estimated_cost_cny = Column(Float, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
