from app.schemas.assessment import (
    AssessmentCreateRequest, 
    CommuteMethod, 
    VehicleType, 
    FoodHabit,
    SolarSetupTier,
    FoodCategory
)
from app.schemas.simulator import SimulatorLevers, ProjectionTimeline
from app.services.carbon_service import CarbonCalculationService
from copy import deepcopy

class SimulatorService:
    @staticmethod
    def simulate(assessment: AssessmentCreateRequest, levers: SimulatorLevers) -> dict:
        # Calculate baseline
        base_results = CarbonCalculationService.calculate_footprint(assessment)
        base_emissions_kg = base_results["total_kg"]

        # Copy assessment for simulation
        sim_assessment = deepcopy(assessment)
        money_saved_usd = 0.0
        money_spent_usd = 0.0

        # --- CAPITAL SPENT ---
        if levers.solar_adoption:
            if assessment.home_energy.solar_tier not in [SolarSetupTier.MEDIUM, SolarSetupTier.LARGE]:
                money_spent_usd += 2500.0
        if levers.appliance_optimization:
            money_spent_usd += 500.0
        if levers.cycle_days > 0:
            money_spent_usd += 300.0

        # --- TRANSPORTATION SIMULATION ---
        car_dist = 0.0
        transit_dist = 0.0
        if assessment.transportation.weekly_override.is_active:
            car_dist = assessment.transportation.weekly_override.car
            transit_dist = assessment.transportation.weekly_override.public_transit
        else:
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                daily = getattr(assessment.transportation.current_week, day)
                car_dist += daily.car
                transit_dist += daily.public_transit

        vehicle_factors = {
            VehicleType.GASOLINE: 0.192,
            VehicleType.DIESEL: 0.232,
            VehicleType.HYBRID: 0.109,
            VehicleType.ELECTRIC: 0.053,
            VehicleType.NONE: 0.0
        }
        car_factor = vehicle_factors.get(assessment.transportation.vehicle_type, 0.0)

        # 1. Cycle days
        cycle_fraction = min(1.0, levers.cycle_days / 7.0)
        cycle_saved_dist = car_dist * cycle_fraction
        car_dist_after_cycle = car_dist - cycle_saved_dist
        money_saved_usd += cycle_saved_dist * 0.15 * 52

        # 2. Reduce driving percentage
        reduce_driving_pct = levers.reduce_driving_percentage
        driving_saved_dist = car_dist_after_cycle * (reduce_driving_pct / 100.0)
        car_dist_after_reduce = car_dist_after_cycle - driving_saved_dist
        money_saved_usd += driving_saved_dist * 0.15 * 52

        # 3. Use Metro / Carpool
        transit_shifted_dist = 0.0
        carpool_saved_dist = 0.0
        if levers.use_metro:
            transit_shifted_dist = car_dist_after_reduce
            car_dist_final = 0.0
            money_saved_usd += transit_shifted_dist * (0.15 - 0.05) * 52
        elif levers.carpool:
            carpool_saved_dist = car_dist_after_reduce * 0.5
            car_dist_final = car_dist_after_reduce * 0.5
            money_saved_usd += carpool_saved_dist * 0.075 * 52
        else:
            car_dist_final = car_dist_after_reduce

        # Update simulated transportation distances
        if sim_assessment.transportation.weekly_override.is_active:
            sim_assessment.transportation.weekly_override.car = car_dist_final
            if levers.use_metro:
                sim_assessment.transportation.weekly_override.public_transit += transit_shifted_dist
        else:
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                daily = getattr(sim_assessment.transportation.current_week, day)
                if car_dist > 0:
                    fraction = car_dist_final / car_dist
                    daily.car *= fraction
                if levers.use_metro and car_dist > 0:
                    daily.public_transit += getattr(assessment.transportation.current_week, day).car * (transit_shifted_dist / car_dist)

        # Flights reduction
        baseline_flights = len(assessment.transportation.flight_records)
        reduced_flights = min(baseline_flights, levers.flight_reduction_count)
        if reduced_flights > 0:
            sim_assessment.transportation.flight_records = assessment.transportation.flight_records[:-reduced_flights] if reduced_flights < baseline_flights else []
            money_saved_usd += reduced_flights * 250.0

        # --- HOME ENERGY SIMULATION ---
        # 1. Solar Adoption
        baseline_solar_tier = assessment.home_energy.solar_tier
        if levers.solar_adoption and baseline_solar_tier in [SolarSetupTier.NONE, SolarSetupTier.SMALL]:
            sim_assessment.home_energy.solar_tier = SolarSetupTier.MEDIUM
            base_gen = 240.0 if baseline_solar_tier == SolarSetupTier.SMALL else 0.0
            solar_gen_diff = 600.0 - base_gen
            money_saved_usd += solar_gen_diff * 12 * 0.15

        # 2. Appliance Optimization
        if levers.appliance_optimization:
            appliance_kwh_base = sum(
                (app.power_watts / 1000.0) * app.quantity * app.daily_usage_hours * 30.0
                for app in assessment.home_energy.appliances
            )
            for app in sim_assessment.home_energy.appliances:
                app.daily_usage_hours *= 0.8
            money_saved_usd += appliance_kwh_base * 0.20 * 12 * 0.15

        # 3. Reduce electricity percentage
        reduce_elec_pct = max(levers.reduce_electricity_percentage, float(levers.reduce_electricity))
        if reduce_elec_pct > 0:
            bill_inr = assessment.home_energy.monthly_electricity_bill_inr
            sim_assessment.home_energy.monthly_electricity_bill_inr = bill_inr * (1.0 - reduce_elec_pct / 100.0)
            saved_bill_kwh = (bill_inr * (reduce_elec_pct / 100.0)) / 8.0
            money_saved_usd += saved_bill_kwh * 12 * 0.15

        # --- FOOD SIMULATION ---
        # 1. Reduce Beef
        if levers.reduce_beef_percentage > 0:
            for meal in sim_assessment.food_habits.meals:
                for item in meal.items:
                    if item.category == FoodCategory.BEEF:
                        reduced_beef = item.portion_g * (levers.reduce_beef_percentage / 100.0)
                        item.portion_g *= (1.0 - levers.reduce_beef_percentage / 100.0)
                        money_saved_usd += reduced_beef * 365 * 0.015

        # 2. Diet Transitions
        dt = levers.diet_transition
        if dt == "none" and levers.reduce_meat:
            dt = "balanced"

        baseline_diet = assessment.food_habits.diet_type
        diet_savings_table = {
            FoodHabit.HIGH_MEAT: {
                "balanced": 150.0,
                "vegetarian": 400.0,
                "vegan": 750.0
            },
            FoodHabit.MIXED: {
                "vegetarian": 250.0,
                "vegan": 600.0
            },
            FoodHabit.VEGETARIAN: {
                "vegan": 350.0
            }
        }
        if baseline_diet is not None and baseline_diet in diet_savings_table and dt in diet_savings_table[baseline_diet]:
            money_saved_usd += diet_savings_table[baseline_diet][dt]

        if dt == "balanced":
            sim_assessment.food_habits.diet_type = FoodHabit.MIXED
            for meal in sim_assessment.food_habits.meals:
                for item in meal.items:
                    if item.category in [FoodCategory.BEEF, FoodCategory.POULTRY, FoodCategory.FISH]:
                        item.portion_g *= 0.7
        elif dt == "vegetarian":
            sim_assessment.food_habits.diet_type = FoodHabit.VEGETARIAN
            for meal in sim_assessment.food_habits.meals:
                meat_portion = 0.0
                new_items = []
                for item in meal.items:
                    if item.category in [FoodCategory.BEEF, FoodCategory.POULTRY, FoodCategory.FISH]:
                        meat_portion += item.portion_g
                    else:
                        new_items.append(item)
                if meat_portion > 0:
                    protein_item = next((x for x in new_items if x.category == FoodCategory.PLANT_PROTEIN), None)
                    if protein_item:
                        protein_item.portion_g += meat_portion
                    else:
                        if meal.items:
                            new_item = deepcopy(meal.items[0])
                            new_item.id = f"{meal.id}_plant_prot"
                            new_item.name = "Plant Protein"
                            new_item.category = FoodCategory.PLANT_PROTEIN
                            new_item.portion_g = meat_portion
                            new_items.append(new_item)
                meal.items = new_items
        elif dt == "vegan":
            sim_assessment.food_habits.diet_type = FoodHabit.VEGAN
            for meal in sim_assessment.food_habits.meals:
                animal_portion = 0.0
                new_items = []
                for item in meal.items:
                    if item.category in [FoodCategory.BEEF, FoodCategory.POULTRY, FoodCategory.FISH, FoodCategory.DAIRY]:
                        animal_portion += item.portion_g
                    else:
                        new_items.append(item)
                if animal_portion > 0:
                    protein_item = next((x for x in new_items if x.category == FoodCategory.PLANT_PROTEIN), None)
                    if protein_item:
                        protein_item.portion_g += animal_portion
                    else:
                        if meal.items:
                            new_item = deepcopy(meal.items[0])
                            new_item.id = f"{meal.id}_plant_prot"
                            new_item.name = "Plant Protein"
                            new_item.category = FoodCategory.PLANT_PROTEIN
                            new_item.portion_g = animal_portion
                            new_items.append(new_item)
                meal.items = new_items

        # --- SHOPPING SIMULATION ---
        # 1. Lower Delivery Frequency
        if levers.reduce_deliveries_percentage > 0:
            food_deliv = assessment.shopping.food_deliveries_per_week
            pkg_deliv = assessment.shopping.package_deliveries_per_week
            sim_assessment.shopping.food_deliveries_per_week = int(round(food_deliv * (1.0 - levers.reduce_deliveries_percentage / 100.0)))
            sim_assessment.shopping.package_deliveries_per_week = int(round(pkg_deliv * (1.0 - levers.reduce_deliveries_percentage / 100.0)))
            saved_deliv = (food_deliv + pkg_deliv) * (levers.reduce_deliveries_percentage / 100.0)
            money_saved_usd += saved_deliv * 52 * 3.50

        # 2. Reduced clothing purchases
        if levers.reduce_clothing_percentage > 0:
            sim_assessment.shopping.clothing_items.shirts = round(assessment.shopping.clothing_items.shirts * (1.0 - levers.reduce_clothing_percentage / 100.0))
            sim_assessment.shopping.clothing_items.pants = round(assessment.shopping.clothing_items.pants * (1.0 - levers.reduce_clothing_percentage / 100.0))
            sim_assessment.shopping.clothing_items.outerwear = round(assessment.shopping.clothing_items.outerwear * (1.0 - levers.reduce_clothing_percentage / 100.0))
            sim_assessment.shopping.clothing_items.shoes = round(assessment.shopping.clothing_items.shoes * (1.0 - levers.reduce_clothing_percentage / 100.0))
            clothing_spend_annual = (
                assessment.shopping.clothing_items.shirts * 30 +
                assessment.shopping.clothing_items.pants * 50 +
                assessment.shopping.clothing_items.outerwear * 100 +
                assessment.shopping.clothing_items.shoes * 80
            ) * 12
            money_saved_usd += clothing_spend_annual * (levers.reduce_clothing_percentage / 100.0)

        # 3. Reduced electronics purchases
        if levers.reduce_electronics_percentage > 0:
            sim_assessment.shopping.electronics_items.phones = round(assessment.shopping.electronics_items.phones * (1.0 - levers.reduce_electronics_percentage / 100.0))
            sim_assessment.shopping.electronics_items.laptops = round(assessment.shopping.electronics_items.laptops * (1.0 - levers.reduce_electronics_percentage / 100.0))
            sim_assessment.shopping.electronics_items.tvs = round(assessment.shopping.electronics_items.tvs * (1.0 - levers.reduce_electronics_percentage / 100.0))
            sim_assessment.shopping.electronics_items.accessories = round(assessment.shopping.electronics_items.accessories * (1.0 - levers.reduce_electronics_percentage / 100.0))
            electronics_spend_annual = (
                assessment.shopping.electronics_items.phones * 800 +
                assessment.shopping.electronics_items.laptops * 1200 +
                assessment.shopping.electronics_items.tvs * 600 +
                assessment.shopping.electronics_items.accessories * 50
            )
            money_saved_usd += electronics_spend_annual * (levers.reduce_electronics_percentage / 100.0)

        # Trigger validation
        sim_assessment.transportation.compute_legacy_fields()
        sim_assessment.home_energy.compute_legacy_fields()

        # Calculate simulated emissions
        sim_results = CarbonCalculationService.calculate_footprint(sim_assessment)
        simulated_emissions_kg = sim_results["total_kg"]

        if base_emissions_kg > 0:
            reduction_percentage = ((base_emissions_kg - simulated_emissions_kg) / base_emissions_kg) * 100
        else:
            reduction_percentage = 0.0

        if money_spent_usd == 0:
            roi_percentage = 100.0
            break_even_years = 0.0
        else:
            roi_percentage = (money_saved_usd / money_spent_usd) * 100
            break_even_years = money_spent_usd / money_saved_usd if money_saved_usd > 0 else 999.0

        co2_saved_kg = max(0.0, base_emissions_kg - simulated_emissions_kg)
        trees_equivalent = round(co2_saved_kg / 20.0)

        emissions_projection = ProjectionTimeline(
            six_months=round(simulated_emissions_kg * 0.5, 2),
            one_year=round(simulated_emissions_kg, 2),
            five_years=round(simulated_emissions_kg * 5, 2),
            ten_years=round(simulated_emissions_kg * 10, 2)
        )

        savings_projection = ProjectionTimeline(
            six_months=round((money_saved_usd * 0.5) - money_spent_usd, 2),
            one_year=round(money_saved_usd - money_spent_usd, 2),
            five_years=round((money_saved_usd * 5) - money_spent_usd, 2),
            ten_years=round((money_saved_usd * 10) - money_spent_usd, 2)
        )

        return {
            "base_emissions_kg": round(base_emissions_kg, 2),
            "simulated_emissions_kg": round(simulated_emissions_kg, 2),
            "reduction_percentage": round(reduction_percentage, 2),
            "base_carbon_score": base_results["carbon_score"],
            "simulated_carbon_score": sim_results["carbon_score"],
            "money_saved_usd": round(money_saved_usd, 2),
            "money_spent_usd": round(money_spent_usd, 2),
            "roi_percentage": round(roi_percentage, 2),
            "break_even_years": round(break_even_years, 2),
            "trees_equivalent": int(trees_equivalent),
            "emissions_projection": emissions_projection.model_dump(),
            "savings_projection": savings_projection.model_dump(),
            "base_breakdown": base_results["breakdown"],
            "simulated_breakdown": sim_results["breakdown"],
            "simulated_assessment": sim_assessment
        }
