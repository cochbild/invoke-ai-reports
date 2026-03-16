from collections import Counter
from datetime import date
from typing import Optional

from sqlalchemy import func, case, distinct
from sqlalchemy.orm import Session

from backend.app.models import Generation, GenerationLora, QueueItem
from backend.services.prompt_analyzer import tokenize_prompt, analyze_tokens


def _next_day(d: date) -> str:
    from datetime import timedelta
    return str(d + timedelta(days=1))


def _apply_filters(query, user_id=None, start_date=None, end_date=None):
    if user_id:
        query = query.filter(Generation.user_id == user_id)
    if start_date:
        query = query.filter(Generation.created_at >= str(start_date))
    if end_date:
        query = query.filter(Generation.created_at < _next_day(end_date))
    return query


def get_overview_stats(session, user_id=None, start_date=None, end_date=None):
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)
    total = base.count()
    models_used = base.filter(Generation.model_name.isnot(None)).with_entities(
        func.count(distinct(Generation.model_name))).scalar()
    top_model_row = (base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, func.count().label("cnt"))
        .group_by(Generation.model_name).order_by(func.count().desc()).first())
    top_model = top_model_row[0] if top_model_row else None
    first_date = base.with_entities(func.min(Generation.created_at)).scalar()
    last_date = base.with_entities(func.max(Generation.created_at)).scalar()
    return {"total_images": total, "models_used": models_used or 0, "top_model": top_model,
            "first_date": str(first_date) if first_date else None,
            "last_date": str(last_date) if last_date else None}


def get_top_models(session, limit=10, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().desc()).limit(limit).all())
    return [{"model_name": r[0], "model_base": r[1], "count": r[2]} for r in rows]


def get_least_used_models(session, limit=10, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().asc()).limit(limit).all())
    return [{"model_name": r[0], "model_base": r[1], "count": r[2]} for r in rows]


def get_family_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.model_base.isnot(None))
        .with_entities(Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_base).order_by(func.count().desc()).all())
    return [{"model_base": r[0], "count": r[1]} for r in rows]


def get_model_leaderboard(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)

    # Get model stats in a single query
    rows = (base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, Generation.model_base,
            func.count().label("cnt"), func.avg(Generation.steps).label("avg_steps"),
            func.avg(Generation.cfg_scale).label("avg_cfg"),
            func.min(Generation.created_at).label("first_used"),
            func.max(Generation.created_at).label("last_used"))
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().desc()).all())

    # Get most common resolution per model in a single query
    res_rows = (base
        .filter(Generation.model_name.isnot(None), Generation.width.isnot(None), Generation.height.isnot(None))
        .with_entities(Generation.model_name, Generation.width, Generation.height, func.count().label("cnt"))
        .group_by(Generation.model_name, Generation.width, Generation.height)
        .order_by(Generation.model_name, func.count().desc()).all())

    # Keep only the top resolution per model
    top_res: dict[str, str] = {}
    for rr in res_rows:
        if rr[0] not in top_res:
            top_res[rr[0]] = f"{rr[1]}x{rr[2]}"

    return [{"model_name": r[0], "model_base": r[1], "count": r[2],
        "avg_steps": round(r[3], 1) if r[3] else None,
        "avg_cfg": round(r[4], 1) if r[4] else None,
        "common_resolution": top_res.get(r[0]),
        "first_used": str(r[5]) if r[5] else None,
        "last_used": str(r[6]) if r[6] else None} for r in rows]


def get_resolution_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.width.isnot(None), Generation.height.isnot(None))
        .with_entities(Generation.width, Generation.height, func.count().label("cnt"))
        .group_by(Generation.width, Generation.height).order_by(func.count().desc()).all())
    return [{"resolution": f"{r[0]}x{r[1]}", "width": r[0], "height": r[1], "count": r[2]} for r in rows]


def get_scheduler_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.scheduler.isnot(None))
        .with_entities(Generation.scheduler, func.count().label("cnt"))
        .group_by(Generation.scheduler).order_by(func.count().desc()).all())
    return [{"scheduler": r[0], "count": r[1]} for r in rows]


def get_steps_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.steps.isnot(None))
        .with_entities(Generation.steps, func.count().label("cnt"))
        .group_by(Generation.steps).order_by(Generation.steps).all())
    return [{"steps": r[0], "count": r[1]} for r in rows]


def get_cfg_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.filter(Generation.cfg_scale.isnot(None))
        .with_entities(Generation.cfg_scale, func.count().label("cnt"))
        .group_by(Generation.cfg_scale).order_by(Generation.cfg_scale).all())
    return [{"cfg_scale": r[0], "count": r[1]} for r in rows]


def get_lora_stats(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    total = base.count()
    gen_ids_with_lora = session.query(GenerationLora.generation_id).distinct().subquery()
    with_lora = base.filter(Generation.id.in_(session.query(gen_ids_with_lora))).count()
    lora_query = session.query(GenerationLora.lora_name, func.count().label("cnt")
        ).group_by(GenerationLora.lora_name).order_by(func.count().desc())
    if user_id or start_date or end_date:
        filtered_ids = base.with_entities(Generation.id).subquery()
        lora_query = session.query(GenerationLora.lora_name, func.count().label("cnt")
            ).filter(GenerationLora.generation_id.in_(session.query(filtered_ids))
            ).group_by(GenerationLora.lora_name).order_by(func.count().desc())
    top_loras = [{"lora_name": r[0], "count": r[1]} for r in lora_query.all()]
    return {"total_with_lora": with_lora,
            "pct_with_lora": round((with_lora / total * 100), 1) if total > 0 else 0,
            "top_loras": top_loras}


def get_error_stats(session, user_id=None, start_date=None, end_date=None):
    base = session.query(QueueItem)
    if user_id: base = base.filter(QueueItem.user_id == user_id)
    if start_date: base = base.filter(QueueItem.created_at >= str(start_date))
    if end_date: base = base.filter(QueueItem.created_at < _next_day(end_date))
    total = base.count()
    failed = base.filter(QueueItem.status == "failed").count()
    by_error = (base.filter(QueueItem.error_type.isnot(None))
        .with_entities(QueueItem.error_type, func.count().label("cnt"))
        .group_by(QueueItem.error_type).order_by(func.count().desc()).all())
    by_model = (base.filter(QueueItem.status == "failed", QueueItem.model_name.isnot(None))
        .with_entities(QueueItem.model_name, func.count().label("cnt"))
        .group_by(QueueItem.model_name).order_by(func.count().desc()).all())
    return {"total_items": total, "total_failed": failed,
            "failure_rate": round((failed / total * 100), 1) if total > 0 else 0,
            "by_error_type": [{"error_type": r[0], "count": r[1]} for r in by_error],
            "by_model": [{"model_name": r[0], "count": r[1]} for r in by_model]}


def get_volume_trend(session, granularity="day", user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    if granularity == "month": date_expr = func.strftime("%Y-%m", Generation.created_at)
    elif granularity == "week": date_expr = func.strftime("%Y-%W", Generation.created_at)
    else: date_expr = func.strftime("%Y-%m-%d", Generation.created_at)
    rows = (base.with_entities(date_expr.label("period"), func.count().label("cnt"))
        .group_by(date_expr).order_by(date_expr).all())
    return [{"period": r[0], "count": r[1]} for r in rows]


def get_activity_heatmap(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    rows = (base.with_entities(
        func.strftime("%w", Generation.created_at).label("dow"),
        func.strftime("%H", Generation.created_at).label("hour"),
        func.count().label("cnt")).group_by("dow", "hour").all())
    return [{"day_of_week": int(r[0]), "hour": int(r[1]), "count": r[2]} for r in rows]


def get_parameter_trends(session, granularity="month", user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    if granularity == "month": date_expr = func.strftime("%Y-%m", Generation.created_at)
    elif granularity == "week": date_expr = func.strftime("%Y-%W", Generation.created_at)
    else: date_expr = func.strftime("%Y-%m-%d", Generation.created_at)
    rows = (base.with_entities(date_expr.label("period"),
        func.avg(Generation.steps).label("avg_steps"),
        func.avg(Generation.cfg_scale).label("avg_cfg"))
        .group_by(date_expr).order_by(date_expr).all())
    return [{"period": r[0], "avg_steps": round(r[1], 1) if r[1] else None,
             "avg_cfg": round(r[2], 1) if r[2] else None} for r in rows]


def get_prompt_top_tokens(session, limit=20, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    prompts = [r[0] for r in base.filter(Generation.positive_prompt.isnot(None))
        .with_entities(Generation.positive_prompt).all()]
    return analyze_tokens(prompts, limit=limit)


def get_prompt_length_distribution(session, user_id=None, start_date=None, end_date=None):
    base = _apply_filters(session.query(Generation), user_id, start_date, end_date)
    prompts = [r[0] for r in base.filter(Generation.positive_prompt.isnot(None))
        .with_entities(Generation.positive_prompt).all()]
    lengths = [len(p.split()) for p in prompts if p.strip()]
    buckets = {}
    for length in lengths:
        if length <= 5: key = "1-5 words"
        elif length <= 10: key = "6-10 words"
        elif length <= 20: key = "11-20 words"
        elif length <= 50: key = "21-50 words"
        else: key = "50+ words"
        buckets[key] = buckets.get(key, 0) + 1
    bucket_order = ["1-5 words", "6-10 words", "11-20 words", "21-50 words", "50+ words"]
    return [{"bucket": b, "count": buckets.get(b, 0)} for b in bucket_order if b in buckets]
