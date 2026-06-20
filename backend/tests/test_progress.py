import pytest
from unittest.mock import patch, MagicMock
from app.services.progress_service import ProgressService
from app.schemas.assessment import SolarSetupTier, FoodHabit, VehicleType
from app.schemas.progress import ProgressOverviewResponse, AchievementsResponse

def get_mock_assessment():
    from app.schemas.assessment import TransportationSchema, HomeEnergySchema, FoodHabitsSchema, ShoppingSchema, AssessmentCreateRequest
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

@patch("app.services.progress_service.progress_repo")
@patch("app.services.progress_service.twin_repo")
@patch("app.services.progress_service.commitments_repo")
def test_get_progress_overview(mock_comm_repo, mock_twin_repo, mock_prog_repo):
    # Setup history mock (baseline emissions 5000, current emissions 4200)
    mock_prog_repo.get_history.return_value = [
        {"id": "pt1", "user_id": "test_user", "date": "2026-06-01", "carbon_score": 60, "emissions_kg": 5000.0},
        {"id": "pt2", "user_id": "test_user", "date": "2026-06-20", "carbon_score": 72, "emissions_kg": 4200.0}
    ]
    
    mock_twin_repo.get_latest_twin.return_value = {
        "future_state": {
            "total_kg": 3500.0,
            "carbon_score": 85
        }
    }
    
    # Commitments mock
    mock_comm_repo.get_missions.return_value = [
        {"action_id": "use_metro", "status": "completed", "money_saved_usd": 150.0, "check_ins": [{"date": "2026-06-10", "status": "completed", "verified_auto": False}]},
        {"action_id": "solar", "status": "active", "money_saved_usd": 200.0, "check_ins": [{"date": "2026-06-11", "status": "completed", "verified_auto": False}]}
    ]

    res = ProgressService.get_progress_overview("test_user")
    
    assert isinstance(res, ProgressOverviewResponse)
    assert res.total_carbon_reduced_kg == 800.0
    assert res.score_improvement == 12
    # Money saved should include completed (150) + active partial (200 * 10% from 1 check-in) = 170
    assert res.total_money_saved_usd == 170.0
    assert res.comparison.baseline == 5000.0
    assert res.comparison.current == 4200.0
    assert res.comparison.target == 3500.0
    assert res.comparison.gap_remaining == 700.0
    assert res.streaks.current_eco_streak == 2

@patch("app.services.progress_service.assessment_repo")
@patch("app.services.progress_service.progress_repo")
@patch("app.services.progress_service.twin_repo")
def test_category_performance_variance(mock_twin_repo, mock_prog_repo, mock_ass_repo):
    ass = get_mock_assessment()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    
    # Mock baseline history
    mock_prog_repo.get_history.return_value = [
        {"id": "pt1", "user_id": "test_user", "date": "2026-06-01", "carbon_score": 60, "emissions_kg": 6000.0}
    ]
    
    # Mock twin
    mock_twin_repo.get_latest_twin.return_value = {
        "future_state": {
            "transportation_kg": 1000.0,
            "energy_kg": 800.0,
            "food_kg": 600.0,
            "shopping_kg": 400.0
        }
    }

    perf = ProgressService.get_category_performance("test_user")
    
    assert "transportation" in perf
    assert "energy" in perf
    assert "food" in perf
    assert "shopping" in perf
    
    # Variance should be computed
    assert "variance_percentage" in perf["transportation"]

@patch("app.services.progress_service.commitments_repo")
def test_action_performance_rates(mock_comm_repo):
    # Setup missions: one completed, one active with check-ins
    mock_comm_repo.get_missions.return_value = [
        {
            "action_id": "use_metro",
            "title": "Use Metro",
            "status": "completed",
            "carbon_reduction_kg": 300.0,
            "config": {"target_frequency": "3 days/week", "start_date": "2026-06-01", "end_date": "2026-07-01"},
            "check_ins": [{"date": f"2026-06-0{i}", "status": "completed", "verified_auto": False} for i in range(1, 13)] # 12 check-ins
        },
        {
            "action_id": "solar",
            "title": "Adopt Solar",
            "status": "active",
            "carbon_reduction_kg": 500.0,
            "config": {"target_frequency": "daily", "start_date": "2026-06-01", "end_date": "2026-07-01"},
            "check_ins": [{"date": f"2026-06-0{i}", "status": "completed", "verified_auto": False} for i in range(1, 16)] # 15 check-ins (15/30 = 50% success)
        }
    ]

    actions_perf = ProgressService.get_action_performance("test_user")
    
    assert len(actions_perf) == 2
    # Completed action is 100% success
    assert actions_perf[0].success_rate == 100.0
    assert actions_perf[0].actual_savings_kg == 300.0
    # Active action is 50% success
    assert actions_perf[1].success_rate == 50.0
    assert actions_perf[1].actual_savings_kg == 250.0

@patch("app.services.progress_service.commitments_repo")
@patch("app.services.progress_service.assessment_repo")
def test_achievements_xp_and_badges(mock_ass_repo, mock_comm_repo):
    ass = get_mock_assessment()
    # Change solar tier in latest assessment to verify badge unlocks
    ass.home_energy.solar_tier = SolarSetupTier.MEDIUM
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    
    mock_comm_repo.get_missions.return_value = [
        {
            "action_id": "use_metro",
            "status": "completed",
            "check_ins": [{"date": "2026-06-10", "status": "completed", "verified_auto": False} for _ in range(5)]
        }
    ]

    ach = ProgressService.get_achievements("test_user")
    
    assert isinstance(ach, AchievementsResponse)
    # XP should be 1 completed (100) + 5 check-ins (50) = 150
    assert ach.total_xp == 150
    
    # Check unlocked badges
    badge_commuter = next(b for b in ach.badges if b.id == "commuter")
    assert badge_commuter.earned is True
    assert badge_commuter.progress_percentage == 100.0

    badge_solar = next(b for b in ach.badges if b.id == "solar")
    assert badge_solar.earned is True
    assert badge_solar.progress_percentage == 100.0
