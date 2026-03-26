import os
import sys

def get_bundle_dir():
    """Directory where PyInstaller unpacks bundled files (static, config).
    In dev mode, this is the script directory."""
    if getattr(sys, 'frozen', False):
        # PyInstaller 6.x puts _MEIPASS inside _internal/ next to the exe
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def get_runtime_dir():
    """Directory for runtime-created files (DB, logs). Always next to the exe."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

BUNDLE_DIR = get_bundle_dir()   # static files, config.ini, .env
RUNTIME_DIR = get_runtime_dir() # machine_logs.db
# Legacy alias
DATA_DIR = BUNDLE_DIR
import json
import logging
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, date
import pytz

import models
from database import engine, get_db
from wechat_service import send_wechat_notification
from generate_report import run_report_generation

# Create DB tables
models.Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    """Auto-resolve orphan START events on server startup (older than 2h)."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow().replace(tzinfo=None) - __import__('datetime').timedelta(hours=2)
        orphan_starts = db.query(models.MachineEvent).filter(
            models.MachineEvent.action == "START",
        ).all()
        for ev in orphan_starts:
            ts = ev.timestamp.replace(tzinfo=None) if ev.timestamp.tzinfo else ev.timestamp
            # Check if there's a STOP after this START
            has_stop = db.query(models.MachineEvent).filter(
                models.MachineEvent.machine_id == ev.machine_id,
                models.MachineEvent.code == ev.code,
                models.MachineEvent.action == "STOP",
                models.MachineEvent.timestamp > ev.timestamp,
            ).first()
            if not has_stop and ts < cutoff:
                # Auto-close with a STOP event
                now_utc = datetime.utcnow().replace(tzinfo=None)
                stop_ev = models.MachineEvent(
                    machine_id=ev.machine_id,
                    worker_id=ev.worker_id,
                    code=ev.code,
                    desc=ev.desc,
                    action="STOP",
                    timestamp=now_utc,
                )
                db.add(stop_ev)
                print(f"[startup] Auto-resolved orphan START: {ev.machine_id} code={ev.code} from {ev.timestamp}")
        db.commit()
    except Exception as e:
        print(f"[startup] Error during orphan cleanup: {e}")
    finally:
        db.close()
    yield  # Server runs here

app = FastAPI(title="Machine Failure Reporting API", lifespan=lifespan)

# Add CORS so PWA from any IP can hit the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from typing import Optional, List, Dict, Any
import configparser

# Load config
config_path = os.path.join(DATA_DIR, "config.ini")
config = configparser.ConfigParser()
config.read(config_path)

# Define request body models
class LogRequest(BaseModel):
    machine_id: str
    worker_id: str
    code: int
    action: str
    timestamp: datetime
    desc: Optional[str] = None

class AdminFailuresRequest(BaseModel):
    password: str
    failures: List[Dict[str, Any]]

class AdminMachinesRequest(BaseModel):
    password: str
    machines: List[Dict[str, Any]]

class PingRequest(BaseModel):
    machine_id: str

class AdminPasswordRequest(BaseModel):
    password: str

# Global state for machine heartbeats
connected_machines: Dict[str, datetime] = {}

def process_start_alert(log: LogRequest):
    desc_text = log.desc if log.desc else f"Unknown Error / 未知错误 {log.code}"
    message = f"🚨 **MACHINE ALARM / 机器异常!**\n\n**Machine / 机器:** {log.machine_id}\n**Worker / 员工:** {log.worker_id}\n**Error / 故障:** {desc_text}\n**Time / 时间:** {log.timestamp.strftime('%H:%M:%S')}"
    send_wechat_notification(message)

def process_stop_alert(log: LogRequest, duration_seconds: float):
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    
    desc_text = log.desc if log.desc else f"Code / 代码 {log.code}"
    message = f"✅ **ALARM CLEARED / 警报解除!**\n\n**Machine / 机器:** {log.machine_id}\n**Worker / 员工:** {log.worker_id}\n**Error / 故障:** {desc_text}\n**Resolved in / 解决耗时:** {minutes} min {seconds} s"
    send_wechat_notification(message)

@app.post("/api/log")
def log_event(log: LogRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # 1. Use timestamp as provided (timezone aware is better)
    event_time = log.timestamp
    
    # 2. Save raw event
    db_event = models.MachineEvent(
        machine_id=log.machine_id,
        worker_id=log.worker_id,
        code=log.code,
        desc=log.desc,
        action=log.action,
        timestamp=event_time
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    # 3. Handle logic based on action
    if log.action == "START":
        # Send instant alert for every push
        background_tasks.add_task(process_start_alert, log)
        
    elif log.action == "STOP":
        # Find the latest START event for this machine and code
        last_start = db.query(models.MachineEvent).filter(
            models.MachineEvent.machine_id == log.machine_id,
            models.MachineEvent.code == log.code,
            models.MachineEvent.action == "START"
        ).order_by(models.MachineEvent.timestamp.desc()).first()
        
        if last_start:
            # Calculate duration - ensure BOTH are naive for subtraction to avoid crash
            start_tz = last_start.timestamp.replace(tzinfo=None)
            end_tz = event_time.replace(tzinfo=None)
                
            duration = (end_tz - start_tz).total_seconds()
            
            # Save the computed log
            db_log = models.FailureSession(
                machine_id=log.machine_id,
                worker_id=log.worker_id,
                code=log.code,
                desc=log.desc,
                start_time=start_tz,
                end_time=end_tz,
                duration_seconds=duration
            )
            db.add(db_log)
            db.commit()
            
            # Send resolve alert
            background_tasks.add_task(process_stop_alert, log, duration)

    return {"status": "success"}

@app.get("/api/failures")
def get_failures():
    failures_path = os.path.join(os.path.dirname(__file__), "static", "failures.json")
    if os.path.exists(failures_path):
        with open(failures_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return [
        {"id": 1, "desc": "Brak zasilania / 断电", "severity": "high"},
        {"id": 2, "desc": "Zacięcie materiału / 卡料", "severity": "medium"}
    ]

@app.post("/api/failures")
def update_failures(req: AdminFailuresRequest):
    config.read(config_path)
    real_pwd = config.get("Settings", "admin_password", fallback="admin")
    if req.password != real_pwd:
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło administratora.")
    
    failures_path = os.path.join(os.path.dirname(__file__), "static", "failures.json")
    with open(failures_path, "w", encoding="utf-8") as f:
        json.dump(req.failures, f, ensure_ascii=False, indent=4)
        
    return {"status": "success"}

@app.get("/api/machines")
def get_machines():
    machines_path = os.path.join(os.path.dirname(__file__), "static", "machines.json")
    if os.path.exists(machines_path):
        with open(machines_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.post("/api/machines")
def update_machines(req: AdminMachinesRequest):
    config.read(config_path)
    real_pwd = config.get("Settings", "admin_password", fallback="admin")
    if req.password != real_pwd:
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło administratora.")
    
    machines_path = os.path.join(os.path.dirname(__file__), "static", "machines.json")
    with open(machines_path, "w", encoding="utf-8") as f:
        json.dump(req.machines, f, ensure_ascii=False, indent=4)
        
    return {"status": "success"}

@app.post("/api/ping")
def ping_machine(req: PingRequest, db: Session = Depends(get_db)):
    """ Registers that the machine is currently online and returns its active fault status. """
    connected_machines[req.machine_id] = datetime.now(pytz.UTC)
    
    # Check if this machine has an active fault right now
    subquery = db.query(
        models.MachineEvent.machine_id,
        models.MachineEvent.code,
        func.max(models.MachineEvent.timestamp).label('max_time')
    ).filter(models.MachineEvent.machine_id == req.machine_id).group_by(models.MachineEvent.machine_id, models.MachineEvent.code).subquery()

    latest_events = db.query(models.MachineEvent).join(
        subquery,
        (models.MachineEvent.machine_id == subquery.c.machine_id) &
        (models.MachineEvent.code == subquery.c.code) &
        (models.MachineEvent.timestamp == subquery.c.max_time)
    ).all()
    
    active_faults = []
    for ev in latest_events:
        if ev.action == "START":
            active_faults.append({
                "id": ev.code,
                "desc": ev.desc,
                "workerId": ev.worker_id,
                "localStartTime": ev.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ')
            })

    # For backward compatibility with the single-fault UI, we still return active_fault (the first one)
    # but also provide the full active_faults list.
    return {
        "status": "ok", 
        "active_fault": active_faults[0] if active_faults else None,
        "active_faults": active_faults
    }

@app.post("/api/verify_admin")
def verify_admin(req: AdminPasswordRequest):
    config.read(config_path)
    real_pwd = config.get("Settings", "admin_password", fallback="admin")
    if req.password != real_pwd:
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło administratora.")
    return {"status": "ok"}

@app.get("/api/config")
def get_config():
    config.read(config_path)
    return {
        "shift_times": config.get("Settings", "shift_times", fallback="07:00,15:00,23:00")
    }

@app.get("/api/live")
def get_live_stats(db: Session = Depends(get_db)):
    """ Returns active faulty machines and today's summary statistics. """
    # 1. Find all active START events (machines currently down)
    # Fast way: Get latest event per machine & code, if it's "START", it's active.
    # Group by machine_id, find max timestamp
    subquery = db.query(
        models.MachineEvent.machine_id,
        models.MachineEvent.code,
        func.max(models.MachineEvent.timestamp).label('max_time')
    ).group_by(models.MachineEvent.machine_id, models.MachineEvent.code).subquery()

    latest_events = db.query(models.MachineEvent).join(
        subquery,
        (models.MachineEvent.machine_id == subquery.c.machine_id) &
        (models.MachineEvent.code == subquery.c.code) &
        (models.MachineEvent.timestamp == subquery.c.max_time)
    ).all()

    active_faults = []
    for ev in latest_events:
        if ev.action == "START":
            active_faults.append({
                "machine_id": ev.machine_id,
                "worker_id": ev.worker_id,
                "desc": ev.desc,
                "start_time": ev.timestamp.strftime('%Y-%m-%dT%H:%M:%SZ'),
                "code": ev.code
            })

    # 2. Get today's stats from FailureSession Table
    today = date.today()
    # SQLITE DATE comparison trick: match YYYY-MM-DD
    todays_logs = db.query(models.FailureSession).filter(
        func.date(models.FailureSession.start_time) == str(today)
    ).all()

    total_faults = len(todays_logs)
    total_downtime_seconds = sum((log.duration_seconds or 0) for log in todays_logs)
    
    # 2.5 Aggregate for Pareto Chart
    failure_totals = {}
    for log in todays_logs:
        desc = log.desc or "Nieznany kod"
        failure_totals[desc] = failure_totals.get(desc, 0) + (log.duration_seconds or 0)
        
    top_daily_failures = [{"desc": k, "duration_minutes": round(v / 60, 1)} for k, v in failure_totals.items() if v > 0]
    top_daily_failures.sort(key=lambda x: x["duration_minutes"], reverse=True)
    top_daily_failures = top_daily_failures[:5] # Limit to Top 5
    
    # 3. Get expected machines from configs
    expected_machines = get_machines()
    
    # 4. Clean up stale heartbeats (> 12s old)
    now = datetime.now(pytz.UTC)
    active_connections = {}
    for mid, last_seen in list(connected_machines.items()):
        if (now - last_seen).total_seconds() <= 12:
            active_connections[mid] = last_seen.isoformat()
    
    return {
        "expected_machines": expected_machines,
        "connected_machines": active_connections,
        "active_faults": active_faults,
        "top_daily_failures": top_daily_failures,
        "daily_stats": {
            "total_faults": total_faults,
            "total_downtime_minutes": int(total_downtime_seconds // 60)
        }
    }

@app.post("/api/trigger_report")
def trigger_ai_report(background_tasks: BackgroundTasks):
    """ Executes the AI report generation in the background to prevent blocking UI """
    background_tasks.add_task(run_report_generation)
    return {"status": "success", "message": "Report generation started"}

@app.post("/api/reset_faults")
def reset_all_faults(req: AdminPasswordRequest, db: Session = Depends(get_db)):
    """Close all orphan START events immediately (manual dashboard reset)."""
    import configparser
    cfg = configparser.ConfigParser()
    cfg.read(config_path)
    expected_pwd = cfg.get('Settings', 'admin_password', fallback='admin')
    if req.password != expected_pwd:
        raise HTTPException(status_code=403, detail="Invalid password")

    now_utc = datetime.utcnow().replace(tzinfo=None)
    orphan_starts = db.query(models.MachineEvent).filter(
        models.MachineEvent.action == "START"
    ).all()
    resolved = 0
    for ev in orphan_starts:
        has_stop = db.query(models.MachineEvent).filter(
            models.MachineEvent.machine_id == ev.machine_id,
            models.MachineEvent.code == ev.code,
            models.MachineEvent.action == "STOP",
            models.MachineEvent.timestamp > ev.timestamp,
        ).first()
        if not has_stop:
            stop_ev = models.MachineEvent(
                machine_id=ev.machine_id,
                worker_id=ev.worker_id,
                code=ev.code,
                desc=ev.desc,
                action="STOP",
                timestamp=now_utc,
            )
            db.add(stop_ev)
            resolved += 1
    db.commit()
    return {"status": "success", "resolved": resolved}

# Serve static files as the main UI
_static_dir = os.path.join(DATA_DIR, "static")
app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
