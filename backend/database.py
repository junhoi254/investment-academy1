from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 데이터베이스 URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading_chat.db")

# Render의 PostgreSQL URL은 postgres://로 시작하는데, 
# SQLAlchemy는 postgresql://을 요구함
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLAlchemy 엔진 생성
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

# 세션 로컬 클래스
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스
Base = declarative_base()

# 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
