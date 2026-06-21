from fastapi import APIRouter, Header, Depends
from app.schemas.recommendations import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.repositories.assessment_repository import AssessmentRepository
from app.schemas.assessment import (
    AssessmentCreateRequest, TransportationSchema, HomeEnergySchema, 
    FoodHabitsSchema, ShoppingSchema, CommuteMethod, VehicleType, FoodHabit
)
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/dashboard", tags=["Recommendations"], dependencies=[Depends(rate_limiter(60))])
assessment_repo = AssessmentRepository()

def get_latest_assessment_or_default(user_id: str) -> AssessmentCreateRequest:
    assessment_data = assessment_repo.get_latest_assessment(user_id)
    if not assessment_data:
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

@router.get("/overview")
def get_dashboard_overview(x_user_id: str = Header(default="default_user")):
    from app.repositories.carbon_repository import CarbonRepository
    from app.repositories.twin_repository import TwinRepository
    from app.repositories.progress_repository import ProgressRepository
    from app.services.carbon_service import CarbonCalculationService
    from app.services.progress_service import ProgressService
    from app.services.twin_service import CarbonTwinService
    from app.services.eco_service import EcoActionsService

    carbon_repo = CarbonRepository()
    twin_repo = TwinRepository()
    progress_repo = ProgressRepository()

    # 1. Fetch latest calculation & assessment
    assessment_data = assessment_repo.get_latest_assessment(x_user_id)
    calc_data = carbon_repo.get_latest_calculation(x_user_id)

    # 2. Recommendations
    recs_data = None
    if assessment_data:
        assessment_obj = AssessmentCreateRequest(**assessment_data)
        highest_cat, recs = RecommendationService.generate_recommendations(assessment_obj)
        footprint = CarbonCalculationService.calculate_footprint(assessment_obj)
        explanation = RecommendationService.generate_coaching_explanation(assessment_obj, highest_cat, footprint["breakdown"])
        recs_data = {
            "highest_emission_category": highest_cat,
            "recommendations": [r.model_dump() for r in recs],
            "explanation": explanation
        }

    # 3. Carbon Twin
    twin_data = twin_repo.get_latest_twin(x_user_id)
    if not twin_data and assessment_data:
        try:
            active_missions = EcoActionsService.get_all_missions(x_user_id)["active"]
            active_rule_ids = [m.action_id for m in active_missions]
        except Exception:
            active_rule_ids = []
        (
            current_state, future_state, potential_state,
            current_profile, future_profile, potential_profile,
            reduction_pct, savings, score_imp, rules, recs
        ) = CarbonTwinService.generate_twin(AssessmentCreateRequest(**assessment_data), active_rule_ids)

        from app.services.carbon_coach_service import CarbonCoachService
        narrative = CarbonCoachService.generate_narrative(
            user_id=x_user_id,
            current_state=current_state,
            future_state=future_state,
            reduction_pct=reduction_pct,
            savings=savings,
            rules=rules
        )
        twin_data = {
            "current_state": current_state.model_dump(),
            "future_state": future_state.model_dump(),
            "potential_state": potential_state.model_dump(),
            "current_profile": current_profile.model_dump(),
            "future_profile": future_profile.model_dump(),
            "potential_profile": potential_profile.model_dump(),
            "reduction_percentage": reduction_pct,
            "money_saved_usd": savings,
            "carbon_score_improvement": score_imp,
            "applied_rules": rules,
            "recommendations": [r.model_dump() for r in recs],
            "narrative": narrative if isinstance(narrative, str) else narrative.model_dump()
        }
        twin_repo.create_twin(x_user_id, twin_data)

    # 4. Progress history & stats
    progress_history = progress_repo.get_history(x_user_id)
    if not progress_history:
        import datetime
        today = datetime.date.today().isoformat()
        default_entry = progress_repo.add_history_entry(x_user_id, today, 70, 4500.0)
        progress_history = [default_entry]

    progress_overview = None
    progress_performance = None
    progress_achievements = None
    try:
        progress_overview = ProgressService.get_progress_overview(x_user_id)
        categories = ProgressService.get_category_performance(x_user_id)
        actions = ProgressService.get_action_performance(x_user_id)
        progress_performance = {
            "categories": categories,
            "actions": [a.model_dump() for a in actions]
        }
        progress_achievements = ProgressService.get_achievements(x_user_id)
    except Exception as e:
        print(f"Failed to fetch progress overview components: {e}")

    return {
        "assessment": assessment_data,
        "carbonData": calc_data,
        "recommendationData": recs_data,
        "twinData": twin_data,
        "progress": {
            "history": progress_history,
            "overview": progress_overview.model_dump() if progress_overview else None,
            "performance": progress_performance,
            "achievements": progress_achievements.model_dump() if progress_achievements else None
        }
    }

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


