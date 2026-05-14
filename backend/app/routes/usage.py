from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ai_usage import AiUsage
from app.models.resume import Resume
from app.services.usage_service import MODEL_PRICING_CNY_PER_MILLION, normalize_model_name

router = APIRouter(prefix="/api/usage", tags=["用量统计"])

PURPOSE_LABELS = {
    "resume_evaluation": "简历评估",
    "resume_parse": "简历解析",
    "job_draft": "岗位生成",
    "evaluation_criteria": "评估标准生成",
    "interview_minutes_evaluation": "面试纪要评估",
}


def _row_to_dict(row) -> dict:
    model = row.model or "unknown"
    normalized_model = normalize_model_name(model)
    return {
        "model": model,
        "normalized_model": normalized_model,
        "call_count": int(row.call_count or 0),
        "prompt_tokens": int(row.prompt_tokens or 0),
        "prompt_cache_hit_tokens": int(row.prompt_cache_hit_tokens or 0),
        "prompt_cache_miss_tokens": int(row.prompt_cache_miss_tokens or 0),
        "completion_tokens": int(row.completion_tokens or 0),
        "total_tokens": int(row.total_tokens or 0),
        "estimated_cost_cny": round(float(row.estimated_cost_cny or 0), 6),
        "pricing": MODEL_PRICING_CNY_PER_MILLION.get(normalized_model),
    }


@router.get("/stats")
def get_usage_stats(db: Session = Depends(get_db)):
    evaluated_resumes = (
        db.query(func.count(Resume.id))
        .filter(Resume.match_score.isnot(None))
        .scalar()
        or 0
    )

    total_calls = db.query(func.count(AiUsage.id)).scalar() or 0
    total_tokens = db.query(func.coalesce(func.sum(AiUsage.total_tokens), 0)).scalar() or 0
    total_cost = db.query(func.coalesce(func.sum(AiUsage.estimated_cost_cny), 0)).scalar() or 0

    grouped_rows = (
        db.query(
            AiUsage.model.label("model"),
            func.count(AiUsage.id).label("call_count"),
            func.coalesce(func.sum(AiUsage.prompt_tokens), 0).label("prompt_tokens"),
            func.coalesce(func.sum(AiUsage.prompt_cache_hit_tokens), 0).label("prompt_cache_hit_tokens"),
            func.coalesce(func.sum(AiUsage.prompt_cache_miss_tokens), 0).label("prompt_cache_miss_tokens"),
            func.coalesce(func.sum(AiUsage.completion_tokens), 0).label("completion_tokens"),
            func.coalesce(func.sum(AiUsage.total_tokens), 0).label("total_tokens"),
            func.coalesce(func.sum(AiUsage.estimated_cost_cny), 0).label("estimated_cost_cny"),
        )
        .group_by(AiUsage.model)
        .order_by(func.sum(AiUsage.total_tokens).desc())
        .all()
    )

    purpose_rows = (
        db.query(
            AiUsage.purpose.label("purpose"),
            AiUsage.model.label("model"),
            func.count(AiUsage.id).label("call_count"),
            func.coalesce(func.sum(AiUsage.prompt_tokens), 0).label("prompt_tokens"),
            func.coalesce(func.sum(AiUsage.prompt_cache_hit_tokens), 0).label("prompt_cache_hit_tokens"),
            func.coalesce(func.sum(AiUsage.prompt_cache_miss_tokens), 0).label("prompt_cache_miss_tokens"),
            func.coalesce(func.sum(AiUsage.completion_tokens), 0).label("completion_tokens"),
            func.coalesce(func.sum(AiUsage.total_tokens), 0).label("total_tokens"),
            func.coalesce(func.sum(AiUsage.estimated_cost_cny), 0).label("estimated_cost_cny"),
        )
        .group_by(AiUsage.purpose, AiUsage.model)
        .order_by(func.sum(AiUsage.total_tokens).desc())
        .all()
    )

    recent_calls = (
        db.query(AiUsage)
        .order_by(AiUsage.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "summary": {
            "evaluated_resumes": int(evaluated_resumes),
            "ai_call_count": int(total_calls),
            "total_tokens": int(total_tokens),
            "estimated_cost_cny": round(float(total_cost), 6),
        },
        "by_model": [_row_to_dict(row) for row in grouped_rows],
        "by_purpose": [
            {
                **_row_to_dict(row),
                "purpose": row.purpose,
                "purpose_label": PURPOSE_LABELS.get(row.purpose, row.purpose),
            }
            for row in purpose_rows
        ],
        "recent_calls": [
            {
                "id": item.id,
                "purpose": item.purpose,
                "purpose_label": PURPOSE_LABELS.get(item.purpose, item.purpose),
                "model": item.model,
                "prompt_tokens": item.prompt_tokens,
                "prompt_cache_hit_tokens": item.prompt_cache_hit_tokens,
                "prompt_cache_miss_tokens": item.prompt_cache_miss_tokens,
                "completion_tokens": item.completion_tokens,
                "total_tokens": item.total_tokens,
                "estimated_cost_cny": item.estimated_cost_cny,
                "created_at": item.created_at,
            }
            for item in recent_calls
        ],
        "pricing": {
            "source": "DeepSeek 官方价格文档",
            "source_url": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
            "unit": "CNY / 1M tokens",
            "models": MODEL_PRICING_CNY_PER_MILLION,
        },
    }
