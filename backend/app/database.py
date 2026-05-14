from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.models import job, resume, interview, hr_availability, ai_usage  # noqa: F401
    Base.metadata.create_all(bind=engine)
    ensure_interview_minutes_columns()


def ensure_interview_minutes_columns():
    inspector = inspect(engine)
    if "interviews" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("interviews")}
    json_type = "JSONB" if engine.dialect.name == "postgresql" else "JSON"
    column_defs = {
        "meeting_minutes_file_name": "VARCHAR(300)",
        "meeting_minutes_text": "TEXT",
        "interview_ai_score": "FLOAT",
        "interview_ai_evaluation": json_type,
        "interview_ai_evaluated_at": "TIMESTAMP",
    }

    with engine.begin() as conn:
        for column_name, column_type in column_defs.items():
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE interviews ADD COLUMN {column_name} {column_type}"))
