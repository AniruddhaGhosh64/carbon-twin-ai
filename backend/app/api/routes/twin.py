from fastapi import APIRouter, Header, HTTPException, Depends, Request
from typing import Optional
from app.schemas.assessment import (
    AssessmentCreateRequest, 
    TransportationSchema, 
    HomeEnergySchema, 
    FoodHabitsSchema, 
    ShoppingSchema,
    CommuteMethod,
    VehicleType,
    FoodHabit
)
from app.schemas.twin import CarbonTwinResponse, CarbonTwinRequest, ApplySimulationRequest, TwinConfigurationSnapshot, TwinState
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.twin_service import CarbonTwinService
from app.services.recommendation_service import RecommendationService
from app.services.simulator_service import SimulatorService
from app.repositories.twin_repository import TwinRepository
from app.repositories.assessment_repository import AssessmentRepository
from app.core.security import rate_limiter

router = APIRouter(prefix="/api/v1/carbontwin", tags=["Twin"], dependencies=[Depends(rate_limiter(60))])

twin_repo = TwinRepository()
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

@router.post("/generate", response_model=CarbonTwinResponse, dependencies=[Depends(rate_limiter(limit=10, timeframe=60))])
def generate_twin(request: Optional[CarbonTwinRequest] = None, x_user_id: str = Header(default="default_user")):
    assessment = get_latest_assessment_or_default(x_user_id)
    accepted_rules = request.accepted_rules if request else None
    
    # Intercept active commitments and automatically apply them
    from app.services.eco_service import EcoActionsService
    try:
        active_missions = EcoActionsService.get_all_missions(x_user_id)["active"]
        active_rule_ids = [m.action_id for m in active_missions]
        if accepted_rules is None:
            accepted_rules = active_rule_ids
        else:
            accepted_rules = list(set(accepted_rules + active_rule_ids))
    except Exception as e:
        print(f"Error intercepting active commitments: {e}")
        
    (
        current_state, future_state, potential_state,
        current_profile, future_profile, potential_profile,
        reduction_pct, savings, score_imp, rules, recs
    ) = CarbonTwinService.generate_twin(assessment, accepted_rules)
    
    from app.services.carbon_coach_service import CarbonCoachService
    narrative = CarbonCoachService.generate_narrative(
        user_id=x_user_id,
        current_state=current_state,
        future_state=future_state,
        reduction_pct=reduction_pct,
        savings=savings,
        rules=rules
    )
    
    twin_dict = {
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
    twin_repo.create_twin(x_user_id, twin_dict)
    
    return CarbonTwinResponse(
        current_state=current_state,
        future_state=future_state,
        potential_state=potential_state,
        current_profile=current_profile,
        future_profile=future_profile,
        potential_profile=potential_profile,
        reduction_percentage=reduction_pct,
        money_saved_usd=savings,
        carbon_score_improvement=score_imp,
        applied_rules=rules,
        recommendations=recs,
        narrative=narrative
    )

@router.get("/latest", response_model=CarbonTwinResponse)
def get_latest_twin(request: Request, regenerate: bool = False, x_user_id: str = Header(default="default_user")):
    if regenerate:
        rate_limiter(limit=10, timeframe=60)(request)
        return generate_twin(request=None, x_user_id=x_user_id)
        
    twin_data = twin_repo.get_latest_twin(x_user_id)
    if not twin_data:
        # If no twin exists, generate one from the latest assessment
        return generate_twin(request=None, x_user_id=x_user_id)
        
    # Recalculate and upgrade legacy records missing the new profile/potential fields
    if "potential_state" not in twin_data or "current_profile" not in twin_data:
        return generate_twin(request=None, x_user_id=x_user_id)
        
    recommendations = twin_data.get("recommendations")
    if not recommendations:
        # Generate them on-the-fly for historical records lacking this schema field
        assessment = get_latest_assessment_or_default(x_user_id)
        # Identify which rules were applied by matching names/titles
        applied = twin_data.get("applied_rules", [])
        # We can map titles back to rule IDs
        rule_mapping = {
            "Use Transit More Often": "transit",
            "Reduce Annual Flights": "reduce_flights",
            "Optimize Energy Usage": "optimize_energy",
            "Shift to Balanced Diet": "diet_shift",
            "Reduce Delivery Frequency": "reduce_delivery"
        }
        accepted_ids = [rule_mapping[a] for a in applied if a in rule_mapping]
        (
            _, _, _, _, _, _, _, _, _, _, recs
        ) = CarbonTwinService.generate_twin(assessment, accepted_ids)
        recommendations = recs
        
    return CarbonTwinResponse(
        current_state=twin_data["current_state"],
        future_state=twin_data["future_state"],
        potential_state=twin_data["potential_state"],
        current_profile=twin_data["current_profile"],
        future_profile=twin_data["future_profile"],
        potential_profile=twin_data["potential_profile"],
        reduction_percentage=twin_data["reduction_percentage"],
        money_saved_usd=twin_data["money_saved_usd"],
        carbon_score_improvement=twin_data["carbon_score_improvement"],
        applied_rules=twin_data["applied_rules"],
        recommendations=recommendations,
        narrative=twin_data["narrative"],
        configuration_snapshot=twin_data.get("configuration_snapshot")
    )

@router.post("/apply_simulation", response_model=CarbonTwinResponse, dependencies=[Depends(rate_limiter(limit=10, timeframe=60))])
def apply_simulation(request: ApplySimulationRequest, x_user_id: str = Header(default="default_user")):
    assessment = get_latest_assessment_or_default(x_user_id)
    
    results = SimulatorService.simulate(assessment, request.levers)
    
    current_state = TwinState(
        transportation_kg=results["base_breakdown"]["transportation"],
        energy_kg=results["base_breakdown"]["energy"],
        food_kg=results["base_breakdown"]["food"],
        shopping_kg=results["base_breakdown"]["shopping"],
        total_kg=results["base_emissions_kg"],
        carbon_score=results["base_carbon_score"]
    )
    
    future_state = TwinState(
        transportation_kg=results["simulated_breakdown"]["transportation"],
        energy_kg=results["simulated_breakdown"]["energy"],
        food_kg=results["simulated_breakdown"]["food"],
        shopping_kg=results["simulated_breakdown"]["shopping"],
        total_kg=results["simulated_emissions_kg"],
        carbon_score=results["simulated_carbon_score"]
    )
    
    accepted_rules = []
    if request.levers.use_metro or request.levers.cycle_days > 0 or request.levers.reduce_driving_percentage > 0:
        accepted_rules.append("transit")
    if request.levers.flight_reduction_count > 0:
        accepted_rules.append("reduce_flights")
    if request.levers.solar_adoption or request.levers.appliance_optimization or request.levers.reduce_electricity_percentage > 0:
        accepted_rules.append("optimize_energy")
    if request.levers.reduce_beef_percentage > 0 or request.levers.diet_transition != "none":
        accepted_rules.append("diet_shift")
    if request.levers.reduce_deliveries_percentage > 0 or request.levers.reduce_clothing_percentage > 0 or request.levers.reduce_electronics_percentage > 0:
        accepted_rules.append("reduce_delivery")
        
    (
        _, _, potential_state, current_profile, _, potential_profile, _, _, _, rules_strings, recs
    ) = CarbonTwinService.generate_twin(assessment, accepted_rules)

    # Calculate future profile under simulation using simulated assessment
    future_profile = CarbonTwinService.get_profile(future_state, results["simulated_assessment"])
    
    from app.services.carbon_coach_service import CarbonCoachService
    narrative = CarbonCoachService.generate_narrative(
        user_id=x_user_id,
        current_state=current_state,
        future_state=future_state,
        reduction_pct=results["reduction_percentage"],
        savings=results["money_saved_usd"],
        rules=rules_strings
    )
    
    import datetime
    timestamp_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    snapshot = TwinConfigurationSnapshot(
        timestamp=timestamp_str,
        scenario_name=request.scenario_name,
        assumptions=request.levers.model_dump(),
        horizon=request.horizon
    )
    
    twin_dict = {
        "current_state": current_state.model_dump(),
        "future_state": future_state.model_dump(),
        "potential_state": potential_state.model_dump(),
        "current_profile": current_profile.model_dump(),
        "future_profile": future_profile.model_dump(),
        "potential_profile": potential_profile.model_dump(),
        "reduction_percentage": results["reduction_percentage"],
        "money_saved_usd": results["money_saved_usd"],
        "carbon_score_improvement": results["simulated_carbon_score"] - results["base_carbon_score"],
        "applied_rules": rules_strings,
        "recommendations": [r.model_dump() for r in recs],
        "narrative": narrative if isinstance(narrative, str) else narrative.model_dump(),
        "configuration_snapshot": snapshot.model_dump()
    }
    
    twin_repo.create_twin(x_user_id, twin_dict)
    
    return CarbonTwinResponse(
        current_state=current_state,
        future_state=future_state,
        potential_state=potential_state,
        current_profile=current_profile,
        future_profile=future_profile,
        potential_profile=potential_profile,
        reduction_percentage=results["reduction_percentage"],
        money_saved_usd=results["money_saved_usd"],
        carbon_score_improvement=results["simulated_carbon_score"] - results["base_carbon_score"],
        applied_rules=rules_strings,
        recommendations=recs,
        narrative=narrative,
        configuration_snapshot=snapshot
    )

@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(rate_limiter(limit=10, timeframe=60))])
def coach_chat(request: ChatRequest, x_user_id: str = Header(default="default_user")):
    from app.services.carbon_coach_service import CarbonCoachService
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
    ai_response = CarbonCoachService.chat(
        user_id=x_user_id,
        message=request.message,
        history=history_dicts
    )
    return ChatResponse(response=ai_response)

