from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
import enum
import datetime
from database import Base
from utils import IST, get_now_ist

class ScheduleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"

class RunStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

class Target(Base):
    __tablename__ = 'targets'
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    method = Column(String, default="GET")
    headers = Column(JSON, default={})
    body_template = Column(Text, nullable=True)

class Schedule(Base):
    __tablename__ = 'schedules'
    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey('targets.id'))
    schedule_type = Column(String, nullable=False) 
    schedule_config = Column(JSON, nullable=False) 
    status = Column(String, default=ScheduleStatus.ACTIVE.value)
    
    # Use timezone=True so Postgres/SQLite handles it correctly
    next_run_at = Column(DateTime(timezone=True), default=get_now_ist, index=True)
    
    target = relationship("Target")
    runs = relationship("Run", back_populates="schedule")

class Run(Base):
    __tablename__ = 'runs'
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey('schedules.id'))
    
    executed_at = Column(DateTime(timezone=True), default=get_now_ist)
    
    status = Column(String)
    status_code = Column(Integer)
    latency_ms = Column(Integer)
    
    response_size = Column(Integer, nullable=True)
    error_type = Column(String, nullable=True)
    request_headers = Column(JSON, nullable=True)
    response_body = Column(Text, nullable=True)
    
    schedule = relationship("Schedule", back_populates="runs")
