from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from database import Base

class MachineEvent(Base):
    __tablename__ = "machine_events"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True)
    worker_id = Column(String, index=True)
    code = Column(Integer, index=True)
    desc = Column(String, nullable=True)
    action = Column(String)  # "START" or "STOP"
    timestamp = Column(DateTime(timezone=True), default=func.now())

class FailureSession(Base):
    __tablename__ = "failure_sessions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True)
    worker_id = Column(String, index=True)
    code = Column(Integer, index=True)
    desc = Column(String, nullable=True)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    duration_seconds = Column(Float)
