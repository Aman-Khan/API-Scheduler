import time
import threading
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional

# Import your modules
from database import engine, Base, get_db, SessionLocal
import models
import schemas
from core_logic import ScheduleContext, JobExecutor, DatabaseLoggerObserver
from models import ScheduleStatus, RunStatus

# Create DB Tables (safe to run multiple times, won't overwrite existing data unless dropped)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Scheduler")

# --- BACKGROUND SCHEDULER ENGINE ---
def run_scheduler():
    """
    Background thread that polls for due schedules.
    Uses UTC time for consistency.
    """
    print("Background Scheduler Started...")
    while True:
        try:
            db = SessionLocal()
            # Use UTC to match database storage standard
            now = datetime.datetime.utcnow()
            
            # 1. Fetch active schedules that are due
            due_schedules = db.query(models.Schedule).filter(
                models.Schedule.next_run_at <= now,
                models.Schedule.status == ScheduleStatus.ACTIVE.value
            ).all()

            for schedule in due_schedules:
                # 2. Execute the Job
                # We use a fresh executor for each run to keep observers clean
                executor = JobExecutor()
                executor.add_observer(DatabaseLoggerObserver(db))
                
                # Execute logic (HTTP Request)
                executor.execute(schedule, db)

                # 3. Calculate and Update Next Run Time
                next_time = ScheduleContext.get_next_run(schedule, db_session=db)
                
                if next_time:
                    schedule.next_run_at = next_time
                else:
                    schedule.status = ScheduleStatus.COMPLETED.value
                
                if next_time:
                    schedule.next_run_at = next_time
                else:
                    # If no next time (e.g. Window expired), mark completed
                    schedule.status = ScheduleStatus.COMPLETED.value
                
                # Commit the changes for this schedule
                db.commit()
            
            db.close()
            
        except Exception as e:
            print(f"Scheduler Critical Error: {e}")
            # Prevent loop from crashing entirely, just wait and retry
        
        # Poll every 5 seconds
        time.sleep(5)

@app.on_event("startup")
def start_scheduler_thread():
    # Daemon thread ensures it dies when the main app stops
    t = threading.Thread(target=run_scheduler, daemon=True)
    t.start()


# --- API ENDPOINTS ---

# === TARGETS ===

@app.post("/targets/", response_model=schemas.TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(target: schemas.TargetCreate, db: Session = Depends(get_db)):
    db_target = models.Target(**target.dict())
    db.add(db_target)
    db.commit()
    db.refresh(db_target)
    return db_target

@app.get("/targets/", response_model=List[schemas.TargetResponse])
def list_targets(db: Session = Depends(get_db)):
    return db.query(models.Target).all()

@app.get("/targets/{target_id}", response_model=schemas.TargetResponse)
def get_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target

@app.delete("/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, db: Session = Depends(get_db)):
    target = db.query(models.Target).filter(models.Target.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # Check for active schedules using this target to prevent data corruption
    active_schedules = db.query(models.Schedule).filter(models.Schedule.target_id == target_id).count()
    if active_schedules > 0:
        raise HTTPException(status_code=400, detail="Cannot delete Target: It is being used by active Schedules.")

    db.delete(target)
    db.commit()
    return None


# === SCHEDULES ===

@app.post("/schedules/", response_model=schemas.ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    # Validate Target Exists
    target = db.query(models.Target).filter(models.Target.id == schedule.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target ID does not exist")

    db_schedule = models.Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@app.get("/schedules/", response_model=List[schemas.ScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    return db.query(models.Schedule).all()

@app.get("/schedules/{schedule_id}", response_model=schemas.ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@app.post("/schedules/{schedule_id}/pause", response_model=schemas.ScheduleResponse)
def pause_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule.status = ScheduleStatus.PAUSED.value
    db.commit()
    db.refresh(schedule)
    return schedule

@app.post("/schedules/{schedule_id}/resume", response_model=schemas.ScheduleResponse)
def resume_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    schedule.status = ScheduleStatus.ACTIVE.value
    db.commit()
    db.refresh(schedule)
    return schedule

@app.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(schedule)
    db.commit()
    return None


# === RUNS (HISTORY) ===

@app.get("/runs/", response_model=List[schemas.RunResponse])
def list_runs(schedule_id: Optional[int] = None, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get run history. 
    Optional Query Params:
    - schedule_id: Filter by specific schedule
    - limit: Max records to return (default 100)
    """
    query = db.query(models.Run)
    
    if schedule_id:
        query = query.filter(models.Run.schedule_id == schedule_id)
        
    return query.order_by(desc(models.Run.executed_at)).limit(limit).all()

@app.get("/runs/{run_id}", response_model=schemas.RunResponse)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.Run).filter(models.Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run log not found")
    return run


# === OBSERVABILITY ===

@app.get("/metrics")
def get_system_metrics(db: Session = Depends(get_db)):
    """
    Returns high-level aggregate metrics for the dashboard.
    """
    total_runs = db.query(func.count(models.Run.id)).scalar()
    success_count = db.query(func.count(models.Run.id)).filter(models.Run.status == RunStatus.SUCCESS.value).scalar()
    failure_count = db.query(func.count(models.Run.id)).filter(models.Run.status == RunStatus.FAILURE.value).scalar()
    avg_latency = db.query(func.avg(models.Run.latency_ms)).scalar()
    
    return {
        "total_runs": total_runs or 0,
        "success_runs": success_count or 0,
        "failed_runs": failure_count or 0,
        "avg_latency_ms": round(avg_latency, 2) if avg_latency else 0.0
    }
