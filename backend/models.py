from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class ScheduleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"

class RunStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

class Target(Base):
    __tablename__ = 'targets'
    # We keep 'id' as the DB primary key, but we will refer to it as target_id in API
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    method = Column(String, default="GET")
    headers = Column(JSON, default={})
    body_template = Column(Text, nullable=True)

class Schedule(Base):
    __tablename__ = 'schedules'
    id = Column(Integer, primary_key=True, index=True) # This is schedule_id
    
    target_id = Column(Integer, ForeignKey('targets.id'))
    
    schedule_type = Column(String, nullable=False) 
    schedule_config = Column(JSON, nullable=False) 
    
    status = Column(String, default=ScheduleStatus.ACTIVE.value)
    next_run_at = Column(DateTime, default=func.now(), index=True)
    
    target = relationship("Target")
    runs = relationship("Run", back_populates="schedule")

class Run(Base):
    __tablename__ = 'runs'
    id = Column(Integer, primary_key=True, index=True) # This is run_id
    
    # CLEARER NAME: schedule_id instead of job_id
    schedule_id = Column(Integer, ForeignKey('schedules.id'))
    
    executed_at = Column(DateTime, default=func.now())
    status = Column(String)
    status_code = Column(Integer)
    latency_ms = Column(Integer)
    response_body = Column(Text, nullable=True)
    
    schedule = relationship("Schedule", back_populates="runs")
