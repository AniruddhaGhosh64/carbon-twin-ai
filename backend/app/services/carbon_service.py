from app.schemas.assessment import (
    TransportationSchema, 
    HomeEnergySchema, 
    FoodHabitsSchema, 
    ShoppingSchema,
    AssessmentCreateRequest,
    VehicleType,
    FoodHabit
)

class CarbonCalculationService:
    @staticmethod
    def calculate_transportation(data: TransportationSchema) -> float:
        # Vehicle factors (kg CO2e per km)
        vehicle_factors = {
            VehicleType.GASOLINE: 0.192,
            VehicleType.DIESEL: 0.232,
            VehicleType.HYBRID: 0.109,
            VehicleType.ELECTRIC: 0.053,
            VehicleType.NONE: 0.0
        }
        car_factor = vehicle_factors.get(data.vehicle_type, 0.0)
        transit_factor = 0.04 # kg CO2e per km
        
        car_dist = 0.0
        transit_dist = 0.0
        
        if data.weekly_override.is_active:
            car_dist = data.weekly_override.car
            transit_dist = data.weekly_override.public_transit
        else:
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                daily = getattr(data.current_week, day)
                car_dist += daily.car
                transit_dist += daily.public_transit
        
        # Unit conversion if user submitted miles
        if data.tracking_unit.value == "miles":
            car_dist *= 1.60934
            transit_dist *= 1.60934
            
        # Ground emissions (kg/year)
        ground_emissions = (car_dist * car_factor + transit_dist * transit_factor) * 52
        
        # Flights emissions
        flights_emissions = sum(f.carbon_emissions_kg for f in data.flight_records)
        
        return ground_emissions + flights_emissions

    @staticmethod
    def calculate_energy(data: HomeEnergySchema) -> float:
        bill_kwh = data.monthly_electricity_bill_inr / 8.0
        
        appliance_kwh = sum(
            (app.power_watts / 1000.0) * app.quantity * app.daily_usage_hours * 30.0
            for app in data.appliances
        )
        
        solar_capacities = {
            "none": 0.0,
            "small": 2.0,
            "medium": 5.0,
            "large": 10.0
        }
        solar_cap = solar_capacities.get(data.solar_tier.value if hasattr(data.solar_tier, "value") else data.solar_tier, 0.0)
        solar_gen_kwh = solar_cap * 4.0 * 30.0
        
        total_gross_kwh = bill_kwh + appliance_kwh
        net_kwh = max(0.0, total_gross_kwh - solar_gen_kwh)
        
        annual_emissions = net_kwh * 12 * 0.4
        
        return annual_emissions / max(1, data.household_size)

    @staticmethod
    def calculate_food(data: FoodHabitsSchema) -> float:
        factors = {
            "beef": 0.060,
            "dairy": 0.021,
            "poultry": 0.006,
            "fish": 0.005,
            "grains": 0.0015,
            "vegetables": 0.001,
            "plant_protein": 0.002,
            "other": 0.003
        }
        
        daily_emissions = 0.0
        for meal in data.meals:
            for item in meal.items:
                cat_val = item.category.value if hasattr(item.category, "value") else item.category
                factor = factors.get(cat_val, 0.003)
                daily_emissions += item.portion_g * factor
                
        if daily_emissions == 0.0:
            return 2500.0
            
        return daily_emissions * 365.0

    @staticmethod
    def calculate_shopping(data: ShoppingSchema) -> float:
        clothing_emissions = (
            data.clothing_items.shirts * 8.0 +
            data.clothing_items.pants * 15.0 +
            data.clothing_items.outerwear * 30.0 +
            data.clothing_items.shoes * 20.0
        ) * 12.0
        
        electronics_emissions = (
            data.electronics_items.phones * 60.0 +
            data.electronics_items.laptops * 250.0 +
            data.electronics_items.tvs * 350.0 +
            data.electronics_items.accessories * 10.0
        )
        
        delivery_emissions = (
            data.food_deliveries_per_week * 1.5 + 
            data.package_deliveries_per_week * 2.2
        ) * 52.0
        
        large_purchase_factors = {
            "furniture": 300.0,
            "appliances": 500.0,
            "ev_vehicle": 6000.0,
            "gas_vehicle": 12000.0,
            "other": 150.0
        }
        
        large_emissions = 0.0
        for purchase in data.large_purchases:
            cat_val = purchase.category.value if hasattr(purchase.category, "value") else purchase.category
            base_emissions = large_purchase_factors.get(cat_val, 150.0)
            large_emissions += base_emissions + (purchase.cost_usd * 0.1)
            
        return clothing_emissions + electronics_emissions + delivery_emissions + large_emissions

    @classmethod
    def calculate_footprint(cls, assessment: AssessmentCreateRequest) -> dict:
        transportation_kg = cls.calculate_transportation(assessment.transportation)
        energy_kg = cls.calculate_energy(assessment.home_energy)
        food_kg = cls.calculate_food(assessment.food_habits)
        shopping_kg = cls.calculate_shopping(assessment.shopping)

        total_kg = transportation_kg + energy_kg + food_kg + shopping_kg
        total_tons = total_kg / 1000.0

        if total_tons <= 2.0:
            carbon_score = 100
        elif total_tons >= 20.0:
            carbon_score = 0
        else:
            raw_score = 100 - ((total_tons - 2.0) / (20.0 - 2.0)) * 100
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
