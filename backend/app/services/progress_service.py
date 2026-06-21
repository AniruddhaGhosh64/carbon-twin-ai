from typing import List, Dict, Any
from datetime import datetime, date, timezone
from app.repositories.progress_repository import ProgressRepository
from app.repositories.commitments_repository import CommitmentsRepository
from app.repositories.assessment_repository import AssessmentRepository
from app.repositories.twin_repository import TwinRepository
from app.schemas.progress import (
    ProgressOverviewResponse, 
    TargetComparison, 
    StreakStats, 
    CategoryEmissions,
    ActionPerformanceItem,
    BadgeProgress,
    AchievementsResponse
)
from app.schemas.assessment import SolarSetupTier, FoodHabit, VehicleType
from app.services.carbon_service import CarbonCalculationService

progress_repo = ProgressRepository()
commitments_repo = CommitmentsRepository()
assessment_repo = AssessmentRepository()
twin_repo = TwinRepository()

class ProgressService:
    @staticmethod
    def get_latest_assessment_or_default(user_id: str) -> dict:
        assessment_data = assessment_repo.get_latest_assessment(user_id)
        if not assessment_data:
            from app.schemas.assessment import TransportationSchema, HomeEnergySchema, FoodHabitsSchema, ShoppingSchema, AssessmentCreateRequest
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
            ).model_dump()
        return assessment_data

    @classmethod
    def get_progress_overview(cls, user_id: str) -> ProgressOverviewResponse:
        # Load progress history
        history = progress_repo.get_history(user_id)
        
        # If no history exists, seed a default baseline point
        if not history:
            today_str = date.today().isoformat()
            assessment = cls.get_latest_assessment_or_default(user_id)
            from app.schemas.assessment import AssessmentCreateRequest
            calc = CarbonCalculationService.calculate_footprint(AssessmentCreateRequest(**assessment))
            
            progress_repo.add_history_entry(user_id, today_str, calc["carbon_score"], calc["total_kg"])
            history = progress_repo.get_history(user_id)

        baseline = history[0]
        current = history[-1]

        # Fetch latest twin
        twin = twin_repo.get_latest_twin(user_id)
        target_emissions = twin["future_state"]["total_kg"] if twin else baseline["emissions_kg"] * 0.75
        target_score = twin["future_state"]["carbon_score"] if twin else baseline["carbon_score"] + 15

        # Category footprint calculations
        carbon_reduced = max(0.0, baseline["emissions_kg"] - current["emissions_kg"])
        score_diff = current["carbon_score"] - baseline["carbon_score"]

        # Calculate completion rates and money saved from stateful missions
        missions = commitments_repo.get_missions(user_id)
        active_missions = [m for m in missions if m.get("status") == "active"]
        completed_missions = [m for m in missions if m.get("status") == "completed"]
        
        total_adopted = len(active_missions) + len(completed_missions)
        completion_rate = (len(completed_missions) / total_adopted * 100.0) if total_adopted > 0 else 0.0

        total_saved_usd = sum(m.get("money_saved_usd", 0.0) for m in completed_missions)
        # Add partial savings for active missions based on check-ins
        for m in active_missions:
            check_ins = m.get("check_ins", [])
            if check_ins:
                # Fraction of check-ins completed
                success_pct = min(100.0, (len(check_ins) / 10.0) * 100.0)
                total_saved_usd += m.get("money_saved_usd", 0.0) * (success_pct / 100.0)

        # Calculate streaks
        eco_streak = 0
        longest_streak = 0
        # Simple streak calculator: parse dates of check-ins across all missions
        check_in_dates = set()
        for m in missions:
            for ck in m.get("check_ins", []):
                check_in_dates.add(ck.get("date"))
        
        sorted_dates = sorted(list(check_in_dates))
        if sorted_dates:
            eco_streak = 1
            longest_streak = 1
            for i in range(1, len(sorted_dates)):
                try:
                    d1 = date.fromisoformat(sorted_dates[i - 1])
                    d2 = date.fromisoformat(sorted_dates[i])
                    if (d2 - d1).days == 1:
                        eco_streak += 1
                        longest_streak = max(longest_streak, eco_streak)
                    elif (d2 - d1).days > 1:
                        eco_streak = 1
                except Exception:
                    pass
        
        # Completion streak is just count of completed missions
        completion_streak = len(completed_missions)

        gap = max(0.0, current["emissions_kg"] - target_emissions)

        return ProgressOverviewResponse(
            total_carbon_reduced_kg=round(carbon_reduced, 2),
            total_money_saved_usd=round(total_saved_usd, 2),
            score_improvement=score_diff,
            completion_rate=round(completion_rate, 2),
            comparison=TargetComparison(
                baseline=round(baseline["emissions_kg"], 2),
                current=round(current["emissions_kg"], 2),
                target=round(target_emissions, 2),
                gap_remaining=round(gap, 2)
            ),
            streaks=StreakStats(
                current_eco_streak=eco_streak,
                longest_eco_streak=longest_streak,
                completion_streak=completion_streak
            )
        )

    @classmethod
    def get_category_performance(cls, user_id: str) -> Dict[str, Any]:
        # Return category Projected, Actual, and Variance
        assessment = cls.get_latest_assessment_or_default(user_id)
        from app.schemas.assessment import AssessmentCreateRequest
        current_data = CarbonCalculationService.calculate_footprint(AssessmentCreateRequest(**assessment))
        current_breakdown = current_data["breakdown"]

        # Fetch baseline (first history point if exists, otherwise same as current)
        history = progress_repo.get_history(user_id)
        if history:
            # Re-evaluate footprint for baseline
            base_emissions_val = history[0].get("emissions_kg")
            baseline_emissions = float(base_emissions_val) if base_emissions_val is not None else float(current_data["total_kg"])
            # Distribute based on current breakdown ratio if baseline lacked breakdown
            baseline_breakdown = history[0].get("breakdown")
            if not baseline_breakdown:
                ratio = {k: v / current_data["total_kg"] if current_data["total_kg"] > 0 else 0.25 for k, v in current_breakdown.items()}
                baseline_breakdown = {k: baseline_emissions * r for k, r in ratio.items()}
        else:
            baseline_breakdown = current_breakdown

        # Fetch Twin Target breakdown
        twin = twin_repo.get_latest_twin(user_id)
        if twin:
            target_breakdown = {
                "transportation": twin["future_state"]["transportation_kg"],
                "energy": twin["future_state"]["energy_kg"],
                "food": twin["future_state"]["food_kg"],
                "shopping": twin["future_state"]["shopping_kg"]
            }
        else:
            # Standard 25% reduction target per category
            target_breakdown = {k: v * 0.75 for k, v in baseline_breakdown.items()}

        categories = ["transportation", "energy", "food", "shopping"]
        performance = {}
        for cat in categories:
            proj_saving = max(0.0, baseline_breakdown.get(cat, 0.0) - target_breakdown.get(cat, 0.0))
            actual_saving = max(0.0, baseline_breakdown.get(cat, 0.0) - current_breakdown.get(cat, 0.0))
            variance = actual_saving - proj_saving
            # Variance % is how much we exceeded or missed projected savings
            variance_pct = (variance / proj_saving * 100.0) if proj_saving > 0 else 0.0
            
            performance[cat] = {
                "projected_savings_kg": round(proj_saving, 2),
                "actual_savings_kg": round(actual_saving, 2),
                "variance_percentage": round(variance_pct, 2)
            }
            
        return performance

    @classmethod
    def get_action_performance(cls, user_id: str) -> List[ActionPerformanceItem]:
        # Return stateful Action Performance
        missions = commitments_repo.get_missions(user_id)
        performance_list = []
        for m in missions:
            status = m.get("status")
            if status not in ["active", "completed"]:
                continue
                
            check_ins = m.get("check_ins", [])
            
            # expected check-ins
            expected = 10.0
            freq = m.get("config", {}).get("target_frequency", "") if m.get("config") else ""
            if "daily" in freq.lower():
                expected = 30.0
            elif "days/week" in freq.lower():
                try:
                    days = int(freq.lower().split(" ")[0])
                    expected = float(days * 4) # 4 weeks
                except Exception:
                    expected = 10.0
            
            # calculate success %
            success_rate = 100.0
            if status == "active":
                success_rate = min(100.0, (len(check_ins) / expected) * 100.0) if expected > 0 else 100.0
            
            projected = m.get("carbon_reduction_kg", 200.0)
            actual = projected * (success_rate / 100.0)
            
            performance_list.append(ActionPerformanceItem(
                action_id=str(m.get("action_id") or ""),
                title=str(m.get("title") or ""),
                projected_savings_kg=round(projected, 2),
                actual_savings_kg=round(actual, 2),
                success_rate=round(success_rate, 2)
            ))
            
        return performance_list

    @classmethod
    def get_achievements(cls, user_id: str) -> AchievementsResponse:
        # Load user missions
        missions = commitments_repo.get_missions(user_id)
        completed_count = len([m for m in missions if m.get("status") == "completed"])
        active_count = len([m for m in missions if m.get("status") == "active"])
        
        # Calculate XP
        check_ins_count = sum(len(m.get("check_ins", [])) for m in missions)
        total_xp = (check_ins_count * 10) + (completed_count * 100)

        # Get latest assessment
        assessment = cls.get_latest_assessment_or_default(user_id)
        
        # Check badges
        badges = [
            BadgeProgress(
                id="commuter",
                title="Green Commuter",
                description="Adopt a transit-related mission and log at least 5 check-ins.",
                earned=False,
                progress_percentage=0.0
            ),
            BadgeProgress(
                id="solar",
                title="Solar Champion",
                description="Verify a clean energy upgrade to Solar Setup.",
                earned=False,
                progress_percentage=0.0
            ),
            BadgeProgress(
                id="vegetarian",
                title="Low Carbon Chef",
                description="Adopt a vegetarian or dietary shift commitment.",
                earned=False,
                progress_percentage=0.0
            ),
            BadgeProgress(
                id="delivery",
                title="Zero Delivery Hero",
                description="Log less than 2 package deliveries per week in assessment.",
                earned=False,
                progress_percentage=0.0
            )
        ]

        # Evaluate Green Commuter
        transit_missions = [m for m in missions if m.get("action_id") in ["use_metro", "transit", "cycle_weekly"]]
        if transit_missions:
            max_checks = max(len(m.get("check_ins", [])) for m in transit_missions)
            badges[0].progress_percentage = min(100.0, (max_checks / 5.0) * 100.0)
            if max_checks >= 5:
                badges[0].earned = True
                badges[0].unlocked_at = date.today().isoformat()

        # Evaluate Solar Champion
        solar_tier = assessment.get("home_energy", {}).get("solar_tier", SolarSetupTier.NONE)
        if solar_tier != SolarSetupTier.NONE:
            badges[1].earned = True
            badges[1].progress_percentage = 100.0
            badges[1].unlocked_at = date.today().isoformat()
        else:
            # Check if active solar mission exists
            solar_active = any(m.get("action_id") in ["solar", "switch_renewables"] for m in missions if m.get("status") == "active")
            badges[1].progress_percentage = 50.0 if solar_active else 0.0

        # Evaluate Low Carbon Chef
        diet_type = assessment.get("food_habits", {}).get("diet_type", FoodHabit.MIXED)
        if diet_type in [FoodHabit.VEGETARIAN, FoodHabit.VEGAN]:
            badges[2].earned = True
            badges[2].progress_percentage = 100.0
            badges[2].unlocked_at = date.today().isoformat()
        else:
            diet_active = any(m.get("action_id") in ["reduce_meat", "diet_shift"] for m in missions if m.get("status") == "active")
            badges[2].progress_percentage = 50.0 if diet_active else 0.0

        # Evaluate Zero Delivery Hero
        pkg_deliveries = assessment.get("shopping", {}).get("package_deliveries_per_week", 5)
        if pkg_deliveries <= 2:
            badges[3].earned = True
            badges[3].progress_percentage = 100.0
            badges[3].unlocked_at = date.today().isoformat()
        else:
            badges[3].progress_percentage = min(100.0, (2.0 / max(1.0, float(pkg_deliveries))) * 100.0)

        return AchievementsResponse(
            total_xp=total_xp,
            badges=badges
        )
