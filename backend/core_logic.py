import datetime
import requests
import time
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session

# Import Models
from models import Run, RunStatus, Schedule
# Import shared Utils
from utils import IST 

# --- 1. Strategy Pattern (Scheduling) ---
class SchedulingStrategy(ABC):
    @abstractmethod
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        pass

class IntervalStrategy(SchedulingStrategy):
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        # Ensure last_run_time is aware
        if last_run_time.tzinfo is None:
            last_run_time = last_run_time.replace(tzinfo=IST)
            
        seconds = schedule.schedule_config.get('interval_seconds', 60)
        return last_run_time + datetime.timedelta(seconds=seconds)

class WindowStrategy(SchedulingStrategy):
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        config = schedule.schedule_config
        
        # 1. Parse Window Limits & Ensure IST awareness
        end_time_raw = datetime.datetime.fromisoformat(config['end_time'])
        if end_time_raw.tzinfo is None:
            end_time = end_time_raw.replace(tzinfo=IST)
        else:
            end_time = end_time_raw.astimezone(IST)
            
        interval = config.get('interval_seconds', 60)
        max_runs = config.get('max_runs')
        
        # 2. Check Throttle (Max Runs)
        if max_runs and db:
            run_count = db.query(Run).filter(Run.schedule_id == schedule.id).count()
            if run_count >= max_runs:
                print(f"Throttle Limit Reached ({run_count}/{max_runs})")
                return None 
        
        # 3. Calculate Next Time
        if last_run_time.tzinfo is None:
            last_run_time = last_run_time.replace(tzinfo=IST)
            
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
        
        current_time = datetime.datetime.now(IST)
        return strategy.calculate_next_run(schedule, current_time, db=db_session)

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
            response = requests.request(
                method=schedule.target.method,
                url=schedule.target.url,
                headers=schedule.target.headers,
                data=schedule.target.body_template,
                timeout=5
            )
            latency = int((time.time() - start_time) * 1000)
            status_enum = RunStatus.SUCCESS.value if response.status_code < 400 else RunStatus.FAILURE.value
            
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
                status=RunStatus.FAILURE.value,
                status_code=0,
                latency_ms=latency,
                response_body=str(e)
            )

        for obs in self.observers:
            obs.on_complete(run_record)

        return run_record
