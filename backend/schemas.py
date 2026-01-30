from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Dict, Any
import dateutil.parser
from core_logic import IST

# --- Shared Properties ---
class ScheduleBase(BaseModel):
    """
    Shared properties for Create and Response.
    Defined here so we can add validation ONLY to the Create model.
    """
    target_id: int
    schedule_type: str 
    schedule_config: Dict[str, Any]

# --- Target Schemas ---
class TargetCreate(BaseModel):
    url: str
    method: str = "GET"
    headers: Dict[str, str] = {}
    body_template: Optional[str] = None

class TargetResponse(TargetCreate):
    target_id: int = Field(..., alias="id")
    
    class Config:
        from_attributes = True
        populate_by_name = True

# --- Schedule Schemas ---

class ScheduleCreate(ScheduleBase):
    """
    Used for INPUT requests (POST). Contains validation logic.
    """
    @field_validator('schedule_config')
    def validate_window_config(cls, v, info):
        def parse_dt(val):
            if not val: 
                return None
            if val == "now": 
                return datetime.now(IST)
            try:
                dt = dateutil.parser.parse(val)
                # Ensure timezone awareness
                if dt.tzinfo is None:
                    return dt.replace(tzinfo=IST)
                return dt.astimezone(IST)
            except:
                raise ValueError(f"Invalid date format: {val}")

        # Validation Logic
        if 'start_time' in v or 'end_time' in v: 
            start = parse_dt(v.get('start_time')) or datetime.now(IST)
            end = parse_dt(v.get('end_time'))
            
            if not end:
                raise ValueError("Window schedule must have an 'end_time'")
            
            if end <= start:
                raise ValueError("end_time must be after start_time")
            
            # Save as ISO String to DB
            v['start_time'] = start.isoformat()
            v['end_time'] = end.isoformat()
            
        return v

class ScheduleResponse(ScheduleBase):
    schedule_id: int = Field(..., alias="id")
    status: str
    next_run_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        populate_by_name = True

# --- Run Schemas ---
class RunResponse(BaseModel):
    run_id: int = Field(..., alias="id")
    schedule_id: Optional[int] = None 
    executed_at: datetime
    status: str
    status_code: int
    latency_ms: int
    
    class Config:
        from_attributes = True
        populate_by_name = True
