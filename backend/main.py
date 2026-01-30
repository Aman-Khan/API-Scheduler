import time
import threading
import datetime
from fastapi import FastAPI, Depends, HTTPException, status
import psutil
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, text
from typing import List, Optional

# Import your modules
from database import engine, Base, get_db, SessionLocal
import models
import schemas
from core_logic import IST, ScheduleContext, JobExecutor, DatabaseLoggerObserver
from models import ScheduleStatus, RunStatus
from fastapi.middleware.cors import CORSMiddleware

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Scheduler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- BACKGROUND SCHEDULER ENGINE ---
def run_scheduler():
    """
    Background thread that polls for due schedules.
    Standardized to IST to match the strategy logic.
    """
    print("Background Scheduler Started (IST Mode)...")
    while True:
        try:
            db = SessionLocal()
            # FIX: Use IST time to match the aware timestamps from your strategy
            now = datetime.datetime.now(IST)
            
            # Fetch active schedules that are due
            due_schedules = db.query(models.Schedule).filter(
                models.Schedule.next_run_at <= now,
                models.Schedule.status == ScheduleStatus.ACTIVE.value
            ).all()

            for schedule in due_schedules:
                executor = JobExecutor()
                executor.add_observer(DatabaseLoggerObserver(db))
                
                # Execute Job
                executor.execute(schedule, db)

                # Calculate next run
                next_time = ScheduleContext.get_next_run(schedule, db_session=db)
                
                if next_time:
                    schedule.next_run_at = next_time
                else:
                    schedule.status = ScheduleStatus.COMPLETED.value
                
                db.commit()
            
            db.close()
            
        except Exception as e:
            print(f"Scheduler Critical Error: {e}")
        
        time.sleep(5)

@app.on_event("startup")
def start_scheduler_thread():
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
    
    active_schedules = db.query(models.Schedule).filter(models.Schedule.target_id == target_id).count()
    if active_schedules > 0:
        raise HTTPException(status_code=400, detail="Cannot delete Target: It is being used by active Schedules.")

    db.delete(target)
    db.commit()
    return None


# === SCHEDULES ===

@app.post("/schedules/", response_model=schemas.ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
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
    
    if schedule.status == ScheduleStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot pause a schedule that is already COMPLETED."
        )
    
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
def list_runs(
    schedule_id: Optional[int] = None, 
    status: Optional[str] = None,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(models.Run)
    
    if schedule_id:
        query = query.filter(models.Run.schedule_id == schedule_id)
    if status:
        query = query.filter(models.Run.status == status)
    if start_date:
        query = query.filter(models.Run.executed_at >= start_date)
    if end_date:
        query = query.filter(models.Run.executed_at <= end_date)
        
    return query.order_by(desc(models.Run.executed_at)).limit(limit).all()

@app.get("/runs/{run_id}", response_model=schemas.RunResponse)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(models.Run).filter(models.Run.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run log not found")
    return run

# === METRICS ===

@app.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Returns unified telemetry: System Health + Application Performance.
    """
    start_db = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_online = True
    except Exception:
        db_online = False
    
    db_latency = round((time.perf_counter() - start_db) * 1000, 2)
    cpu_usage = psutil.cpu_percent(interval=0.1)
    
    active_schedules_count = db.query(func.count(models.Schedule.id)).filter(
        models.Schedule.status == ScheduleStatus.ACTIVE.value
    ).scalar() or 0

    total_runs = db.query(func.count(models.Run.id)).scalar() or 0
    success_runs = db.query(func.count(models.Run.id)).filter(
        models.Run.status == RunStatus.SUCCESS.value
    ).scalar() or 0

    avg_latency = db.query(func.avg(models.Run.latency_ms)).scalar()
    avg_latency = round(avg_latency, 2) if avg_latency else 0

    return {
        "timestamp": time.time(),
        "database": {"online": db_online, "latency_ms": db_latency},
        "system": {
            "cpu_usage_percent": cpu_usage,
            "active_workers": active_schedules_count,
            "total_runs": total_runs,
            "success_runs": success_runs,
            "avg_latency_ms": avg_latency
        }
    }
