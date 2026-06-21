import os
from google import genai
from app.schemas.twin import TwinState
from app.schemas.assessment import AssessmentCreateRequest, CommuteMethod, VehicleType, FoodHabit
from app.services.carbon_service import CarbonCalculationService
from app.schemas.recommendations import EcoAction
from app.core.config import settings

class RecommendationService:
    @staticmethod
    def generate_narrative(current_state: TwinState, future_state: TwinState, reduction_pct: float, savings: float, rules: list[str]) -> str:
        keys = settings.gemini_api_keys
        default_fallback = "We experienced an issue connecting to the AI brain. But your Future Twin looks bright! Check the optimization rules applied."
        if not keys:
            return "Set rotating GEMINI_API_KEYs (1, 2, or 3) in your environment to see your AI-generated future narrative."
            
        for key_index, api_key in enumerate(keys):
            try:
                client = genai.Client(api_key=api_key)
                
                prompt = f"""
                You are 'CarbonTwin AI', a friendly and highly analytical sustainability expert.
                Write a 'Meet Future You' narrative for a user who just received their carbon twin comparison.
                
                Current Emissions: {current_state.total_kg} kg CO2e
                Future Emissions: {future_state.total_kg} kg CO2e
                Reduction: {reduction_pct:.1f}%
                Annual Savings: ${savings:.2f}
                Optimization Rules Applied: {', '.join(rules)}
                
                Requirements:
                1. Keep the response under 150 words.
                2. Avoid generic sustainability advice.
                3. Use the specific metrics provided above.
                4. Generate actionable recommendations based on the rules applied.
                5. Tone should be inspiring, direct, and focused on the financial and environmental dual-benefit.
                """
                
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                if response.text:
                    return response.text.strip()
                raise ValueError("Empty response from Gemini")
            except Exception as e:
                print(f"Gemini API Error in Narrative with key {key_index + 1}: {e}")
                if key_index == len(keys) - 1:
                    return default_fallback
        return default_fallback

    @staticmethod
    def generate_recommendations(assessment: AssessmentCreateRequest) -> tuple[str, list[EcoAction]]:
        # Calculate footprint breakdown
        footprint = CarbonCalculationService.calculate_footprint(assessment)
        breakdown = footprint["breakdown"]
        
        # Find highest emission category
        highest_cat = max(breakdown, key=breakdown.get)
        
        actions = []
        
        # 1. Use Metro (Transit)
        if assessment.transportation.commute_method == CommuteMethod.CAR:
            dist = assessment.transportation.weekly_distance_km or 0.0
            factor = 0.192
            if assessment.transportation.vehicle_type == VehicleType.GASOLINE:
                factor = 0.192
            elif assessment.transportation.vehicle_type == VehicleType.DIESEL:
                factor = 0.232
            elif assessment.transportation.vehicle_type == VehicleType.HYBRID:
                factor = 0.109
            elif assessment.transportation.vehicle_type == VehicleType.ELECTRIC:
                factor = 0.053
                
            commute_savings_kg = dist * 52 * factor
            savings_usd = dist * 52 * 0.05
            actions.append(EcoAction(
                id="use_metro",
                action_title="Use Public Metro/Transit",
                category="transportation",
                impact_level="High" if commute_savings_kg > 500 else "Medium",
                difficulty="Moderate",
                estimated_savings_usd=round(savings_usd, 2),
                description=f"Switching your daily commute to public transit reduces annual emissions by {round(commute_savings_kg)} kg CO2e and saves on fuel and maintenance."
            ))
            
        # 2. Carpool
        if assessment.transportation.commute_method == CommuteMethod.CAR:
            dist = assessment.transportation.weekly_distance_km or 0.0
            factor = 0.192
            if assessment.transportation.vehicle_type == VehicleType.GASOLINE:
                factor = 0.192
            elif assessment.transportation.vehicle_type == VehicleType.DIESEL:
                factor = 0.232
            elif assessment.transportation.vehicle_type == VehicleType.HYBRID:
                factor = 0.109
            elif assessment.transportation.vehicle_type == VehicleType.ELECTRIC:
                factor = 0.053
                
            commute_savings_kg = dist * 52 * factor * 0.5
            savings_usd = dist * 52 * 0.075
            actions.append(EcoAction(
                id="carpool",
                action_title="Carpool for Daily Commute",
                category="transportation",
                impact_level="Medium" if commute_savings_kg > 250 else "Low",
                difficulty="Easy",
                estimated_savings_usd=round(savings_usd, 2),
                description=f"Sharing rides cut commute emissions in half, saving you {round(commute_savings_kg)} kg CO2e annually."
            ))

        # 3. Cycle Weekly
        dist = assessment.transportation.weekly_distance_km or 0.0
        if dist > 0:
            factor = 0.192 if assessment.transportation.commute_method == CommuteMethod.CAR else 0.05
            cycle_savings_kg = (2/7.0) * dist * 52 * factor
            savings_usd = (2/7.0) * dist * 52 * (0.15 if assessment.transportation.commute_method == CommuteMethod.CAR else 0.05)
            actions.append(EcoAction(
                id="cycle_weekly",
                action_title="Cycle 2 Days/Week",
                category="transportation",
                impact_level="Medium" if cycle_savings_kg > 200 else "Low",
                difficulty="Moderate",
                estimated_savings_usd=round(savings_usd, 2),
                description=f"Replacing short commutes with cycling 2 days a week cuts emissions by {round(cycle_savings_kg)} kg CO2e while keeping you fit."
            ))

        # 4. Reduce Meat
        diet = assessment.food_habits.diet_type
        if diet in [FoodHabit.HIGH_MEAT, FoodHabit.MIXED]:
            saved_kg = 800.0
            savings_usd = 200.0 if diet == FoodHabit.HIGH_MEAT else 300.0
            actions.append(EcoAction(
                id="reduce_meat",
                action_title="Shift Diet (Less Meat)",
                category="food",
                impact_level="High" if saved_kg > 500 else "Medium",
                difficulty="Moderate",
                estimated_savings_usd=savings_usd,
                description="Transitioning to a plant-based or lower-meat diet significantly lowers greenhouse gas output from food supply chains."
            ))

        # 5. Reduce Electricity
        kwh = assessment.home_energy.monthly_electricity_kwh or 0.0
        if kwh > 100:
            ren_pct = assessment.home_energy.renewable_energy_percentage or 0.0
            saved_kg = kwh * 12 * 0.15 * 0.4 * (1 - ren_pct / 100.0)
            savings_usd = kwh * 0.15 * 12 * 0.15
            actions.append(EcoAction(
                id="reduce_electricity",
                action_title="Enhance Energy Efficiency",
                category="energy",
                impact_level="Medium" if saved_kg > 200 else "Low",
                difficulty="Easy",
                estimated_savings_usd=round(savings_usd, 2),
                description=f"Reducing standby power and optimizing thermostat usage by 15% saves {round(saved_kg)} kg CO2e and lowers monthly bills."
            ))

        # 6. Switch to Renewables
        ren = assessment.home_energy.renewable_energy_percentage or 0.0
        if ren < 50:
            saved_kg = (kwh * 12 * 0.4) * ((50 - ren) / 100.0)
            actions.append(EcoAction(
                id="switch_renewables",
                action_title="Switch to Renewable Provider",
                category="energy",
                impact_level="High" if saved_kg > 500 else "Medium",
                difficulty="Easy",
                estimated_savings_usd=0.0,
                description=f"Increasing your green energy supply to 50% offsets {round(saved_kg)} kg CO2e grid emissions without changing consumption."
            ))

        # Sort actions
        def rank_key(action):
            is_highest_cat = 1 if action.category == highest_cat else 0
            impact_val = {"High": 3, "Medium": 2, "Low": 1}.get(action.impact_level, 0)
            return (is_highest_cat, impact_val, action.estimated_savings_usd)
            
        actions.sort(key=rank_key, reverse=True)
        
        return highest_cat, actions

    @staticmethod
    def generate_coaching_explanation(assessment: AssessmentCreateRequest, highest_cat: str, breakdown: dict) -> str:
        keys = settings.gemini_api_keys
        default_fallback = f"Your highest emission contributor is {highest_cat.title()} ({breakdown.get(highest_cat, 0.0)} kg CO2e). Focus on implementing high-impact green energy solutions, lower meat options, and optimized transit schedules to lower your footprint."
        if not keys:
            return default_fallback

        for key_index, api_key in enumerate(keys):
            try:
                client = genai.Client(api_key=api_key)
                
                prompt = f"""
                You are 'CarbonCoach AI', a friendly and highly analytical sustainability expert.
                Provide a personalized, insightful coaching tip explaining why the user's highest emitting category is '{highest_cat}' and recommending a specific improvement action based on the details.
                
                Breakdown details:
                - Transportation: {breakdown.get('transportation', 0.0)} kg CO2e
                - Food Habits: {breakdown.get('food', 0.0)} kg CO2e
                - Home Energy: {breakdown.get('energy', 0.0)} kg CO2e
                - Shopping: {breakdown.get('shopping', 0.0)} kg CO2e
                
                Requirements:
                1. Keep the response under 100 words.
                2. Direct, positive, and motivating tone with a clear focus on the numbers.
                3. Do not include placeholders or generic introductions.
                """
                
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                if response.text:
                    return response.text.strip()
                raise ValueError("Empty response from Gemini")
            except Exception as e:
                print(f"Gemini API Error in Coach with key {key_index + 1}: {e}")
                if key_index == len(keys) - 1:
                    return f"Your highest emission contributor is {highest_cat.title()} ({breakdown.get(highest_cat, 0.0)} kg CO2e). Focus on reducing consumption in this sector to lower your footprint."
        return default_fallback

