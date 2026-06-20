from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Dict, List
from app.schemas.eco_actions import (
    EcoMission, 
    AdoptMissionRequest, 
    CustomMissionRequest, 
    MissionCheckIn
)
from app.services.eco_service import EcoActionsService
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/eco-actions", tags=["Eco Actions"], dependencies=[Depends(rate_limiter(60))])

@router.get("/missions", response_model=Dict[str, List[EcoMission]])
def get_missions(x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.get_all_missions(x_user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/commit", response_model=EcoMission)
def commit_mission(request: AdoptMissionRequest, x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.commit_mission(x_user_id, request.action_id, request.source, request.config)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom", response_model=EcoMission)
def create_custom_mission(request: CustomMissionRequest, x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.create_custom_mission(
            user_id=x_user_id,
            title=request.title,
            description=request.description,
            carbon_reduction_kg=request.carbon_reduction_kg,
            money_saved_usd=request.money_saved_usd,
            effort_level=request.effort_level,
            config=request.config
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-in/{mission_id}", response_model=EcoMission)
def check_in_mission(mission_id: str, request: MissionCheckIn, x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.check_in_mission(x_user_id, mission_id, request)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel/{mission_id}")
def cancel_mission(mission_id: str, x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.cancel_mission(x_user_id, mission_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete/{mission_id}", response_model=EcoMission)
def complete_mission(mission_id: str, x_user_id: str = Header(default="default_user")):
    try:
        return EcoActionsService.complete_mission(x_user_id, mission_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
