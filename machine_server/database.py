from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sys
from dotenv import load_dotenv

def _bundle_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS  # where .env is bundled
    return os.path.dirname(os.path.abspath(__file__))

def _runtime_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)  # next to the .exe
    return os.path.dirname(os.path.abspath(__file__))

# Load .env from bundle dir
load_dotenv(os.path.join(_bundle_dir(), '.env'))
load_dotenv()  # fallback for dev mode

# DB lives next to the exe so it persists across updates
_default_db = "sqlite:///" + os.path.join(_runtime_dir(), "machine_logs.db")
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
