import datetime
import requests
import time
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from requests.exceptions import Timeout, ConnectionError, RequestException

from models import Run, RunStatus, Schedule
from utils import IST 

class SchedulingStrategy(ABC):
    @abstractmethod
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        pass

class IntervalStrategy(SchedulingStrategy):
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        if last_run_time.tzinfo is None:
            last_run_time = last_run_time.replace(tzinfo=IST)
            
        seconds = schedule.schedule_config.get('interval_seconds', 60)
        return last_run_time + datetime.timedelta(seconds=seconds)

class WindowStrategy(SchedulingStrategy):
    def calculate_next_run(self, schedule: Schedule, last_run_time: datetime.datetime, db: Session = None) -> datetime.datetime:
        config = schedule.schedule_config
        
        end_time_raw = datetime.datetime.fromisoformat(config['end_time'])
        if end_time_raw.tzinfo is None:
            end_time = end_time_raw.replace(tzinfo=IST)
        else:
            end_time = end_time_raw.astimezone(IST)
            
        interval = config.get('interval_seconds', 60)
        max_runs = config.get('max_runs')
        
        if max_runs and db:
            run_count = db.query(Run).filter(Run.schedule_id == schedule.id).count()
            if run_count >= max_runs:
                print(f"Throttle Limit Reached ({run_count}/{max_runs})")
                return None 
        
        if last_run_time.tzinfo is None:
            last_run_time = last_run_time.replace(tzinfo=IST)
            
        next_run = last_run_time + datetime.timedelta(seconds=interval)
        
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

class JobObserver(ABC):
    @abstractmethod
    def on_complete(self, run: Run): pass

class DatabaseLoggerObserver(JobObserver):
    def __init__(self, db_session):
        self.db = db_session

    def on_complete(self, run: Run):
        self.db.add(run)
        self.db.commit()

class JobExecutor:
    def __init__(self):
        self.observers = []

    def add_observer(self, observer):
        self.observers.append(observer)

    def classify_error(self, exception=None, status_code=None):
        """Helper to categorize errors for the dashboard"""
        if exception:
            err_str = str(exception).lower()
            if isinstance(exception, Timeout):
                return "TIMEOUT"
            if isinstance(exception, ConnectionError):
                if "name resolution" in err_str or "getaddrinfo" in err_str:
                    return "DNS_ERROR"
                return "CONNECTION_REFUSED"
            return "NETWORK_ERROR"
        
        if status_code:
            if 500 <= status_code < 600: return "HTTP_5XX"
            if 400 <= status_code < 500: return "HTTP_4XX"
        
        return "UNKNOWN"

    def execute(self, schedule: Schedule, db_session):
        print(f"Executing Schedule {schedule.id} -> {schedule.target.url}")
        
        start_time = time.time()
        status_enum = RunStatus.FAILURE.value
        status_code = 0
        response_body = None
        response_size = 0
        error_type = None
        
        timeout_val = schedule.schedule_config.get('timeout_seconds', 10)

        try:
            response = requests.request(
                method=schedule.target.method,
                url=schedule.target.url,
                headers=schedule.target.headers,
                data=schedule.target.body_template,
                timeout=timeout_val
            )
            
            latency = int((time.time() - start_time) * 1000)
            status_code = response.status_code
            response_size = len(response.content)
            response_body = response.text[:1000]
            
            if 200 <= status_code < 300:
                status_enum = RunStatus.SUCCESS.value
            else:
                error_type = self.classify_error(status_code=status_code)

        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            response_body = str(e)
            error_type = self.classify_error(exception=e)

        run_record = Run(
            schedule_id=schedule.id,
            status=status_enum,
            status_code=status_code,
            latency_ms=latency,
            response_size=response_size,
            error_type=error_type,
            response_body=response_body,
            request_headers=schedule.target.headers
        )

        for obs in self.observers:
            obs.on_complete(run_record)

        return run_record
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
