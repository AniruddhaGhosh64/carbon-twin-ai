from fastapi import APIRouter, Header, HTTPException, Depends
from app.schemas.simulator import SimulatorRequest, SimulatorResponse, ScenarioSaveRequest
from app.services.simulator_service import SimulatorService
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.simulator_repository import SimulatorRepository
from app.schemas.assessment import (
    AssessmentCreateRequest, TransportationSchema, HomeEnergySchema, 
    FoodHabitsSchema, ShoppingSchema, CommuteMethod, VehicleType, FoodHabit
)
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/simulator", tags=["Simulator"], dependencies=[Depends(rate_limiter(60))])
assessment_repo = AssessmentRepository()
simulator_repo = SimulatorRepository()

def get_latest_assessment_or_default(user_id: str) -> AssessmentCreateRequest:
    assessment_data = assessment_repo.get_latest_assessment(user_id)
    if not assessment_data:
        # Return a sensible default assessment if the user hasn't completed one yet
        return AssessmentCreateRequest(
            transportation=TransportationSchema(
                commute_method=CommuteMethod.CAR,
                vehicle_type=VehicleType.GASOLINE,
                weekly_distance_km=250.0,
                annual_flights=2
            ),
            home_energy=HomeEnergySchema(
                monthly_electricity_kwh=450.0,
                ac_usage_hours_per_day=5.0,
                renewable_energy_percentage=10.0
            ),
            food_habits=FoodHabitsSchema(diet_type=FoodHabit.MIXED),
            shopping=ShoppingSchema(
                monthly_purchases_usd=500.0,
                clothing_purchases_per_month=3,
                electronics_purchases_per_year=1
            )
        )
    # Parse dict to model
    return AssessmentCreateRequest(**assessment_data)

@router.post("/calculate", response_model=SimulatorResponse)
def calculate_simulation(request: SimulatorRequest, x_user_id: str = Header(default="default_user")):
    assessment = get_latest_assessment_or_default(x_user_id)
    results = SimulatorService.simulate(assessment, request.levers)
    
    return SimulatorResponse(
        user_id=x_user_id,
        **results
    )

@router.post("/scenario", response_model=SimulatorResponse)
def save_scenario(request: ScenarioSaveRequest, x_user_id: str = Header(default="default_user")):
    # Enforce scenario limit
    existing = simulator_repo.list_scenarios(x_user_id)
    if len(existing) >= 5:
        raise HTTPException(status_code=400, detail="MAX_SCENARIOS_EXCEEDED")

    assessment = get_latest_assessment_or_default(x_user_id)
    results = SimulatorService.simulate(assessment, request.levers)
    
    scenario_doc = {
        "name": request.name,
        "levers": request.levers.model_dump(),
        **results
    }
    saved_doc = simulator_repo.create_scenario(x_user_id, scenario_doc)
    
    return SimulatorResponse(
        id=saved_doc["id"],
        user_id=saved_doc["user_id"],
        base_emissions_kg=saved_doc["base_emissions_kg"],
        simulated_emissions_kg=saved_doc["simulated_emissions_kg"],
        reduction_percentage=saved_doc["reduction_percentage"],
        base_carbon_score=saved_doc.get("base_carbon_score", 0),
        simulated_carbon_score=saved_doc.get("simulated_carbon_score", 0),
        money_saved_usd=saved_doc["money_saved_usd"],
        money_spent_usd=saved_doc.get("money_spent_usd", 0.0),
        roi_percentage=saved_doc.get("roi_percentage", 0.0),
        break_even_years=saved_doc.get("break_even_years", 0.0),
        trees_equivalent=saved_doc["trees_equivalent"],
        emissions_projection=saved_doc["emissions_projection"],
        savings_projection=saved_doc["savings_projection"],
        saved_at=saved_doc["saved_at"]
    )

@router.get("/scenarios", response_model=list[SimulatorResponse])
def list_scenarios(x_user_id: str = Header(default="default_user")):
    scenarios = simulator_repo.list_scenarios(x_user_id)
    return [
        SimulatorResponse(
            id=s["id"],
            user_id=s["user_id"],
            base_emissions_kg=s["base_emissions_kg"],
            simulated_emissions_kg=s["simulated_emissions_kg"],
            reduction_percentage=s["reduction_percentage"],
            base_carbon_score=s.get("base_carbon_score", 0),
            simulated_carbon_score=s.get("simulated_carbon_score", 0),
            money_saved_usd=s["money_saved_usd"],
            money_spent_usd=s.get("money_spent_usd", 0.0),
            roi_percentage=s.get("roi_percentage", 0.0),
            break_even_years=s.get("break_even_years", 0.0),
            trees_equivalent=s["trees_equivalent"],
            emissions_projection=s["emissions_projection"],
            savings_projection=s["savings_projection"],
            saved_at=s["saved_at"]
        ) for s in scenarios
    ]

@router.delete("/scenario/{scenario_id}")
def delete_scenario(scenario_id: str, x_user_id: str = Header(default="default_user")):
    deleted = simulator_repo.delete_scenario(x_user_id, scenario_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scenario not found or not owned by user")
    return {"success": True, "message": "Scenario deleted successfully"}
