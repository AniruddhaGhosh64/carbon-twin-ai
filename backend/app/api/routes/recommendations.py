from fastapi import APIRouter, Header, Depends
from app.schemas.recommendations import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.repositories.assessment_repository import AssessmentRepository
from app.schemas.assessment import AssessmentCreateRequest, TransportationSchema, HomeEnergySchema, FoodHabitsSchema, ShoppingSchema
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/dashboard", tags=["Recommendations"], dependencies=[Depends(rate_limiter(60))])
assessment_repo = AssessmentRepository()

def get_latest_assessment_or_default(user_id: str) -> AssessmentCreateRequest:
    assessment_data = assessment_repo.get_latest_assessment(user_id)
    if not assessment_data:
        return AssessmentCreateRequest(
            transportation=TransportationSchema(
                commute_method="car",
                vehicle_type="gasoline",
                weekly_distance_km=250.0,
                annual_flights=2
            ),
            home_energy=HomeEnergySchema(
                monthly_electricity_kwh=450.0,
                ac_usage_hours_per_day=5.0,
                renewable_energy_percentage=10.0
            ),
            food_habits=FoodHabitsSchema(diet_type="mixed"),
            shopping=ShoppingSchema(
                monthly_purchases_usd=500.0,
                clothing_purchases_per_month=3,
                electronics_purchases_per_year=1
            )
        )
    return AssessmentCreateRequest(**assessment_data)

@router.post("/generate", response_model=RecommendationResponse)
def generate_recommendations(x_user_id: str = Header(default="default_user")):
    assessment = get_latest_assessment_or_default(x_user_id)
    highest_cat, recs = RecommendationService.generate_recommendations(assessment)
    
    from app.services.carbon_service import CarbonCalculationService
    footprint = CarbonCalculationService.calculate_footprint(assessment)
    breakdown = footprint["breakdown"]
    
    explanation = RecommendationService.generate_coaching_explanation(assessment, highest_cat, breakdown)
    
    return RecommendationResponse(
        highest_emission_category=highest_cat,
        recommendations=recs,
        explanation=explanation
    )

from app.schemas.recommendations import ToggleCommitmentRequest, CommitSimulationRequest
from app.repositories.commitments_repository import CommitmentsRepository

commitments_repo = CommitmentsRepository()

@router.get("/commitments", response_model=list[str])
def get_commitments(x_user_id: str = Header(default="default_user")):
    return commitments_repo.get_commitments(x_user_id)

@router.post("/commit")
def toggle_commitment(request: ToggleCommitmentRequest, x_user_id: str = Header(default="default_user")):
    commitments_repo.set_commitment(x_user_id, request.action_id, request.committed)
    return {"success": True, "action_id": request.action_id, "committed": request.committed}

@router.post("/commit_simulation")
def commit_simulation(request: CommitSimulationRequest, x_user_id: str = Header(default="default_user")):
    commitments_repo.set_commitment(x_user_id, "use_metro", request.use_metro or (request.reduce_driving_percentage > 10.0))
    commitments_repo.set_commitment(x_user_id, "carpool", request.carpool)
    commitments_repo.set_commitment(x_user_id, "cycle_weekly", request.cycle_days > 0 or (request.reduce_driving_percentage > 5.0))
    commitments_repo.set_commitment(x_user_id, "reduce_meat", request.reduce_meat or request.reduce_beef_percentage > 0 or request.diet_transition != "none")
    commitments_repo.set_commitment(x_user_id, "reduce_electricity", request.reduce_electricity > 0 or request.reduce_electricity_percentage > 0 or request.appliance_optimization)
    commitments_repo.set_commitment(x_user_id, "switch_renewables", request.reduce_electricity > 20 or request.solar_adoption)
    commitments_repo.set_commitment(x_user_id, "reduce_flights", request.flight_reduction_count > 0)
    commitments_repo.set_commitment(x_user_id, "reduce_delivery", request.reduce_deliveries_percentage > 0)
    return {"success": True}


