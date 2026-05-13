import logging
from typing import Any

from app.database import SessionLocal
from app.models.ai_usage import AiUsage

logger = logging.getLogger(__name__)


MODEL_PRICING_CNY_PER_MILLION = {
    "deepseek-v4-flash": {
        "input_cache_hit": 0.02,
        "input_cache_miss": 1.0,
        "output": 2.0,
    },
    "deepseek-v4-pro": {
        "input_cache_hit": 0.025,
        "input_cache_miss": 3.0,
        "output": 6.0,
    },
}

MODEL_ALIASES = {
    "deepseek-chat": "deepseek-v4-flash",
    "deepseek-reasoner": "deepseek-v4-flash",
}


def normalize_model_name(model: str | None) -> str:
    normalized = (model or "unknown").strip()
    return MODEL_ALIASES.get(normalized, normalized)


def get_model_pricing(model: str | None) -> dict[str, float]:
    return MODEL_PRICING_CNY_PER_MILLION.get(
        normalize_model_name(model),
        {"input_cache_hit": 0.0, "input_cache_miss": 0.0, "output": 0.0},
    )


def estimate_cost_cny(
    model: str | None,
    prompt_cache_hit_tokens: int,
    prompt_cache_miss_tokens: int,
    completion_tokens: int,
) -> float:
    pricing = get_model_pricing(model)
    return round(
        (
            prompt_cache_hit_tokens * pricing["input_cache_hit"]
            + prompt_cache_miss_tokens * pricing["input_cache_miss"]
            + completion_tokens * pricing["output"]
        )
        / 1_000_000,
        6,
    )


def _usage_value(usage: Any, key: str, default: int = 0) -> int:
    if usage is None:
        return default
    if isinstance(usage, dict):
        value = usage.get(key, default)
    else:
        value = getattr(usage, key, default)
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return default


def _usage_nested_value(usage: Any, parent: str, key: str, default: int = 0) -> int:
    if usage is None:
        return default
    nested = usage.get(parent) if isinstance(usage, dict) else getattr(usage, parent, None)
    return _usage_value(nested, key, default)


def extract_usage_tokens(usage: Any) -> dict[str, int]:
    prompt_tokens = _usage_value(usage, "prompt_tokens")
    completion_tokens = _usage_value(usage, "completion_tokens")
    total_tokens = _usage_value(usage, "total_tokens", prompt_tokens + completion_tokens)

    cache_hit = _usage_value(usage, "prompt_cache_hit_tokens")
    if cache_hit == 0:
        cache_hit = _usage_nested_value(usage, "prompt_tokens_details", "cached_tokens")

    cache_miss = _usage_value(usage, "prompt_cache_miss_tokens")
    if cache_miss == 0 and prompt_tokens:
        cache_miss = max(prompt_tokens - cache_hit, 0)

    return {
        "prompt_tokens": prompt_tokens,
        "prompt_cache_hit_tokens": cache_hit,
        "prompt_cache_miss_tokens": cache_miss,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
    }


def record_ai_usage(purpose: str, model: str, usage: Any) -> None:
    tokens = extract_usage_tokens(usage)
    if tokens["total_tokens"] <= 0:
        return

    cost = estimate_cost_cny(
        model,
        tokens["prompt_cache_hit_tokens"],
        tokens["prompt_cache_miss_tokens"],
        tokens["completion_tokens"],
    )

    db = SessionLocal()
    try:
        db.add(AiUsage(purpose=purpose, model=model, estimated_cost_cny=cost, **tokens))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("记录 AI token 用量失败: %s", exc)
    finally:
        db.close()
