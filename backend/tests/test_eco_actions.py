import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.services.eco_service import EcoActionsService
from app.schemas.eco_actions import EcoMission, MissionConfig, MissionCheckIn
from app.schemas.assessment import AssessmentCreateRequest, SolarSetupTier, FoodHabit, VehicleType

# Simple mock objects
def get_mock_assessment():
    from app.schemas.assessment import TransportationSchema, HomeEnergySchema, FoodHabitsSchema, ShoppingSchema
    return AssessmentCreateRequest(
        transportation=TransportationSchema(
            vehicle_type=VehicleType.GASOLINE,
            weekly_distance_km=250.0,
            annual_flights=2
        ),
        home_energy=HomeEnergySchema(
            monthly_electricity_bill_inr=3600.0,
            ac_usage_hours_per_day=5.0,
            solar_tier=SolarSetupTier.NONE
        ),
        food_habits=FoodHabitsSchema(diet_type=FoodHabit.MIXED),
        shopping=ShoppingSchema(
            monthly_purchases_usd=500.0,
            food_deliveries_per_week=4,
            package_deliveries_per_week=2
        )
    )

@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
def test_get_all_missions_returns_defaults(mock_ass_repo, mock_comm_repo):
    # Setup mocks
    mock_comm_repo.get_missions.return_value = []
    mock_ass_repo.get_latest_assessment.return_value = None
    
    res = EcoActionsService.get_all_missions("test_user")
    
    assert "suggested" in res
    assert "active" in res
    assert "completed" in res
    assert len(res["active"]) == 0
    assert len(res["completed"]) == 0
    # Suggestions should be dynamically generated
    assert len(res["suggested"]) > 0

@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
def test_active_mission_limit_enforced(mock_ass_repo, mock_comm_repo):
    # Setup mock active list of 10 missions
    mock_comm_repo.get_missions.return_value = [
        {
            "id": f"mission_{i}",
            "user_id": "test_user",
            "action_id": f"action_{i}",
            "title": f"Mission {i}",
            "description": "Desc",
            "source": "dashboard",
            "status": "active",
            "carbon_reduction_kg": 100.0,
            "money_saved_usd": 20.0,
            "effort_level": "low",
            "success_probability": 80.0,
            "config": None,
            "check_ins": []
        } for i in range(10)
    ]
    mock_ass_repo.get_latest_assessment.return_value = None
    
    # Try committing to another mission, should raise HTTPException (400 - ACTIVE_LIMIT_EXCEEDED)
    config = MissionConfig(target_frequency="daily", start_date="2026-06-20", end_date="2026-07-20")
    
    with pytest.raises(HTTPException) as excinfo:
        EcoActionsService.commit_mission("test_user", "use_metro", "dashboard", config)
        
    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "ACTIVE_LIMIT_EXCEEDED"

@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
def test_create_custom_mission(mock_ass_repo, mock_comm_repo):
    mock_comm_repo.get_missions.return_value = []
    mock_ass_repo.get_latest_assessment.return_value = None
    
    config = MissionConfig(target_frequency="daily", start_date="2026-06-20", end_date="2026-07-20")
    
    res = EcoActionsService.create_custom_mission(
        user_id="test_user",
        title="Custom Test",
        description="Verify custom creation",
        carbon_reduction_kg=220.0,
        money_saved_usd=45.0,
        effort_level="moderate",
        config=config
    )
    
    assert res.title == "Custom Test"
    assert res.source == "manual"
    assert res.status == "active"
    assert res.carbon_reduction_kg == 220.0
    mock_comm_repo.save_mission.assert_called_once()

@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
def test_verify_mission_auto_transit(mock_ass_repo, mock_comm_repo):
    # Setup assessment with active weekly_override transit distance
    mock_comm_repo.get_missions.return_value = []
    
    # Base assessment (override active, transit > 0)
    from app.schemas.assessment import WeeklyOverride
    ass = get_mock_assessment()
    ass.transportation.weekly_override = WeeklyOverride(is_active=True, public_transit=50.0, car=0.0)
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    
    mission = EcoMission(
        id="test_transit",
        user_id="test_user",
        action_id="use_metro",
        title="Transit Commute",
        description="Verify transit",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    
    verified = EcoActionsService.verify_mission_auto("test_user", mission)
    assert verified is True

@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_complete_mission_triggers_updates(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    ass = get_mock_assessment()
    
    mission = EcoMission(
        id="dashboard_use_metro",
        user_id="test_user",
        action_id="use_metro",
        title="Transit Commute",
        description="Verify transit",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    
    mock_comm_repo.get_mission.return_value = mission.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id", "created_at": "2026-06-20"}
    
    completed = EcoActionsService.complete_mission("test_user", "dashboard_use_metro")
    
    assert completed.status == "completed"
    
    # Assert save_mission was called with status completed
    mock_comm_repo.save_mission.assert_called_once()
    assert mock_comm_repo.save_mission.call_args[0][1]["status"] == "completed"
    
    # Assert footprint reduction was applied and saved
    mock_ass_repo.create_assessment.assert_called_once()
    mock_carb_repo.create_calculation.assert_called_once()
    mock_prog_repo.add_history_entry.assert_called_once()
