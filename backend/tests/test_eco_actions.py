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


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_transit_inactive_override(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import WeekTracking, DailyDistances
    ass = get_mock_assessment()
    ass.transportation.weekly_override.is_active = False
    
    daily = DailyDistances(car=20.0, public_transit=10.0, bicycle=0.0, walking=0.0)
    ass.transportation.current_week = WeekTracking(
        monday=daily, tuesday=daily, wednesday=daily, thursday=daily, friday=daily, saturday=daily, sunday=daily
    )
    
    mission = EcoMission(
        id="dashboard_transit",
        user_id="test_user",
        action_id="transit",
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
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_transit")
    
    # Assert created assessment has weekly_override car=0 and public_transit=140
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass["transportation"]["weekly_override"]["car"] == 0.0
    assert created_ass["transportation"]["weekly_override"]["public_transit"] == 140.0
    assert created_ass["transportation"]["weekly_override"]["is_active"] is True


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_cycle_weekly_and_carpool(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import WeekTracking, DailyDistances
    ass = get_mock_assessment()
    ass.transportation.weekly_override.is_active = True
    ass.transportation.weekly_override.car = 70.0
    ass.transportation.weekly_override.bicycle = 10.0
    
    # Cycle weekly with active override
    mission_cycle = EcoMission(
        id="dashboard_cycle",
        user_id="test_user",
        action_id="cycle_weekly",
        title="Cycle Weekly",
        description="Verify cycle",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    
    mock_comm_repo.get_mission.return_value = mission_cycle.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_cycle")
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass["transportation"]["weekly_override"]["car"] == 50.0 # 70 * (5/7)
    assert created_ass["transportation"]["weekly_override"]["bicycle"] == 30.0 # 10 + 70 * (2/7)
    
    # Carpool with inactive override
    ass2 = get_mock_assessment()
    ass2.transportation.weekly_override.is_active = False
    daily = DailyDistances(car=10.0, public_transit=0.0, bicycle=0.0, walking=0.0)
    ass2.transportation.current_week = WeekTracking(
        monday=daily, tuesday=daily, wednesday=daily, thursday=daily, friday=daily, saturday=daily, sunday=daily
    )
    
    mission_carpool = EcoMission(
        id="dashboard_carpool",
        user_id="test_user",
        action_id="carpool",
        title="Carpool Challenge",
        description="Carpool description",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission_carpool.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass2.model_dump()
    
    EcoActionsService.complete_mission("test_user", "dashboard_carpool")
    created_ass2 = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass2["transportation"]["weekly_override"]["car"] == 35.0 # (10*7) * 0.5


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_reduce_flights(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import FlightRecord, TripType
    ass = get_mock_assessment()
    ass.transportation.flight_records = [
        FlightRecord(date="2026-06-01", source_airport="JFK", destination_airport="LAX", trip_type=TripType.ROUND_TRIP, distance_km=8000.0, carbon_emissions_kg=1000.0),
        FlightRecord(date="2026-06-02", source_airport="LAX", destination_airport="SFO", trip_type=TripType.ONE_WAY, distance_km=500.0, carbon_emissions_kg=100.0)
    ]
    
    mission = EcoMission(
        id="dashboard_flights",
        user_id="test_user",
        action_id="reduce_flights",
        title="Reduce Flights",
        description="Reduce flights desc",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_flights")
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert len(created_ass["transportation"]["flight_records"]) == 1 # halved: (2+1)//2 = 1


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_solar_renewables_optimize(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import ApplianceItemSchema, ApplianceType
    ass = get_mock_assessment()
    ass.home_energy.solar_tier = SolarSetupTier.NONE
    ass.home_energy.monthly_electricity_bill_inr = 5000.0
    ass.home_energy.appliances = [
        ApplianceItemSchema(id="ac1", name="AC", type=ApplianceType.PRESET, daily_usage_hours=10.0, quantity=1, power_watts=1500.0)
    ]
    
    # 1. Solar
    mission_solar = EcoMission(
        id="dashboard_solar",
        user_id="test_user",
        action_id="solar",
        title="Go Solar",
        description="Install solar",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission_solar.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_solar")
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass["home_energy"]["solar_tier"] == SolarSetupTier.MEDIUM
    
    # 2. Optimize energy
    mission_optimize = EcoMission(
        id="dashboard_optimize",
        user_id="test_user",
        action_id="optimize_energy",
        title="Optimize energy",
        description="Optimize energy",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission_optimize.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    
    EcoActionsService.complete_mission("test_user", "dashboard_optimize")
    created_ass2 = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass2["home_energy"]["monthly_electricity_bill_inr"] == 4000.0 # 5000 * 0.8
    assert created_ass2["home_energy"]["appliances"][0]["daily_usage_hours"] == 8.0 # 10 * 0.8


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_diet_shift(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import MealRecordSchema, FoodItemSchema, FoodCategory
    ass = get_mock_assessment()
    ass.food_habits.diet_type = FoodHabit.MIXED
    ass.food_habits.meals = [
        MealRecordSchema(
            id="meal1",
            meal_type="dinner",
            items=[
                FoodItemSchema(id="item1", name="Beef Steak", category=FoodCategory.BEEF, portion_g=200.0),
                FoodItemSchema(id="item2", name="Rice", category=FoodCategory.GRAINS, portion_g=100.0)
            ]
        )
    ]
    
    mission = EcoMission(
        id="dashboard_diet",
        user_id="test_user",
        action_id="diet_shift",
        title="Diet Shift",
        description="Shift diet",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_diet")
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass["food_habits"]["diet_type"] == FoodHabit.VEGAN
    meal_items = created_ass["food_habits"]["meals"][0]["items"]
    assert len(meal_items) == 2
    assert meal_items[0]["category"] == FoodCategory.GRAINS
    assert meal_items[1]["category"] == FoodCategory.PLANT_PROTEIN
    assert meal_items[1]["portion_g"] == 200.0


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
@patch("app.services.eco_service.carbon_repo")
@patch("app.services.eco_service.progress_repo")
def test_apply_permanent_reduction_reduce_delivery(mock_prog_repo, mock_carb_repo, mock_ass_repo, mock_comm_repo):
    ass = get_mock_assessment()
    ass.shopping.food_deliveries_per_week = 4
    ass.shopping.package_deliveries_per_week = 2
    
    mission = EcoMission(
        id="dashboard_delivery",
        user_id="test_user",
        action_id="reduce_delivery",
        title="Reduce Delivery",
        description="Reduce delivery",
        source="dashboard",
        status="active",
        carbon_reduction_kg=300.0,
        money_saved_usd=80.0,
        effort_level="moderate",
        success_probability=80.0
    )
    mock_comm_repo.get_mission.return_value = mission.model_dump()
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_ass_repo.create_assessment.return_value = {"id": "new_ass_id"}
    
    EcoActionsService.complete_mission("test_user", "dashboard_delivery")
    created_ass = mock_ass_repo.create_assessment.call_args[0][1]
    assert created_ass["shopping"]["food_deliveries_per_week"] == 2
    assert created_ass["shopping"]["package_deliveries_per_week"] == 1


@patch("app.services.eco_service.commitments_repo")
@patch("app.services.eco_service.assessment_repo")
def test_verify_mission_auto_all_branches(mock_ass_repo, mock_comm_repo):
    from app.schemas.assessment import DailyDistances, WeekTracking, FlightRecord, TripType, MealRecordSchema, FoodItemSchema, FoodCategory
    ass = get_mock_assessment()
    
    # 1. use_metro/transit with inactive override
    ass.transportation.weekly_override.is_active = False
    daily = DailyDistances(car=10.0, public_transit=5.0, bicycle=0.0, walking=0.0)
    ass.transportation.current_week = WeekTracking(
        monday=daily, tuesday=daily, wednesday=daily, thursday=daily, friday=daily, saturday=daily, sunday=daily
    )
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_transit = EcoMission(id="m_transit", user_id="u", action_id="transit", title="T", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_transit) is True
    
    # 2. cycle_weekly with active override
    ass.transportation.weekly_override.is_active = True
    ass.transportation.weekly_override.bicycle = 15.0
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_cycle = EcoMission(id="m_cycle", user_id="u", action_id="cycle_weekly", title="C", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_cycle) is True
    
    # 3. cycle_weekly with inactive override
    ass.transportation.weekly_override.is_active = False
    daily_cycle = DailyDistances(car=10.0, public_transit=0.0, bicycle=5.0, walking=0.0)
    ass.transportation.current_week = WeekTracking(
        monday=daily_cycle, tuesday=daily_cycle, wednesday=daily_cycle, thursday=daily_cycle, friday=daily_cycle, saturday=daily_cycle, sunday=daily_cycle
    )
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    assert EcoActionsService.verify_mission_auto("u", mission_cycle) is True
    
    # 4. reduce_flights
    ass.transportation.flight_records = [
        FlightRecord(date="2026-06-01", source_airport="JFK", destination_airport="LAX", trip_type=TripType.ROUND_TRIP, distance_km=8000.0, carbon_emissions_kg=1000.0)
    ]
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_flights = EcoMission(id="m_flights", user_id="u", action_id="reduce_flights", title="F", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_flights) is True
    
    # 5. solar/switch_renewables
    ass.home_energy.solar_tier = SolarSetupTier.MEDIUM
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_solar = EcoMission(id="m_solar", user_id="u", action_id="solar", title="S", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_solar) is True
    
    # 6. optimize_energy
    ass.home_energy.monthly_electricity_bill_inr = 3000.0
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_optimize = EcoMission(id="m_opt", user_id="u", action_id="optimize_energy", title="O", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_optimize) is True
    
    # 7. reduce_meat / diet_shift (vegetarian/vegan diet)
    ass.food_habits.meals = [
        MealRecordSchema(id="m_veg", meal_type="lunch", items=[FoodItemSchema(id="i_veg", name="Milk", category=FoodCategory.DAIRY, portion_g=100.0)])
    ]
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_meat = EcoMission(id="m_meat", user_id="u", action_id="reduce_meat", title="M", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_meat) is True
    
    # 8. reduce_meat / diet_shift (mixed diet, checking meals has beef)
    ass.food_habits.meals = [
        MealRecordSchema(id="m1", meal_type="lunch", items=[FoodItemSchema(id="i1", name="Rice", category=FoodCategory.GRAINS, portion_g=100.0)])
    ]
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    assert EcoActionsService.verify_mission_auto("u", mission_meat) is True
    
    # 9. reduce_delivery
    ass.shopping.food_deliveries_per_week = 1
    ass.shopping.package_deliveries_per_week = 1
    mock_ass_repo.get_latest_assessment.return_value = ass.model_dump()
    mission_deliv = EcoMission(id="m_deliv", user_id="u", action_id="reduce_delivery", title="D", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_deliv) is True
    
    # 10. unknown action
    mission_unknown = EcoMission(id="m_unknown", user_id="u", action_id="unknown_action", title="U", description="D", source="s", status="active", carbon_reduction_kg=100.0, money_saved_usd=10.0, effort_level="low", success_probability=80.0)
    assert EcoActionsService.verify_mission_auto("u", mission_unknown) is False

