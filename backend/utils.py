from zoneinfo import ZoneInfo
import datetime

# Define IST globally here
IST = ZoneInfo("Asia/Kolkata")

def get_now_ist():
    return datetime.datetime.now(IST)
