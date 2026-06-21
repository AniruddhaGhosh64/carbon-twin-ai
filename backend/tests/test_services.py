import pytest
from unittest.mock import MagicMock, patch
from datetime import date, timezone, datetime
from fastapi import HTTPException

from app.schemas.assessment import (
    AssessmentCreateRequest, CommuteMethod, VehicleType, FoodHabit,
    SolarSetupTier, WeeklyOverride, HomeEnergySchema, FoodHabitsSchema,
    ShoppingSchema, TransportationSchema, MealRecordSchema, FoodItemSchema, FoodCategory,
    ClothingItemsSchema, ElectronicsItemsSchema
)
from app.schemas.simulator import SimulatorLevers
from app.schemas.eco_actions import MissionConfig, MissionCheckIn
from app.services.simulator_service import SimulatorService
from app.services.eco_service import EcoActionsService
from app.services.progress_service import ProgressService
from app.services.recommendation_service import RecommendationService
from app.services.twin_service import CarbonTwinService

def get_base_test_assessment():
    return AssessmentCreateRequest(
        transportation=TransportationSchema(
            weekly_override=WeeklyOverride(
                is_active=True,
                car=200.0,
                public_transit=50.0,
                bicycle=10.0,
                walking=10.0
            ),
            vehicle_type=VehicleType.GASOLINE,
            flight_records=[]
        ),
        home_energy=HomeEnergySchema(
            monthly_electricity_bill_inr=3000.0,
            solar_tier=SolarSetupTier.NONE,
            appliances=[]
        ),
        food_habits=FoodHabitsSchema(
            diet_type=FoodHabit.MIXED,
            meals=[
                MealRecordSchema(
                    id="meal1",
                    meal_type="lunch",
                    items=[
                        FoodItemSchema(id="item1", name="Beef", category=FoodCategory.BEEF, portion_g=200.0),
                        FoodItemSchema(id="item2", name="Rice", category=FoodCategory.GRAINS, portion_g=150.0)
                    ]
                )
            ]
        ),
        shopping=ShoppingSchema(
            clothing_items=ClothingItemsSchema(shirts=1, pants=1, outerwear=0, shoes=1),
            electronics_items=ElectronicsItemsSchema(phones=1, laptops=0, tvs=0, accessories=2),
            food_deliveries_per_week=4,
            package_deliveries_per_week=2,
            large_purchases=[]
        )
    )

# --- 1. SIMULATOR SERVICE TESTS ---

def test_simulator_service_various_levers():
    assessment = get_base_test_assessment()
    
    # 1. Transport levers: cycle_days, reduce_driving_percentage, use_metro
    levers1 = SimulatorLevers(
        cycle_days=3,
        reduce_driving_percentage=20.0,
        use_metro=True,
        flight_reduction_count=0
    )
    res1 = SimulatorService.simulate(assessment, levers1)
    assert res1["simulated_emissions_kg"] < res1["base_emissions_kg"]

    # 2. Transport levers: carpool, flight_reduction
    from app.schemas.assessment import FlightRecord, TripType
    assessment.transportation.flight_records = [
        FlightRecord(date="2026-06-01", source_airport="JFK", destination_airport="LAX", trip_type=TripType.ROUND_TRIP, distance_km=8000.0, carbon_emissions_kg=1000.0)
    ]
    levers2 = SimulatorLevers(
        carpool=True,
        flight_reduction_count=1
    )
    res2 = SimulatorService.simulate(assessment, levers2)
    assert res2["simulated_emissions_kg"] < res2["base_emissions_kg"]

    # 3. Energy levers: solar adoption, appliance optimization, reduce electricity percentage
    levers3 = SimulatorLevers(
        solar_adoption=True,
        appliance_optimization=True,
        reduce_electricity_percentage=20.0
    )
    res3 = SimulatorService.simulate(assessment, levers3)
    assert res3["simulated_emissions_kg"] < res3["base_emissions_kg"]

    # 4. Food levers: reduce meat, diet transition vegetarian, vegan, pescatarian, reduce beef percentage
    for diet in ["vegetarian", "vegan", "pescatarian"]:
        levers_food = SimulatorLevers(
            reduce_meat=True,
            diet_transition=diet,
            reduce_beef_percentage=30.0
        )
        res_food = SimulatorService.simulate(assessment, levers_food)
        assert res_food["simulated_emissions_kg"] < res_food["base_emissions_kg"]

    # 5. Shopping & Deliveries: reduce deliveries, clothing, electronics
    levers_shop = SimulatorLevers(
        reduce_deliveries_percentage=40.0,
        reduce_clothing_percentage=50.0,
        reduce_electronics_percentage=20.0
    )
    res_shop = SimulatorService.simulate(assessment, levers_shop)
    assert res_shop["simulated_emissions_kg"] < res_shop["base_emissions_kg"]

def test_simulator_service_no_weekly_override():
    # Test simulator branch when weekly override is inactive (uses daily commute sum)
    from app.schemas.assessment import WeekTracking, DailyDistances
    assessment = get_base_test_assessment()
    assessment.transportation.weekly_override.is_active = False
    
    daily = DailyDistances(car=30.0, public_transit=10.0, bicycle=0.0, walking=0.0)
    assessment.transportation.current_week = WeekTracking(
        monday=daily, tuesday=daily, wednesday=daily, thursday=daily, friday=daily, saturday=daily, sunday=daily
    )
    
    levers = SimulatorLevers(
        cycle_days=2,
        reduce_driving_percentage=10.0,
        use_metro=True
    )
    res = SimulatorService.simulate(assessment, levers)
    assert res["simulated_emissions_kg"] < res["base_emissions_kg"]


# --- 2. ECO ACTIONS SERVICE TESTS ---

@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.commitments_repo")
def test_eco_actions_service_dashboard_and_twin(mock_commit_repo, mock_assessment_repo):
    assessment = get_base_test_assessment()
    mock_assessment_repo.get_latest_assessment.return_value = assessment.model_dump()
    mock_commit_repo.get_missions.return_value = []
    
    # get_missions_dashboard
    dashboard_missions = EcoActionsService.get_missions_dashboard("user123")
    assert len(dashboard_missions) > 0
    assert dashboard_missions[0].source == "dashboard"

    # get_missions_twin
    twin_missions = EcoActionsService.get_missions_twin("user123")
    assert len(twin_missions) > 0

@patch("app.services.eco_service.commitments_repo")
def test_eco_actions_service_commits_and_checkins(mock_commit_repo):
    # Mock database responses for commitments repo
    mock_commit_repo.get_missions.return_value = []
    mock_commit_repo.save_mission.side_effect = lambda uid, x: x

    # 1. Commit mission success
    config = MissionConfig(target_frequency="weekly", start_date="2026-06-20", end_date="2026-07-20")
    res = EcoActionsService.commit_mission("user123", "use_metro", "dashboard", config)
    assert res.action_id == "use_metro"
    assert res.status == "active"

    # 2. Limit exceeded error
    active_missions = [
        {
            "id": f"m{i}",
            "user_id": "user123",
            "action_id": "action",
            "title": "Title",
            "description": "Desc",
            "source": "dashboard",
            "status": "active",
            "carbon_reduction_kg": 100.0,
            "money_saved_usd": 10.0,
            "effort_level": "low",
            "success_probability": 80.0
        }
        for i in range(10)
    ]
    mock_commit_repo.get_missions.return_value = active_missions
    with pytest.raises(HTTPException) as exc:
        EcoActionsService.commit_mission("user123", "reduce_meat", "dashboard", config)
    assert exc.value.status_code == 400
    assert exc.value.detail == "ACTIVE_LIMIT_EXCEEDED"

    # Reset missions mock
    mock_commit_repo.get_missions.return_value = []

    # 3. Create custom mission
    custom_res = EcoActionsService.create_custom_mission(
        "user123", "Plant Trees", "Plant 5 trees", 100.0, 20.0, "moderate", config
    )
    assert custom_res.action_id.startswith("custom")
    assert custom_res.title == "Plant Trees"

    # 4. Check in on active mission
    mock_commit_repo.get_mission.return_value = custom_res.model_dump()
    checkin_data = MissionCheckIn(date="2026-06-20", status="completed", verified_auto=False)
    updated_mission = EcoActionsService.check_in_mission("user123", custom_res.id, checkin_data)
    assert len(updated_mission.check_ins) == 1
    assert updated_mission.check_ins[0].date == "2026-06-20"

    # 5. Check in mission not found
    mock_commit_repo.get_mission.return_value = None
    with pytest.raises(HTTPException) as exc:
        EcoActionsService.check_in_mission("user123", "invalid_id", checkin_data)
    assert exc.value.status_code == 404

    # 6. Cancel mission
    mock_commit_repo.get_mission.return_value = custom_res.model_dump()
    mock_commit_repo.delete_mission.return_value = True
    cancel_res = EcoActionsService.cancel_mission("user123", custom_res.id)
    assert cancel_res["success"] is True

    # 7. Cancel mission not found
    mock_commit_repo.get_mission.return_value = None
    with pytest.raises(HTTPException) as exc:
        EcoActionsService.cancel_mission("user123", "invalid_id")
    assert exc.value.status_code == 404

    # 8. Complete mission
    mock_commit_repo.get_mission.return_value = custom_res.model_dump()
    completed = EcoActionsService.complete_mission("user123", custom_res.id)
    assert completed.status == "completed"

    # 9. Complete mission not found
    mock_commit_repo.get_mission.return_value = None
    with pytest.raises(HTTPException) as exc:
        EcoActionsService.complete_mission("user123", "invalid_id")
    assert exc.value.status_code == 404


# --- 3. PROGRESS SERVICE TESTS ---

@patch("app.services.progress_service.progress_repo")
@patch("app.services.progress_service.twin_repo")
@patch("app.services.progress_service.commitments_repo")
@patch("app.services.progress_service.assessment_repo")
def test_progress_service_overview(mock_assessment_repo, mock_commit_repo, mock_twin_repo, mock_progress_repo):
    # Setup mocks
    assessment = get_base_test_assessment()
    mock_assessment_repo.get_latest_assessment.return_value = assessment.model_dump()
    
    mock_twin_repo.get_latest_twin.return_value = {
        "current_state": {
            "total_kg": 3000.0,
            "carbon_score": 60,
            "transportation_kg": 1000.0,
            "energy_kg": 1000.0,
            "food_kg": 500.0,
            "shopping_kg": 500.0
        },
        "future_state": {
            "total_kg": 2500.0,
            "carbon_score": 75,
            "transportation_kg": 800.0,
            "energy_kg": 800.0,
            "food_kg": 400.0,
            "shopping_kg": 500.0
        },
        "potential_state": {
            "total_kg": 2000.0,
            "carbon_score": 85,
            "transportation_kg": 600.0,
            "energy_kg": 600.0,
            "food_kg": 400.0,
            "shopping_kg": 400.0
        }
    }
    
    mock_commit_repo.get_missions.return_value = [
        {
            "id": "m1",
            "user_id": "user123",
            "action_id": "use_metro",
            "title": "Use Metro",
            "description": "Metro",
            "source": "dashboard",
            "status": "completed",
            "carbon_reduction_kg": 150.0,
            "money_saved_usd": 30.0,
            "effort_level": "low",
            "success_probability": 90.0
        },
        {
            "id": "m2",
            "user_id": "user123",
            "action_id": "reduce_meat",
            "title": "Reduce Meat",
            "description": "Meat",
            "source": "dashboard",
            "status": "active",
            "carbon_reduction_kg": 100.0,
            "money_saved_usd": 20.0,
            "effort_level": "moderate",
            "success_probability": 80.0
        }
    ]
    
    # 1. Overview with seeded progress
    mock_progress_repo.get_history.return_value = [
        {"date": "2026-06-01", "carbon_score": 60, "emissions_kg": 3500.0},
        {"date": "2026-06-20", "carbon_score": 68, "emissions_kg": 3000.0}
    ]
    
    overview = ProgressService.get_progress_overview("user123")
    assert overview.total_carbon_reduced_kg == 500.0
    assert overview.score_improvement == 8
    assert overview.streaks.current_eco_streak >= 0

    # 2. Category performance
    perf_categories = ProgressService.get_category_performance("user123")
    assert "transportation" in perf_categories

    # 3. Action performance
    perf_actions = ProgressService.get_action_performance("user123")
    assert len(perf_actions) == 2
    assert perf_actions[0].action_id in ["use_metro", "reduce_meat"]

    # 4. Achievements
    achievements = ProgressService.get_achievements("user123")
    assert achievements.total_xp >= 0
