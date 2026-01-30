from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import dateutil.parser

# --- Target Schemas ---
class TargetCreate(BaseModel):
    url: str
    method: str = "GET"
    headers: Dict[str, str] = {}
    body_template: Optional[str] = None

class TargetResponse(TargetCreate):
    # This renames 'id' to 'target_id' in the JSON response
    target_id: int = Field(..., alias="id")
    
    class Config:
        from_attributes = True
        populate_by_name = True

# --- Schedule Schemas ---
class ScheduleCreate(BaseModel):
    target_id: int
    schedule_type: str 
    schedule_config: Dict[str, Any]

    # In schemas.py
    @field_validator('schedule_config')
    def validate_window_config(cls, v, info):
        # Helper to parse dates
        def parse_dt(val):
            if not val: return None
            if val == "now": return datetime.utcnow()  # <--- FIX: Handle "now" explicitly
            try:
                return dateutil.parser.parse(val)
            except:
                raise ValueError(f"Invalid date format: {val}")

        if 'start_time' in v or 'end_time' in v: 
            start = parse_dt(v.get('start_time')) or datetime.utcnow()
            end = parse_dt(v.get('end_time'))
            
            if not end:
                raise ValueError("Window schedule must have an 'end_time'")
            
            # ... rest of the logic is fine ...
            
            # Update the config with standardized ISO strings
            v['start_time'] = start.isoformat()
            v['end_time'] = end.isoformat()
            
        return v
    
class ScheduleResponse(ScheduleCreate):
    schedule_id: int = Field(..., alias="id")
    status: str
    next_run_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        populate_by_name = True

# --- Run Schemas ---
class RunResponse(BaseModel):
    # This renames 'id' to 'run_id' in the JSON response
    run_id: int = Field(..., alias="id")
    schedule_id: int
    executed_at: datetime
    status: str
    status_code: int
    latency_ms: int
    
    class Config:
        from_attributes = True
        populate_by_name = True
