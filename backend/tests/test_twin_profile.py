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
    
    # Validate structure of a profile
    profile = data["current_profile"]
    assert "archetype" in profile
    assert isinstance(profile["strengths"], list)
    assert isinstance(profile["weaknesses"], list)
    assert isinstance(profile["risk_areas"], list)
    assert isinstance(profile["opportunity_areas"], list)
