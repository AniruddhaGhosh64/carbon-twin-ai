from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List, Dict, Any
from app.schemas.progress import (
    ProgressHistoryResponse, 
    ProgressEntry, 
    ProgressOverviewResponse,
    ActionPerformanceItem,
    AchievementsResponse
)
from app.repositories.progress_repository import ProgressRepository
from app.services.progress_service import ProgressService
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/progress", tags=["Progress"], dependencies=[Depends(rate_limiter(60))])
progress_repo = ProgressRepository()

@router.get("/history", response_model=ProgressHistoryResponse)
def get_progress_history(x_user_id: str = Header(default="default_user")):
    history = progress_repo.get_history(x_user_id)
    if not history:
        import datetime
        today = datetime.date.today().isoformat()
        # Default seed entry
        default_entry = progress_repo.add_history_entry(x_user_id, today, 70, 4500.0)
        return ProgressHistoryResponse(history=[
            ProgressEntry(
                id=default_entry["id"],
                user_id=default_entry["user_id"],
                date=default_entry["date"],
                carbon_score=default_entry["carbon_score"],
                emissions_kg=default_entry["emissions_kg"],
                updated_at=default_entry["updated_at"]
            )
        ])
        
    return ProgressHistoryResponse(
        history=[
            ProgressEntry(
                id=h["id"],
                user_id=h["user_id"],
                date=h["date"],
                carbon_score=h["carbon_score"],
                emissions_kg=h["emissions_kg"],
                updated_at=h["updated_at"]
            ) for h in history
        ]
    )

@router.get("/overview", response_model=ProgressOverviewResponse)
def get_progress_overview(x_user_id: str = Header(default="default_user")):
    try:
        return ProgressService.get_progress_overview(x_user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance", response_model=Dict[str, Any])
def get_progress_performance(timeframe: str = "all", x_user_id: str = Header(default="default_user")):
    try:
        categories = ProgressService.get_category_performance(x_user_id)
        actions = ProgressService.get_action_performance(x_user_id)
        return {
            "categories": categories,
            "actions": [a.model_dump() for a in actions]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/achievements", response_model=AchievementsResponse)
def get_progress_achievements(x_user_id: str = Header(default="default_user")):
    try:
        return ProgressService.get_achievements(x_user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
