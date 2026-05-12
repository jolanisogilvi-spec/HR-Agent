from sqlalchemy import Column, Integer, String, Time, Boolean, func, DateTime
from app.database import Base


class HrAvailability(Base):
    __tablename__ = "hr_availability"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(Integer, nullable=False, comment="星期几 0=周一 6=周日")
    start_time = Column(Time, nullable=False, comment="可用开始时间")
    end_time = Column(Time, nullable=False, comment="可用结束时间")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def day_name(self):
        names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        if self.day_of_week is None or self.day_of_week < 0 or self.day_of_week >= len(names):
            return ""
        return names[self.day_of_week]
