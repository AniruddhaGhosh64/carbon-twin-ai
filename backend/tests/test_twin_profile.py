import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.assessment import (
    AssessmentCreateRequest, TransportationSchema, HomeEnergySchema,
    FoodHabitsSchema, ShoppingSchema, VehicleType, SolarSetupTier,
    FoodHabit, WeeklyOverride, DailyDistances, FlightRecord, TripType,
    ClothingItemsSchema, ElectronicsItemsSchema
)
from app.schemas.twin import TwinState
from app.services.twin_service import CarbonTwinService

client = TestClient(app)

def create_base_assessment(
    weekly_car=0.0, weekly_transit=0.0, flight_records=None,
    electricity_bill=1000.0, solar_tier=SolarSetupTier.NONE,
    deliveries_week=0, clothing_shirts=0, electronics_phones=0
):
    if flight_records is None:
        flight_records = []
    
    return AssessmentCreateRequest(
        transportation=TransportationSchema(
            weekly_override=WeeklyOverride(
                is_active=True,
                car=weekly_car,
                public_transit=weekly_transit,
                bicycle=0.0,
                walking=0.0
            ),
            flight_records=flight_records,
            vehicle_type=VehicleType.GASOLINE if weekly_car > 0 else VehicleType.NONE
        ),
        home_energy=HomeEnergySchema(
            monthly_electricity_bill_inr=electricity_bill,
            solar_tier=solar_tier,
            appliances=[]
        ),
        food_habits=FoodHabitsSchema(diet_type=FoodHabit.MIXED),
        shopping=ShoppingSchema(
            clothing_items=ClothingItemsSchema(shirts=clothing_shirts, pants=0, outerwear=0, shoes=0),
            electronics_items=ElectronicsItemsSchema(phones=electronics_phones, laptops=0, tvs=0, accessories=0),
            food_deliveries_per_week=deliveries_week,
            package_deliveries_per_week=0,
            large_purchases=[]
        )
    )

def test_archetype_frequent_flyer():
    # Frequent flyer if len(flight_records) >= 3 or flight_emissions > 2000
    flights = [
        FlightRecord(date="2026-06-01", source_airport="JFK", destination_airport="LAX", trip_type=TripType.ONE_WAY, distance_km=4000.0, carbon_emissions_kg=500.0),
        FlightRecord(date="2026-06-02", source_airport="LAX", destination_airport="SFO", trip_type=TripType.ONE_WAY, distance_km=500.0, carbon_emissions_kg=100.0),
        FlightRecord(date="2026-06-03", source_airport="SFO", destination_airport="JFK", trip_type=TripType.ONE_WAY, distance_km=4000.0, carbon_emissions_kg=500.0)
    ]
    assessment = create_base_assessment(flight_records=flights)
    state = TwinState(transportation_kg=1100.0, energy_kg=500.0, food_kg=500.0, shopping_kg=500.0, total_kg=2600.0, carbon_score=75)
    
    profile = CarbonTwinService.get_profile(state, assessment)
    assert profile.archetype == "Frequent Flyer"

def test_archetype_high_shopper():
    # High shopper if shopping emissions > 1500 or deliveries > 6 or clothing > 5
    assessment = create_base_assessment(deliveries_week=8)
    state = TwinState(transportation_kg=0.0, energy_kg=500.0, food_kg=500.0, shopping_kg=2000.0, total_kg=3000.0, carbon_score=70)
    
    profile = CarbonTwinService.get_profile(state, assessment)
    assert profile.archetype == "High Consumption Shopper"

def test_archetype_urban_transit():
    # Transit optimizer if bike/walk/transit >= 60% of ground commute, or EV owns
    assessment = create_base_assessment(weekly_car=10.0, weekly_transit=40.0)
    state = TwinState(transportation_kg=100.0, energy_kg=1000.0, food_kg=500.0, shopping_kg=500.0, total_kg=2100.0, carbon_score=80)
    
    profile = CarbonTwinService.get_profile(state, assessment)
    assert profile.archetype == "Urban Transit Optimizer"

def test_archetype_energy_efficient():
    # Energy efficient if energy emissions < 500 or solar tier in [medium, large]
    assessment = create_base_assessment(solar_tier=SolarSetupTier.LARGE)
    state = TwinState(transportation_kg=500.0, energy_kg=200.0, food_kg=500.0, shopping_kg=500.0, total_kg=1700.0, carbon_score=85)
    
    profile = CarbonTwinService.get_profile(state, assessment)
    assert profile.archetype == "Energy Efficient Household"

def test_archetype_balanced_user():
    # Fallback balanced user
    assessment = create_base_assessment(weekly_car=40.0, weekly_transit=10.0)
    state = TwinState(transportation_kg=600.0, energy_kg=800.0, food_kg=500.0, shopping_kg=500.0, total_kg=2400.0, carbon_score=78)
    
    profile = CarbonTwinService.get_profile(state, assessment)
    assert profile.archetype == "Balanced Sustainable User"

@patch("app.api.routes.twin.assessment_repo")
@patch("app.api.routes.twin.twin_repo")
def test_generate_twin_endpoint_response_schema(mock_twin_repo, mock_assessment_repo):
    # Setup mocks
    ass = create_base_assessment(weekly_car=50.0)
    mock_assessment_repo.get_latest_assessment.return_value = ass.model_dump()
    mock_twin_repo.create_twin.return_value = {}
    
    response = client.post("/api/v1/carbontwin/generate", headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    data = response.json()
    
    # Assert presence of all three states and three profiles
    assert "current_state" in data
    assert "future_state" in data
    assert "potential_state" in data
    assert "current_profile" in data
    assert "future_profile" in data
    assert "potential_profile" in data
    
    profile = data["current_profile"]
    assert "archetype" in profile
    assert isinstance(profile["strengths"], list)
    assert isinstance(profile["weaknesses"], list)
    assert isinstance(profile["risk_areas"], list)
    assert isinstance(profile["opportunity_areas"], list)


def test_twin_service_apply_transit_rule():
    from app.schemas.assessment import DailyDistances, WeekTracking
    # 1. Override active, car < 100 -> bicycle
    ass1 = create_base_assessment(weekly_car=50.0)
    res1, savings1 = CarbonTwinService.apply_transit_rule(ass1)
    assert res1.transportation.weekly_override.car == 0.0
    assert res1.transportation.weekly_override.bicycle == 50.0
    assert savings1 == 50.0 * 52 * 0.15

    # 2. Override active, car >= 100 -> public transit
    ass2 = create_base_assessment(weekly_car=150.0)
    res2, savings2 = CarbonTwinService.apply_transit_rule(ass2)
    assert res2.transportation.weekly_override.car == 0.0
    assert res2.transportation.weekly_override.public_transit == 150.0
    assert savings2 == 150.0 * 52 * 0.10

    # 3. Override inactive, car < 100 -> bicycle
    ass3 = create_base_assessment(weekly_car=0.0)
    ass3.transportation.weekly_override.is_active = False
    daily = DailyDistances(car=10.0, public_transit=0.0, bicycle=0.0, walking=0.0)
    ass3.transportation.current_week = WeekTracking(
        monday=daily, tuesday=daily, wednesday=daily, thursday=daily, friday=daily, saturday=daily, sunday=daily
    )
    res3, savings3 = CarbonTwinService.apply_transit_rule(ass3)
    assert res3.transportation.current_week.monday.car == 0.0
    assert res3.transportation.current_week.monday.bicycle == 10.0
    assert savings3 == 70.0 * 52 * 0.15

    # 4. Override inactive, car >= 100 -> transit
    ass4 = create_base_assessment(weekly_car=0.0)
    ass4.transportation.weekly_override.is_active = False
    daily_heavy = DailyDistances(car=20.0, public_transit=0.0, bicycle=0.0, walking=0.0)
    ass4.transportation.current_week = WeekTracking(
        monday=daily_heavy, tuesday=daily_heavy, wednesday=daily_heavy, thursday=daily_heavy, friday=daily_heavy, saturday=daily_heavy, sunday=daily_heavy
    )
    res4, savings4 = CarbonTwinService.apply_transit_rule(ass4)
    assert res4.transportation.current_week.monday.car == 0.0
    assert res4.transportation.current_week.monday.public_transit == 20.0
    assert savings4 == 140.0 * 52 * 0.10


def test_twin_service_apply_flights_rule():
    from app.schemas.assessment import FlightRecord, TripType
    # No flights
    ass_no = create_base_assessment()
    res_no, savings_no = CarbonTwinService.apply_flights_rule(ass_no)
    assert len(res_no.transportation.flight_records) == 0
    assert savings_no == 0.0

    # Some flights
    flights = [
        FlightRecord(date="2026-06-01", source_airport="JFK", destination_airport="LAX", trip_type=TripType.ONE_WAY, distance_km=4000.0, carbon_emissions_kg=500.0),
        FlightRecord(date="2026-06-02", source_airport="LAX", destination_airport="SFO", trip_type=TripType.ONE_WAY, distance_km=500.0, carbon_emissions_kg=100.0)
    ]
    ass = create_base_assessment(flight_records=flights)
    res, savings = CarbonTwinService.apply_flights_rule(ass)
    assert len(res.transportation.flight_records) == 1
    assert savings == 300.0


def test_twin_service_apply_energy_rule():
    # Bill > 0 and Solar NONE -> MEDIUM
    ass1 = create_base_assessment(electricity_bill=5000.0, solar_tier=SolarSetupTier.NONE)
    res1, savings1 = CarbonTwinService.apply_energy_rule(ass1)
    assert res1.home_energy.monthly_electricity_bill_inr == 4000.0
    assert res1.home_energy.solar_tier == SolarSetupTier.MEDIUM
    assert savings1 > 150.0

    # Solar LARGE -> remains LARGE
    ass2 = create_base_assessment(electricity_bill=0.0, solar_tier=SolarSetupTier.LARGE)
    res2, savings2 = CarbonTwinService.apply_energy_rule(ass2)
    assert res2.home_energy.solar_tier == SolarSetupTier.LARGE
    assert savings2 == 0.0


def test_twin_service_apply_diet_rule():
    from app.schemas.assessment import MealRecordSchema, FoodItemSchema, FoodCategory
    # 1. Has meat, plant protein item doesn't exist yet
    ass1 = create_base_assessment()
    ass1.food_habits.meals = [
        MealRecordSchema(
            id="meal1",
            meal_type="lunch",
            items=[
                FoodItemSchema(id="i1", name="Beef", category=FoodCategory.BEEF, portion_g=200.0)
            ]
        )
    ]
    res1, savings1 = CarbonTwinService.apply_diet_rule(ass1)
    assert res1.food_habits.meals[0].items[0].portion_g == 100.0
    assert res1.food_habits.meals[0].items[1].category == FoodCategory.PLANT_PROTEIN
    assert res1.food_habits.meals[0].items[1].portion_g == 100.0
    assert savings1 == 200.0

    # 2. Has meat, plant protein item already exists
    ass2 = create_base_assessment()
    ass2.food_habits.meals = [
        MealRecordSchema(
            id="meal1",
            meal_type="lunch",
            items=[
                FoodItemSchema(id="i1", name="Beef", category=FoodCategory.BEEF, portion_g=200.0),
                FoodItemSchema(id="i2", name="Tofu", category=FoodCategory.PLANT_PROTEIN, portion_g=50.0)
            ]
        )
    ]
    res2, savings2 = CarbonTwinService.apply_diet_rule(ass2)
    assert res2.food_habits.meals[0].items[0].portion_g == 100.0
    assert res2.food_habits.meals[0].items[1].portion_g == 150.0 # 50 + 100
    assert savings2 == 200.0

    # 3. No meat, diet type HIGH_MEAT -> MIXED
    ass3 = create_base_assessment()
    ass3.food_habits.diet_type = FoodHabit.HIGH_MEAT
    res3, savings3 = CarbonTwinService.apply_diet_rule(ass3)
    assert res3.food_habits.diet_type == FoodHabit.MIXED
    assert savings3 == 150.0

    # 4. No meat, diet type MIXED -> VEGETARIAN (resets to MIXED due to validation)
    ass4 = create_base_assessment()
    ass4.food_habits.diet_type = FoodHabit.MIXED
    res4, savings4 = CarbonTwinService.apply_diet_rule(ass4)
    assert res4.food_habits.diet_type == FoodHabit.MIXED
    assert savings4 == 250.0


def test_twin_service_apply_delivery_rule():
    ass = create_base_assessment(deliveries_week=4)
    ass.shopping.package_deliveries_per_week = 2
    ass.shopping.clothing_items.shirts = 10
    ass.shopping.clothing_items.pants = 10
    ass.shopping.clothing_items.outerwear = 10
    ass.shopping.clothing_items.shoes = 10

    res, savings = CarbonTwinService.apply_delivery_rule(ass)
    assert res.shopping.food_deliveries_per_week == 2
    assert res.shopping.package_deliveries_per_week == 1
    assert res.shopping.clothing_items.shirts == 8 # round(10 * 0.85) = 8
    assert savings > 0.0

