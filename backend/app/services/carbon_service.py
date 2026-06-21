from app.schemas.assessment import (
    TransportationSchema, 
    HomeEnergySchema, 
    FoodHabitsSchema, 
    ShoppingSchema,
    AssessmentCreateRequest
)
from app.core.constants import (
    VEHICLE_FACTORS,
    TRANSIT_FACTOR,
    MILES_TO_KM,
    INR_TO_KWH_DIVISOR,
    SOLAR_DAILY_GEN_HOURS,
    DAYS_IN_MONTH,
    MONTHS_IN_YEAR,
    GRID_EMISSIONS_FACTOR_KG_PER_KWH,
    SOLAR_CAPACITIES,
    FOOD_CATEGORY_FACTORS,
    FALLBACK_DAILY_FOOD_EMISSIONS,
    DAYS_IN_YEAR,
    CLOTHING_FACTORS,
    ELECTRONICS_FACTORS,
    FOOD_DELIVERY_EMISSIONS,
    PACKAGE_DELIVERY_EMISSIONS,
    LARGE_PURCHASE_FACTORS,
    LARGE_PURCHASE_COST_MULTIPLIER,
    SCORE_THRESHOLD_EXCELLENT_TONS,
    SCORE_THRESHOLD_POOR_TONS
)

class CarbonCalculationService:
    @classmethod
    def calculate_transportation(cls, data: TransportationSchema) -> float:
        v_type = data.vehicle_type.value if hasattr(data.vehicle_type, "value") else str(data.vehicle_type)
        car_factor = VEHICLE_FACTORS.get(v_type, 0.0)
        
        dists = data.get_mode_distances()
        car_dist = dists["car"]
        transit_dist = dists["public_transit"]
        
        # Unit conversion if user submitted miles
        if data.tracking_unit.value == "miles":
            car_dist *= MILES_TO_KM
            transit_dist *= MILES_TO_KM
            
        # Ground emissions (kg/year)
        ground_emissions = (car_dist * car_factor + transit_dist * TRANSIT_FACTOR) * 52
        
        # Flights emissions
        flights_emissions = sum(f.carbon_emissions_kg for f in data.flight_records)
        
        return ground_emissions + flights_emissions

    @staticmethod
    def calculate_energy(data: HomeEnergySchema) -> float:
        bill_kwh = data.monthly_electricity_bill_inr / INR_TO_KWH_DIVISOR
        
        appliance_kwh = sum(
            (app.power_watts / 1000.0) * app.quantity * app.daily_usage_hours * DAYS_IN_MONTH
            for app in data.appliances
        )
        
        solar_tier_key = data.solar_tier.value if hasattr(data.solar_tier, "value") else str(data.solar_tier)
        solar_cap = SOLAR_CAPACITIES.get(solar_tier_key, 0.0)
        solar_gen_kwh = solar_cap * SOLAR_DAILY_GEN_HOURS * DAYS_IN_MONTH
        
        total_gross_kwh = bill_kwh + appliance_kwh
        net_kwh = max(0.0, total_gross_kwh - solar_gen_kwh)
        
        annual_emissions = net_kwh * MONTHS_IN_YEAR * GRID_EMISSIONS_FACTOR_KG_PER_KWH
        
        return annual_emissions / max(1, data.household_size)

    @staticmethod
    def calculate_food(data: FoodHabitsSchema) -> float:
        daily_emissions = 0.0
        for meal in data.meals:
            for item in meal.items:
                cat_val = item.category.value if hasattr(item.category, "value") else item.category
                factor = FOOD_CATEGORY_FACTORS.get(cat_val, 0.003)
                daily_emissions += item.portion_g * factor
                
        if daily_emissions == 0.0:
            return FALLBACK_DAILY_FOOD_EMISSIONS
            
        return daily_emissions * DAYS_IN_YEAR

    @staticmethod
    def calculate_shopping(data: ShoppingSchema) -> float:
        clothing_emissions = (
            data.clothing_items.shirts * CLOTHING_FACTORS["shirts"] +
            data.clothing_items.pants * CLOTHING_FACTORS["pants"] +
            data.clothing_items.outerwear * CLOTHING_FACTORS["outerwear"] +
            data.clothing_items.shoes * CLOTHING_FACTORS["shoes"]
        ) * MONTHS_IN_YEAR
        
        electronics_emissions = (
            data.electronics_items.phones * ELECTRONICS_FACTORS["phones"] +
            data.electronics_items.laptops * ELECTRONICS_FACTORS["laptops"] +
            data.electronics_items.tvs * ELECTRONICS_FACTORS["tvs"] +
            data.electronics_items.accessories * ELECTRONICS_FACTORS["accessories"]
        )
        
        delivery_emissions = (
            data.food_deliveries_per_week * FOOD_DELIVERY_EMISSIONS + 
            data.package_deliveries_per_week * PACKAGE_DELIVERY_EMISSIONS
        ) * 52.0
        
        large_emissions = 0.0
        for purchase in data.large_purchases:
            cat_val = purchase.category.value if hasattr(purchase.category, "value") else purchase.category
            base_emissions = LARGE_PURCHASE_FACTORS.get(cat_val, 150.0)
            large_emissions += base_emissions + (purchase.cost_usd * LARGE_PURCHASE_COST_MULTIPLIER)
            
        return clothing_emissions + electronics_emissions + delivery_emissions + large_emissions

    @classmethod
    def calculate_footprint(cls, assessment: AssessmentCreateRequest) -> dict:
        transportation_kg = cls.calculate_transportation(assessment.transportation)
        energy_kg = cls.calculate_energy(assessment.home_energy)
        food_kg = cls.calculate_food(assessment.food_habits)
        shopping_kg = cls.calculate_shopping(assessment.shopping)

        total_kg = transportation_kg + energy_kg + food_kg + shopping_kg
        total_tons = total_kg / 1000.0

        if total_tons <= SCORE_THRESHOLD_EXCELLENT_TONS:
            carbon_score = 100
        elif total_tons >= SCORE_THRESHOLD_POOR_TONS:
            carbon_score = 0
        else:
            raw_score = 100 - ((total_tons - SCORE_THRESHOLD_EXCELLENT_TONS) / (SCORE_THRESHOLD_POOR_TONS - SCORE_THRESHOLD_EXCELLENT_TONS)) * 100
            carbon_score = max(0, min(100, round(raw_score)))

        return {
            "total_kg": round(total_kg, 2),
            "total_tons": round(total_tons, 2),
            "carbon_score": carbon_score,
            "breakdown": {
                "transportation": round(transportation_kg, 2),
                "energy": round(energy_kg, 2),
                "food": round(food_kg, 2),
                "shopping": round(shopping_kg, 2)
            }
        }
