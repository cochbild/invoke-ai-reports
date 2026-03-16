from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.services import analytics

router = APIRouter(tags=["stats"])


def _parse_date(d: Optional[str]) -> Optional[date]:
    if not d:
        return None
    try:
        return date.fromisoformat(d)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: '{d}'. Use YYYY-MM-DD.")


@router.get("/stats/overview")
def overview(user_id: Optional[str] = None, start_date: Optional[str] = None,
             end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_overview_stats(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/models/top")
def top_models(limit: int = Query(default=10, ge=1, le=500), user_id: Optional[str] = None,
               start_date: Optional[str] = None, end_date: Optional[str] = None,
               db: Session = Depends(get_db)):
    return analytics.get_top_models(db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/models/least")
def least_models(limit: int = Query(default=10, ge=1, le=500), user_id: Optional[str] = None,
                 start_date: Optional[str] = None, end_date: Optional[str] = None,
                 db: Session = Depends(get_db)):
    return analytics.get_least_used_models(db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/models/family-distribution")
def family_dist(user_id: Optional[str] = None, start_date: Optional[str] = None,
                end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_family_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/models/leaderboard")
def leaderboard(user_id: Optional[str] = None, start_date: Optional[str] = None,
                end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_model_leaderboard(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/prompts/top-tokens")
def prompt_tokens(limit: int = Query(default=20, ge=1, le=500), user_id: Optional[str] = None,
                  start_date: Optional[str] = None, end_date: Optional[str] = None,
                  db: Session = Depends(get_db)):
    return analytics.get_prompt_top_tokens(db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/prompts/length-distribution")
def prompt_length(user_id: Optional[str] = None, start_date: Optional[str] = None,
                  end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_prompt_length_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/trends/volume")
def volume_trend(granularity: Literal["day", "week", "month"] = "day",
                 user_id: Optional[str] = None, start_date: Optional[str] = None,
                 end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_volume_trend(db, granularity=granularity, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/trends/heatmap")
def heatmap(user_id: Optional[str] = None, start_date: Optional[str] = None,
            end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_activity_heatmap(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/trends/parameters")
def param_trends(granularity: Literal["day", "week", "month"] = "month",
                 user_id: Optional[str] = None, start_date: Optional[str] = None,
                 end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_parameter_trends(db, granularity=granularity, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/resolutions")
def resolutions(user_id: Optional[str] = None, start_date: Optional[str] = None,
                end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_resolution_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/schedulers")
def schedulers(user_id: Optional[str] = None, start_date: Optional[str] = None,
               end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_scheduler_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/steps")
def steps_dist(user_id: Optional[str] = None, start_date: Optional[str] = None,
               end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_steps_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/cfg")
def cfg_dist(user_id: Optional[str] = None, start_date: Optional[str] = None,
             end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_cfg_distribution(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/loras")
def loras(user_id: Optional[str] = None, start_date: Optional[str] = None,
          end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_lora_stats(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))

@router.get("/stats/generation/errors")
def errors(user_id: Optional[str] = None, start_date: Optional[str] = None,
           end_date: Optional[str] = None, db: Session = Depends(get_db)):
    return analytics.get_error_stats(db, user_id=user_id,
        start_date=_parse_date(start_date), end_date=_parse_date(end_date))
