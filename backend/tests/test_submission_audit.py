import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.assessment import (
    AssessmentCreateRequest, TransportationSchema, HomeEnergySchema,
    FoodHabitsSchema, ShoppingSchema, VehicleType, SolarSetupTier,
    FoodHabit, WeeklyOverride, DailyDistances, FlightRecord, TripType,
    ClothingItemsSchema, ElectronicsItemsSchema, LargePurchaseSchema,
    LargePurchaseCategory, MealRecordSchema, FoodItemSchema, FoodCategory,
    ApplianceItemSchema, ApplianceType, DistanceUnit
)
from app.schemas.simulator import SimulatorLevers
from app.services.carbon_service import CarbonCalculationService
from app.services.simulator_service import SimulatorService
from app.services.twin_service import CarbonTwinService
from app.schemas.twin import TwinState

client = TestClient(app)

def create_full_assessment(
    weekly_car=0.0, weekly_transit=0.0, flight_records=None,
    electricity_bill=1000.0, solar_tier=SolarSetupTier.NONE,
    deliveries_week=0, clothing_shirts=0, electronics_phones=0,
    meals=None, large_purchases=None, appliances=None,
    vehicle_type=VehicleType.GASOLINE, tracking_unit=DistanceUnit.KM
):
    if flight_records is None:
        flight_records = []
    if meals is None:
        meals = []
    if large_purchases is None:
        large_purchases = []
    if appliances is None:
        appliances = []
        
    return AssessmentCreateRequest(
        transportation=TransportationSchema(
            tracking_unit=tracking_unit,
            vehicle_type=vehicle_type,
            weekly_override=WeeklyOverride(
                is_active=True,
                car=weekly_car,
                public_transit=weekly_transit,
                bicycle=0.0,
                walking=0.0
            ),
            flight_records=flight_records
        ),
        home_energy=HomeEnergySchema(
            household_size=1,
            monthly_electricity_bill_inr=electricity_bill,
            solar_tier=solar_tier,
            appliances=appliances
        ),
        food_habits=FoodHabitsSchema(
            meals=meals
        ),
        shopping=ShoppingSchema(
            clothing_items=ClothingItemsSchema(shirts=clothing_shirts, pants=0, outerwear=0, shoes=0),
            electronics_items=ElectronicsItemsSchema(phones=electronics_phones, laptops=0, tvs=0, accessories=0),
            food_deliveries_per_week=deliveries_week,
            package_deliveries_per_week=0,
            large_purchases=large_purchases
        )
    )

# --- 1. AUTH TESTS ---

@patch("app.api.routes.auth.user_repo")
def test_register_input_validation_empty_email(mock_user_repo):
    # Attempting to register with empty email
    response = client.post("/api/v1/auth/register", json={
        "email": "",
        "password": "securepassword",
        "name": "Invalid Email User"
    })
    # Since email field validator checks length or Pydantic EmailStr, it fails
    assert response.status_code == 422 or response.status_code == 400

@patch("app.api.routes.auth.user_repo")
def test_register_input_validation_short_password(mock_user_repo):
    # Attempting to register with a 3-character password
    response = client.post("/api/v1/auth/register", json={
        "email": "valid@example.com",
        "password": "123",
        "name": "Short Password User"
    })
    # Validation error for min_length constraint
    assert response.status_code == 422 or response.status_code == 400

@patch("app.api.routes.auth.user_repo")
def test_login_invalid_user(mock_user_repo):
    # Mock user_repo to say user does not exist
    mock_user_repo.get_user_by_email.return_value = None
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "somepassword"
    })
    assert response.status_code == 404
    assert "No account found" in response.json()["detail"]


# --- 2. CARBON SCORE TESTS ---

def test_carbon_score_boundary_ultra_low():
    # Setup assessment producing total emissions < 2.0 tons
    assessment = create_full_assessment(electricity_bill=0.0, deliveries_week=0)
    # Mock food habits return low emissions
    assessment.food_habits.meals = [
        MealRecordSchema(id="m1", meal_type="lunch", items=[
            FoodItemSchema(id="f1", name="lettuce", portion_g=10.0, category=FoodCategory.VEGETABLES)
        ])
    ]
    res = CarbonCalculationService.calculate_footprint(assessment)
    assert res["carbon_score"] == 100

def test_carbon_score_boundary_ultra_high():
    # Setup assessment producing total emissions > 20.0 tons
    assessment = create_full_assessment(electricity_bill=50000.0)  # very high bill
    res = CarbonCalculationService.calculate_footprint(assessment)
    assert res["carbon_score"] == 0

def test_carbon_score_boundary_mid_range():
    # Target exactly 11.0 tons total emissions (11000 kg)
    # Score formula: 100 - ((total_tons - 2.0) / (20.0 - 2.0)) * 100
    # For 11.0 tons, score = 100 - (9 / 18) * 100 = 50.
    # Let's adjust assessment to get close to 11000 kg.
    # Energy: Net kWh * 12 * 0.4. If bill is 18333 INR, kwh is 2291.6, Net kwh * 12 * 0.4 = 11000 kg.
    assessment = create_full_assessment(electricity_bill=18333.3, vehicle_type=VehicleType.NONE)
    # Zero out food fallback
    assessment.food_habits.meals = [
        MealRecordSchema(id="m1", meal_type="lunch", items=[
            FoodItemSchema(id="f1", name="vegetable", portion_g=0.01, category=FoodCategory.VEGETABLES)
        ])
    ]
    res = CarbonCalculationService.calculate_footprint(assessment)
    assert res["carbon_score"] == 50


# --- 3. TRANSPORTATION TESTS ---

def test_transportation_emissions_gasoline():
    # Gasoline factor: 0.192. Commute: 100km car, 0km transit.
    # Emissions = (100 * 0.192) * 52 = 998.4 kg
    assessment = create_full_assessment(weekly_car=100.0, vehicle_type=VehicleType.GASOLINE)
    trans_emissions = CarbonCalculationService.calculate_transportation(assessment.transportation)
    assert abs(trans_emissions - 998.4) < 1e-3

def test_transportation_emissions_electric():
    # Electric factor: 0.053. Commute: 100km car, 0km transit.
    # Emissions = (100 * 0.053) * 52 = 275.6 kg
    assessment = create_full_assessment(weekly_car=100.0, vehicle_type=VehicleType.ELECTRIC)
    trans_emissions = CarbonCalculationService.calculate_transportation(assessment.transportation)
    assert abs(trans_emissions - 275.6) < 1e-3

def test_transportation_miles_to_km_conversion():
    # Unit: miles. Commute: 100 miles car, 0 transit. Gasoline factor: 0.192.
    # Dist in km = 100 * 1.60934 = 160.934 km
    # Emissions = (160.934 * 0.192) * 52 = 1606.764672 kg
    assessment = create_full_assessment(weekly_car=100.0, vehicle_type=VehicleType.GASOLINE, tracking_unit=DistanceUnit.MILES)
    trans_emissions = CarbonCalculationService.calculate_transportation(assessment.transportation)
    assert abs(trans_emissions - 1606.764672) < 1e-2


# --- 4. FOOD TESTS ---

def test_food_heavy_beef_diet():
    # Beef portion: 500g. Beef factor: 0.060.
    # Daily emissions = 500 * 0.060 = 30.0 kg CO2e
    # Annual emissions = 30.0 * 365 = 10950.0 kg CO2e
    meals = [
        MealRecordSchema(id="meal1", meal_type="dinner", items=[
            FoodItemSchema(id="item1", name="Beef Steak", portion_g=500.0, category=FoodCategory.BEEF)
        ])
    ]
    assessment = create_full_assessment(meals=meals)
    food_emissions = CarbonCalculationService.calculate_food(assessment.food_habits)
    assert food_emissions == 10950.0
    # Verify diet_type is HIGH_MEAT (since beef ratio > 25% of total weight)
    assert assessment.food_habits.diet_type == FoodHabit.HIGH_MEAT

def test_food_vegan_diet():
    # Plant protein portion: 200g (factor 0.002) + Vegetables: 300g (factor 0.001)
    # Daily = (200 * 0.002) + (300 * 0.001) = 0.4 + 0.3 = 0.7 kg
    # Annual = 0.7 * 365 = 255.5 kg
    meals = [
        MealRecordSchema(id="meal1", meal_type="dinner", items=[
            FoodItemSchema(id="item1", name="Tofu", portion_g=200.0, category=FoodCategory.PLANT_PROTEIN),
            FoodItemSchema(id="item2", name="Broccoli", portion_g=300.0, category=FoodCategory.VEGETABLES)
        ])
    ]
    assessment = create_full_assessment(meals=meals)
    food_emissions = CarbonCalculationService.calculate_food(assessment.food_habits)
    assert abs(food_emissions - 255.5) < 1e-3
    # Verify diet_type is VEGAN
    assert assessment.food_habits.diet_type == FoodHabit.VEGAN

def test_food_empty_meals_fallback():
    # No meals logged: should fallback to 2500.0 kg/year
    assessment = create_full_assessment(meals=[])
    food_emissions = CarbonCalculationService.calculate_food(assessment.food_habits)
    assert food_emissions == 2500.0


# --- 5. HOME ENERGY TESTS ---

def test_energy_household_size_division():
    # Electricity bill: 8000 INR. kwh = 8000 / 8 = 1000 kwh.
    # Annual = 1000 * 12 * 0.4 = 4800 kg.
    # For household_size = 4, emissions per capita = 4800 / 4 = 1200 kg.
    assessment = create_full_assessment(electricity_bill=8000.0)
    assessment.home_energy.household_size = 4
    energy_emissions = CarbonCalculationService.calculate_energy(assessment.home_energy)
    assert energy_emissions == 1200.0

def test_energy_bill_kwh_conversion():
    # Electricity bill: 4000 INR. bill_kwh = 4000 / 8 = 500 kwh.
    # Legacy monthly_electricity_kwh should match bill_kwh (no solar setup)
    assessment = create_full_assessment(electricity_bill=4000.0, solar_tier=SolarSetupTier.NONE)
    assert assessment.home_energy.monthly_electricity_kwh == 500.0

def test_energy_solar_large_offset():
    # Electricity bill: 4000 INR -> 500 kwh.
    # Large solar tier -> 10 kw capacity. solar_gen_kwh = 10 * 4.0 * 30 = 1200 kwh.
    # net_kwh = max(0.0, 500 - 1200) = 0.0. Annual emissions = 0.0.
    assessment = create_full_assessment(electricity_bill=4000.0, solar_tier=SolarSetupTier.LARGE)
    energy_emissions = CarbonCalculationService.calculate_energy(assessment.home_energy)
    assert energy_emissions == 0.0
    assert assessment.home_energy.renewable_energy_percentage == 100.0


# --- 6. SHOPPING TESTS ---

def test_shopping_clothing_item_weight():
    # Shirts (8.0), Pants (15.0), Outerwear (30.0), Shoes (20.0) * 12.0
    # clothing_shirts = 5 -> emissions = 5 * 8.0 * 12 = 480.0 kg CO2e
    assessment = create_full_assessment(clothing_shirts=5)
    shopping_emissions = CarbonCalculationService.calculate_shopping(assessment.shopping)
    assert shopping_emissions == 480.0

def test_shopping_delivery_frequency():
    # Food deliveries (1.5) + Package deliveries (2.2) * 52
    # deliveries_week = 5 -> emissions = 5 * 1.5 * 52 = 390.0 kg CO2e
    assessment = create_full_assessment(deliveries_week=5)
    shopping_emissions = CarbonCalculationService.calculate_shopping(assessment.shopping)
    assert shopping_emissions == 390.0

def test_shopping_large_purchase_scaling():
    # large purchase EV Vehicle (6000) + cost_usd * 0.1
    # Cost: 20000 USD -> 20000 * 0.1 = 2000.
    # Total large purchase emissions = 6000 + 2000 = 8000 kg.
    large_purchases = [
        LargePurchaseSchema(
            id="p1", item_name="Tesla", cost_usd=20000.0,
            purchase_date="2026-06-01", category=LargePurchaseCategory.EV_VEHICLE
        )
    ]
    assessment = create_full_assessment(large_purchases=large_purchases)
    shopping_emissions = CarbonCalculationService.calculate_shopping(assessment.shopping)
    assert shopping_emissions == 8000.0


# --- 7. SIMULATOR, ROUTING & RECOMMENDATIONS TESTS ---

def test_simulator_calculations():
    # Create simple assessment: Car commute 100km, gasoline. (998.4 kg)
    # Levers: metro shifting (reduces car commute to 0km).
    # Expected emissions after simulation: 0.0 ground emissions (metro shifted).
    # Since food is fallback (2500), other parts zero, baseline emissions ~3498.4.
    # Simulated emissions should reduce ground emissions.
    meals = [
        MealRecordSchema(id="m1", meal_type="lunch", items=[
            FoodItemSchema(id="f1", name="vegetable", portion_g=0.01, category=FoodCategory.VEGETABLES)
        ])
    ]
    assessment = create_full_assessment(weekly_car=100.0, vehicle_type=VehicleType.GASOLINE, electricity_bill=0.0, meals=meals)
    levers = SimulatorLevers(use_metro=True)
    
    sim_res = SimulatorService.simulate(assessment, levers)
    # Baseline emissions = (100 * 0.192)*52 + 0.00365 (food) = 998.4 + 0.0 = 998.4
    # Simulated emissions = (100 * 0.04)*52 (public transit factor is 0.04) + 0.0 = 208.0
    assert sim_res["simulated_emissions_kg"] < sim_res["base_emissions_kg"]
    assert abs(sim_res["simulated_emissions_kg"] - 208.0) < 1.0

@patch("app.api.routes.recommendations.assessment_repo")
def test_dashboard_recommendations_routing(mock_assessment_repo):
    # Setup mocks
    ass = create_full_assessment(weekly_car=100.0, electricity_bill=2000.0)
    mock_assessment_repo.get_latest_assessment.return_value = ass.model_dump()
    
    response = client.post("/api/v1/dashboard/generate", headers={"X-User-Id": "test_user"})
    
    assert response.status_code == 200
    data = response.json()
    assert "highest_emission_category" in data
    assert "recommendations" in data
    assert "explanation" in data
    assert isinstance(data["recommendations"], list)
