import datetime
import requests
import time
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from models import Schedule, Run, RunStatus, ScheduleStatus

# --- 1. Strategy Pattern (Scheduling) ---
class SchedulingStrategy(ABC):
    @abstractmethod
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        pass

class IntervalStrategy(SchedulingStrategy):
    # FIX: Added 'db: Session = None' to handle the argument passed by ScheduleContext
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        seconds = schedule.schedule_config.get('interval_seconds', 60)
        return last_run_time + datetime.timedelta(seconds=seconds)

class WindowStrategy(SchedulingStrategy):
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        config = schedule.schedule_config
        
        # 1. Parse Window Limits
        end_time = datetime.datetime.fromisoformat(config['end_time'])
        interval = config.get('interval_seconds', 60)
        max_runs = config.get('max_runs')
        
        # 2. Check Throttle (Max Runs)
        if max_runs and db:
            # Count existing runs for this schedule
            run_count = db.query(Run).filter(Run.schedule_id == schedule.id).count()
            if run_count >= max_runs:
                print(f"Throttle Limit Reached ({run_count}/{max_runs})")
                return None # Stop scheduling
        
        # 3. Calculate Next Time
        next_run = last_run_time + datetime.timedelta(seconds=interval)
        
        # 4. Check Window End
        if next_run > end_time:
            return None
            
        return next_run

class ScheduleContext:
    _strategies = {
        'INTERVAL': IntervalStrategy(),
        'WINDOW': WindowStrategy()
    }
    
    @classmethod
    def get_next_run(cls, schedule: Schedule, db_session: Session = None):
        strategy = cls._strategies.get(schedule.schedule_type)
        if not strategy: return None
        
        # Pass DB session to all strategies
        # Now both IntervalStrategy and WindowStrategy accept this argument
        return strategy.calculate_next_run(schedule, datetime.datetime.utcnow(), db=db_session)

# --- 2. Observer Pattern (Monitoring) ---
class JobObserver(ABC):
    @abstractmethod
    def on_complete(self, run: Run): pass

class DatabaseLoggerObserver(JobObserver):
    def __init__(self, db_session):
        self.db = db_session

    def on_complete(self, run: Run):
        self.db.add(run)
        self.db.commit()

# --- 3. Executor ---
class JobExecutor:
    def __init__(self):
        self.observers = []

    def add_observer(self, observer: JobObserver):
        self.observers.append(observer)

    def execute(self, schedule: Schedule, db_session):
        print(f"Executing Schedule {schedule.id} -> {schedule.target.url}")
        start_time = time.time()
        
        try:
            # Actual HTTP Request
            response = requests.request(
                method=schedule.target.method,
                url=schedule.target.url,
                headers=schedule.target.headers,
                data=schedule.target.body_template,
                timeout=5
            )
            latency = int((time.time() - start_time) * 1000)
            status_enum = RunStatus.SUCCESS if response.status_code < 400 else RunStatus.FAILURE
            
            run_record = Run(
                schedule_id=schedule.id,
                status=status_enum,
                status_code=response.status_code,
                latency_ms=latency,
                response_body=response.text[:200]
            )
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            run_record = Run(
                schedule_id=schedule.id,
                status=RunStatus.FAILURE,
                status_code=0,
                latency_ms=latency,
                response_body=str(e)
            )

        # Notify Observers
        for obs in self.observers:
            obs.on_complete(run_record)

        return run_record
