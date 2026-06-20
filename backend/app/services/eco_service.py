from typing import List, Dict, Any, Optional
from datetime import datetime, date, timezone
from app.repositories.commitments_repository import CommitmentsRepository
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.carbon_repository import CarbonRepository
from app.repositories.progress_repository import ProgressRepository
from app.repositories.simulator_repository import SimulatorRepository
from app.schemas.assessment import (
    AssessmentCreateRequest, 
    SolarSetupTier, 
    FoodHabit, 
    VehicleType, 
    FoodCategory, 
    FoodItemSchema
)
from app.schemas.eco_actions import EcoMission, MissionConfig, MissionCheckIn
from app.services.carbon_service import CarbonCalculationService
from app.services.recommendation_service import RecommendationService
from app.services.twin_service import CarbonTwinService
from app.services.simulator_service import SimulatorService
from copy import deepcopy

commitments_repo = CommitmentsRepository()
assessment_repo = AssessmentRepository()
carbon_repo = CarbonRepository()
progress_repo = ProgressRepository()
simulator_repo = SimulatorRepository()

class EcoActionsService:
    @staticmethod
    def get_latest_assessment_or_default(user_id: str) -> AssessmentCreateRequest:
        assessment_data = assessment_repo.get_latest_assessment(user_id)
        if not assessment_data:
            from app.schemas.assessment import TransportationSchema, HomeEnergySchema, FoodHabitsSchema, ShoppingSchema
            return AssessmentCreateRequest(
                transportation=TransportationSchema(
                    vehicle_type=VehicleType.GASOLINE,
                    weekly_distance_km=250.0,
                    annual_flights=2
                ),
                home_energy=HomeEnergySchema(
                    monthly_electricity_bill_inr=3600.0,  # 3600 / 8 = 450 kWh
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
        return AssessmentCreateRequest(**assessment_data)

    @classmethod
    def get_missions_dashboard(cls, user_id: str) -> List[EcoMission]:
        assessment = cls.get_latest_assessment_or_default(user_id)
        _, recs = RecommendationService.generate_recommendations(assessment)
        missions = []
        for r in recs:
            # Map effort level based on difficulty/impact
            effort = "moderate"
            if r.difficulty.lower() == "easy":
                effort = "low"
            elif r.difficulty.lower() == "hard" or r.impact_level.lower() == "high":
                effort = "high"
            
            # success probability logic
            prob = 85.0
            if r.id == "use_metro":
                prob = 75.0 if assessment.transportation.weekly_distance_km < 150 else 60.0
            elif r.id == "cycle_weekly":
                prob = 80.0
            elif r.id == "reduce_meat":
                prob = 50.0 if assessment.food_habits.diet_type == FoodHabit.HIGH_MEAT else 75.0

            missions.append(EcoMission(
                id=f"dashboard_{r.id}",
                user_id=user_id,
                action_id=r.id,
                title=r.action_title,
                description=r.description,
                source="dashboard",
                status="suggested",
                carbon_reduction_kg=float(r.description.split("saving you ")[1].split(" ")[0]) if "saving you " in r.description else (r.description.split("emissions by ")[1].split(" ")[0] if "emissions by " in r.description else "300").replace("kg", "").strip().split(" ")[0].split(".")[0].split(",")[0] if any(x in r.description for x in ["saving you ", "emissions by "]) else 300.0,
                money_saved_usd=r.estimated_savings_usd,
                effort_level=effort,
                success_probability=prob
            ))
            # Clean up carbon reduction parse issues if any
            try:
                missions[-1].carbon_reduction_kg = float(missions[-1].carbon_reduction_kg)
            except Exception:
                missions[-1].carbon_reduction_kg = 250.0
        return missions

    @classmethod
    def get_missions_twin(cls, user_id: str) -> List[EcoMission]:
        assessment = cls.get_latest_assessment_or_default(user_id)
        (
            _, _, _, _, _, _, _, _, _, _, items
        ) = CarbonTwinService.generate_twin(assessment, [])
        missions = []
        for item in items:
            if item.emissions_reduction_kg <= 0:
                continue
            
            effort = "moderate"
            if item.id == "transit":
                effort = "moderate"
            elif item.id == "reduce_flights":
                effort = "high"
            elif item.id == "optimize_energy":
                effort = "transformational" if item.emissions_reduction_kg > 400 else "high"
            elif item.id == "diet_shift":
                effort = "moderate"
            elif item.id == "reduce_delivery":
                effort = "low"

            missions.append(EcoMission(
                id=f"twin_{item.id}",
                user_id=user_id,
                action_id=item.id,
                title=item.title,
                description=item.description,
                source="twin",
                status="suggested",
                carbon_reduction_kg=item.emissions_reduction_kg,
                money_saved_usd=item.money_saved_usd,
                effort_level=effort,
                success_probability=float(item.confidence_percentage) if item.confidence_percentage > 0 else 75.0
            ))
        return missions

    @classmethod
    def get_missions_simulator(cls, user_id: str) -> List[EcoMission]:
        scenarios = simulator_repo.list_scenarios(user_id)
        missions = []
        for s in scenarios:
            levers = s.get("levers", {})
            scenario_id = s.get("id", "scenario")
            scenario_name = s.get("name", "Simulation")
            
            # Map active simulator levers to potential suggested missions
            if levers.get("use_metro"):
                missions.append(EcoMission(
                    id=f"simulator_{scenario_id}_use_metro",
                    user_id=user_id,
                    action_id="transit",
                    title=f"Transit Commute ({scenario_name})",
                    description="Switch commute to public metro/transit based on your saved simulation.",
                    source="simulator",
                    status="suggested",
                    carbon_reduction_kg=s.get("base_emissions_kg", 5000) * 0.15,
                    money_saved_usd=s.get("money_saved_usd", 150) * 0.3,
                    effort_level="moderate",
                    success_probability=85.0
                ))
            if levers.get("solar_adoption"):
                missions.append(EcoMission(
                    id=f"simulator_{scenario_id}_solar_adoption",
                    user_id=user_id,
                    action_id="optimize_energy",
                    title=f"Solar Installation ({scenario_name})",
                    description="Install solar panels as simulated in your saved scenario.",
                    source="simulator",
                    status="suggested",
                    carbon_reduction_kg=s.get("base_emissions_kg", 5000) * 0.25,
                    money_saved_usd=s.get("money_saved_usd", 150) * 0.4,
                    effort_level="transformational",
                    success_probability=70.0
                ))
            if levers.get("reduce_meat") or levers.get("diet_transition") != "none":
                missions.append(EcoMission(
                    id=f"simulator_{scenario_id}_diet_transition",
                    user_id=user_id,
                    action_id="diet_shift",
                    title=f"Dietary Shift ({scenario_name})",
                    description=f"Transition food intake as simulated in scenario: {scenario_name}.",
                    source="simulator",
                    status="suggested",
                    carbon_reduction_kg=s.get("base_emissions_kg", 5000) * 0.12,
                    money_saved_usd=s.get("money_saved_usd", 150) * 0.2,
                    effort_level="moderate",
                    success_probability=65.0
                ))
        return missions

    @classmethod
    def get_missions_coach(cls, user_id: str) -> List[EcoMission]:
        # Generate custom coach suggestions using the coach explanation analysis
        assessment = cls.get_latest_assessment_or_default(user_id)
        highest_cat, _ = RecommendationService.generate_recommendations(assessment)
        
        # Avoid hardcoding by deriving it from the highest emission category
        if highest_cat == "transportation":
            return [
                EcoMission(
                    id="coach_commute_reduction",
                    user_id=user_id,
                    action_id="transit",
                    title="Coach Commute Challenge",
                    description="Carbon Coach recommends focusing on transportation: Switch 3 days of commute to public transit.",
                    source="coach",
                    status="suggested",
                    carbon_reduction_kg=450.0,
                    money_saved_usd=90.0,
                    effort_level="moderate",
                    success_probability=80.0
                )
            ]
        elif highest_cat == "energy":
            return [
                EcoMission(
                    id="coach_vampire_draw",
                    user_id=user_id,
                    action_id="optimize_energy",
                    title="Unplug Standby Devices",
                    description="Carbon Coach recommends focusing on energy: Eliminate standby power consumption from major appliances.",
                    source="coach",
                    status="suggested",
                    carbon_reduction_kg=120.0,
                    money_saved_usd=30.0,
                    effort_level="low",
                    success_probability=95.0
                )
            ]
        elif highest_cat == "food":
            return [
                EcoMission(
                    id="coach_meatless_mondays",
                    user_id=user_id,
                    action_id="diet_shift",
                    title="Meatless Mondays",
                    description="Carbon Coach recommends focusing on food: Shift to 100% plant-based diet at least one day per week.",
                    source="coach",
                    status="suggested",
                    carbon_reduction_kg=150.0,
                    money_saved_usd=40.0,
                    effort_level="low",
                    success_probability=85.0
                )
            ]
        else:
            return [
                EcoMission(
                    id="coach_delivery_batching",
                    user_id=user_id,
                    action_id="reduce_delivery",
                    title="Batch Deliveries",
                    description="Carbon Coach recommends focusing on shopping: Batch food and retail shipments to twice per week.",
                    source="coach",
                    status="suggested",
                    carbon_reduction_kg=80.0,
                    money_saved_usd=25.0,
                    effort_level="low",
                    success_probability=90.0
                )
            ]

    @classmethod
    def get_all_missions(cls, user_id: str) -> Dict[str, List[EcoMission]]:
        # Retrieve stateful saved missions from Firestore
        saved_missions = commitments_repo.get_missions(user_id)
        
        active = []
        completed = []
        archived = []
        
        # Track IDs of stateful missions so we don't duplicate them in suggestions
        stateful_action_ids = set()
        stateful_ids = set()
        
        for m_dict in saved_missions:
            mission = EcoMission(**m_dict)
            stateful_action_ids.add(mission.action_id)
            stateful_ids.add(mission.id)
            
            # Check auto-verification for active missions dynamically
            if mission.status == "active":
                verified = cls.verify_mission_auto(user_id, mission)
                if verified and not any(ck.verified_auto for ck in mission.check_ins):
                    # Add automatic verification check-in
                    today_str = date.today().isoformat()
                    mission.check_ins.append(MissionCheckIn(
                        date=today_str,
                        status="completed",
                        verified_auto=True
                    ))
                    # Save updated check-ins
                    commitments_repo.save_mission(user_id, mission.model_dump())
                active.append(mission)
            elif mission.status == "completed":
                completed.append(mission)
            elif mission.status == "archived":
                archived.append(mission)

        # Generate Suggested templates
        suggested_raw = []
        suggested_raw.extend(cls.get_missions_dashboard(user_id))
        suggested_raw.extend(cls.get_missions_twin(user_id))
        suggested_raw.extend(cls.get_missions_simulator(user_id))
        suggested_raw.extend(cls.get_missions_coach(user_id))
        
        # Filter suggested: remove duplicates and anything already active/completed/archived
        suggested = []
        seen_action_ids = set()
        for m in suggested_raw:
            if m.action_id in stateful_action_ids or m.id in stateful_ids:
                continue
            if m.action_id in seen_action_ids:
                continue
            seen_action_ids.add(m.action_id)
            suggested.append(m)
            
        return {
            "suggested": suggested,
            "active": active,
            "completed": completed,
            "archived": archived
        }

    @classmethod
    def commit_mission(cls, user_id: str, action_id: str, source: str, config: MissionConfig) -> EcoMission:
        # Check active limit
        all_m = cls.get_all_missions(user_id)
        if len(all_m["active"]) >= 10:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="ACTIVE_LIMIT_EXCEEDED")
            
        # Find recommendation to build template
        suggested_list = []
        if source == "dashboard":
            suggested_list = cls.get_missions_dashboard(user_id)
        elif source == "twin":
            suggested_list = cls.get_missions_twin(user_id)
        elif source == "simulator":
            suggested_list = cls.get_missions_simulator(user_id)
        elif source == "coach":
            suggested_list = cls.get_missions_coach(user_id)
            
        target = next((m for m in suggested_list if m.action_id == action_id), None)
        if not target:
            # Fallback fallback
            target = EcoMission(
                id=f"{source}_{action_id}",
                user_id=user_id,
                action_id=action_id,
                title=action_id.replace("_", " ").title(),
                description=f"Action committed from {source}.",
                source=source,
                status="active",
                carbon_reduction_kg=200.0,
                money_saved_usd=50.0,
                effort_level="moderate",
                success_probability=80.0
            )
            
        target.status = "active"
        target.config = config
        
        # Check auto-verification immediately
        verified = cls.verify_mission_auto(user_id, target)
        if verified:
            today_str = date.today().isoformat()
            target.check_ins.append(MissionCheckIn(
                date=today_str,
                status="completed",
                verified_auto=True
            ))

        commitments_repo.save_mission(user_id, target.model_dump())
        
        # Backward compatibility for legacy commitment system
        commitments_repo.set_commitment(user_id, action_id, True)
        
        return target

    @classmethod
    def create_custom_mission(cls, user_id: str, title: str, description: str, carbon_reduction_kg: float, money_saved_usd: float, effort_level: str, config: MissionConfig) -> EcoMission:
        all_m = cls.get_all_missions(user_id)
        if len(all_m["active"]) >= 10:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="ACTIVE_LIMIT_EXCEEDED")

        mission_id = f"custom_{datetime.now(timezone.utc).timestamp()}"
        
        custom_mission = EcoMission(
            id=mission_id,
            user_id=user_id,
            action_id=mission_id,
            title=title,
            description=description,
            source="manual",
            status="active",
            carbon_reduction_kg=carbon_reduction_kg,
            money_saved_usd=money_saved_usd,
            effort_level=effort_level,
            success_probability=90.0,
            config=config
        )
        
        commitments_repo.save_mission(user_id, custom_mission.model_dump())
        return custom_mission

    @classmethod
    def check_in_mission(cls, user_id: str, mission_id: str, check_in: MissionCheckIn) -> EcoMission:
        m_dict = commitments_repo.get_mission(user_id, mission_id)
        if not m_dict:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Mission not found")
            
        mission = EcoMission(**m_dict)
        # Remove any existing check-in for the same date to avoid duplicates
        mission.check_ins = [c for c in mission.check_ins if c.date != check_in.date]
        mission.check_ins.append(check_in)
        
        commitments_repo.save_mission(user_id, mission.model_dump())
        return mission

    @classmethod
    def cancel_mission(cls, user_id: str, mission_id: str) -> dict:
        m_dict = commitments_repo.get_mission(user_id, mission_id)
        if not m_dict:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Mission not found")
            
        mission = EcoMission(**m_dict)
        if mission.source == "manual":
            # Manual custom missions are deleted entirely upon cancellation
            commitments_repo.delete_mission(user_id, mission_id)
        else:
            mission.status = "suggested"
            mission.config = None
            mission.check_ins = []
            commitments_repo.save_mission(user_id, mission.model_dump())
            
        # Backward compatibility legacy sync
        commitments_repo.set_commitment(user_id, mission.action_id, False)
        
        return {"success": True}

    @classmethod
    def complete_mission(cls, user_id: str, mission_id: str) -> EcoMission:
        m_dict = commitments_repo.get_mission(user_id, mission_id)
        if not m_dict:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Mission not found")
            
        mission = EcoMission(**m_dict)
        mission.status = "completed"
        commitments_repo.save_mission(user_id, mission.model_dump())
        
        # Apply permanent side-effects
        # 1. Modify user's base assessment permanently to apply the completed mission's offset
        cls.apply_permanent_footprint_reduction(user_id, mission)
        
        return mission

    @classmethod
    def apply_permanent_footprint_reduction(cls, user_id: str, mission: EcoMission):
        assessment = cls.get_latest_assessment_or_default(user_id)
        modified_assessment = deepcopy(assessment)
        
        action = mission.action_id
        
        # 1. Transportation Metro Switching / Driving reduction
        if action in ["use_metro", "transit"]:
            modified_assessment.transportation.weekly_override.is_active = True
            # Zero out gasoline commute, shift it to public transit
            car_dist = 0.0
            if assessment.transportation.weekly_override.is_active:
                car_dist = assessment.transportation.weekly_override.car
                modified_assessment.transportation.weekly_override.car = 0.0
                modified_assessment.transportation.weekly_override.public_transit += car_dist
            else:
                for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                    daily = getattr(assessment.transportation.current_week, day)
                    car_dist += daily.car
                modified_assessment.transportation.weekly_override.car = 0.0
                modified_assessment.transportation.weekly_override.public_transit += car_dist
            modified_assessment.transportation.vehicle_type = VehicleType.NONE
            
        # 2. Cycling Commute
        elif action in ["cycle_weekly", "carpool"]:
            modified_assessment.transportation.weekly_override.is_active = True
            car_dist = 0.0
            if assessment.transportation.weekly_override.is_active:
                car_dist = assessment.transportation.weekly_override.car
            else:
                for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                    car_dist += getattr(assessment.transportation.current_week, day).car
            
            if action == "cycle_weekly":
                # Shift 2/7 of commute to cycling
                modified_assessment.transportation.weekly_override.car = car_dist * (5/7.0)
                modified_assessment.transportation.weekly_override.bicycle += car_dist * (2/7.0)
            else:
                # Carpool cuts driving by 50%
                modified_assessment.transportation.weekly_override.car = car_dist * 0.5
                
        # 3. Flights Reduction
        elif action in ["reduce_flights"]:
            if modified_assessment.transportation.flight_records:
                # Cut flights in half
                kept = (len(modified_assessment.transportation.flight_records) + 1) // 2
                modified_assessment.transportation.flight_records = modified_assessment.transportation.flight_records[:kept]
                
        # 4. Energy Solar Adoption
        elif action in ["solar", "switch_renewables", "optimize_energy"]:
            if action in ["solar", "switch_renewables"]:
                modified_assessment.home_energy.solar_tier = SolarSetupTier.MEDIUM
            else:
                # Optimize appliances
                for app in modified_assessment.home_energy.appliances:
                    app.daily_usage_hours *= 0.8
                modified_assessment.home_energy.monthly_electricity_bill_inr *= 0.8
                
        # 5. Diet Shift
        elif action in ["reduce_meat", "diet_shift"]:
            modified_assessment.food_habits.diet_type = FoodHabit.VEGETARIAN
            # Zero out beef / animal portions in meal logs
            for meal in modified_assessment.food_habits.meals:
                new_items = []
                meat_portion = 0.0
                for item in meal.items:
                    if item.category in [FoodCategory.BEEF, FoodCategory.POULTRY, FoodCategory.FISH] if 'FoodCategory' in globals() else ['beef', 'poultry', 'fish']:
                        meat_portion += item.portion_g
                    else:
                        new_items.append(item)
                # Add plant alternative
                if meat_portion > 0:
                    from app.schemas.assessment import FoodItemSchema, FoodCategory
                    new_items.append(FoodItemSchema(
                        id=f"{meal.id}_plant_prot_comp",
                        name="Plant Protein Alternative",
                        portion_g=meat_portion,
                        category=FoodCategory.PLANT_PROTEIN
                    ))
                meal.items = new_items

        # 6. Discretionary Delivery reductions
        elif action in ["reduce_delivery"]:
            modified_assessment.shopping.food_deliveries_per_week = max(0, assessment.shopping.food_deliveries_per_week - 2)
            modified_assessment.shopping.package_deliveries_per_week = max(0, assessment.shopping.package_deliveries_per_week - 1)
            
        # Recompute legacy fields
        modified_assessment.transportation.compute_legacy_fields()
        modified_assessment.home_energy.compute_legacy_fields()
        modified_assessment.food_habits.compute_legacy_fields()
        modified_assessment.shopping.compute_legacy_fields()
        
        # Save assessment and calculate footprint
        saved_ass = assessment_repo.create_assessment(user_id, modified_assessment.model_dump())
        calc_result = CarbonCalculationService.calculate_footprint(modified_assessment)
        
        # Save calculation
        calc_dict = {
            "total_kg": calc_result["total_kg"],
            "total_tons": calc_result["total_tons"],
            "carbon_score": calc_result["carbon_score"],
            "breakdown": calc_result["breakdown"]
        }
        carbon_repo.create_calculation(user_id, saved_ass["id"], calc_dict)
        
        # Append progress snapshot log
        today = date.today().isoformat()
        progress_repo.add_history_entry(
            user_id=user_id,
            date=today,
            score=calc_result["carbon_score"],
            emissions_kg=calc_result["total_kg"]
        )

    @classmethod
    def verify_mission_auto(cls, user_id: str, mission: EcoMission) -> bool:
        """Runs automatic verification hooks against the latest footprint assessment."""
        assessment = cls.get_latest_assessment_or_default(user_id)
        action = mission.action_id
        
        # Transit rules
        if action in ["use_metro", "transit"]:
            override = assessment.transportation.weekly_override
            current = assessment.transportation.current_week
            transit_dist = override.public_transit if override.is_active else sum(
                getattr(current, day).public_transit for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            )
            return transit_dist > 0.0
            
        # Cycle rules
        if action == "cycle_weekly":
            override = assessment.transportation.weekly_override
            current = assessment.transportation.current_week
            bike_dist = override.bicycle if override.is_active else sum(
                getattr(current, day).bicycle for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            )
            return bike_dist > 0.0
            
        # Flights rule
        if action == "reduce_flights":
            # Checked if flights records are low
            return len(assessment.transportation.flight_records) <= 1
            
        # Solar Setup / Renewables
        if action in ["solar", "switch_renewables"]:
            return assessment.home_energy.solar_tier != SolarSetupTier.NONE
            
        # Energy standby/optimization
        if action == "optimize_energy":
            bill = assessment.home_energy.monthly_electricity_bill_inr
            # If bill was optimized below baseline averages
            return bill > 0 and bill < 4000.0
            
        # Diet shift / Vegetarian / Vegan
        if action in ["reduce_meat", "diet_shift"]:
            diet = assessment.food_habits.diet_type
            if diet in [FoodHabit.VEGETARIAN, FoodHabit.VEGAN]:
                return True
            # Inspect meal records for zero beef portions
            has_beef = False
            for meal in assessment.food_habits.meals:
                for item in meal.items:
                    if item.category == "beef":
                        has_beef = True
            return len(assessment.food_habits.meals) > 0 and not has_beef

        # Delivery reductions
        if action == "reduce_delivery":
            return (assessment.shopping.food_deliveries_per_week <= 2 and 
                    assessment.shopping.package_deliveries_per_week <= 1)
                    
        return False
