from pydantic import BaseModel, Field, field_validator
from typing import Optional
from enum import Enum
from app.core.security import sanitize_string


class CommuteMethod(str, Enum):
    CAR = "car"
    PUBLIC_TRANSIT = "public_transit"
    BICYCLE = "bicycle"
    WALKING = "walking"

class VehicleType(str, Enum):
    GASOLINE = "gasoline"
    DIESEL = "diesel"
    HYBRID = "hybrid"
    ELECTRIC = "electric"
    NONE = "none"

class FoodHabit(str, Enum):
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    MIXED = "mixed"
    HIGH_MEAT = "high_meat"

class DistanceUnit(str, Enum):
    KM = "km"
    MILES = "miles"

class DailyDistances(BaseModel):
    car: float = 0.0
    public_transit: float = 0.0
    bicycle: float = 0.0
    walking: float = 0.0

class WeekTracking(BaseModel):
    monday: DailyDistances = Field(default_factory=DailyDistances)
    tuesday: DailyDistances = Field(default_factory=DailyDistances)
    wednesday: DailyDistances = Field(default_factory=DailyDistances)
    thursday: DailyDistances = Field(default_factory=DailyDistances)
    friday: DailyDistances = Field(default_factory=DailyDistances)
    saturday: DailyDistances = Field(default_factory=DailyDistances)
    sunday: DailyDistances = Field(default_factory=DailyDistances)

class WeeklyOverride(BaseModel):
    is_active: bool = False
    car: float = 0.0
    public_transit: float = 0.0
    bicycle: float = 0.0
    walking: float = 0.0

class TripType(str, Enum):
    ONE_WAY = "one_way"
    ROUND_TRIP = "round_trip"

class FlightRecord(BaseModel):
    date: str
    source_airport: str = Field(..., min_length=3, max_length=50)
    destination_airport: str = Field(..., min_length=3, max_length=50)
    trip_type: TripType
    distance_km: float = Field(ge=0)
    carbon_emissions_kg: float = Field(ge=0)

    @field_validator("source_airport", "destination_airport", mode="before")
    @classmethod
    def clean_airports(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


from pydantic import model_validator
from typing import List

class TransportationSchema(BaseModel):
    tracking_unit: DistanceUnit = DistanceUnit.KM
    vehicle_type: VehicleType = Field(default=VehicleType.GASOLINE, description="Type of vehicle owned or primarily used")
    current_week: WeekTracking = Field(default_factory=WeekTracking)
    weekly_override: WeeklyOverride = Field(default_factory=WeeklyOverride)
    flight_records: List[FlightRecord] = Field(default_factory=list)
    
    # Legacy compatibility fields
    commute_method: Optional[CommuteMethod] = None
    weekly_distance_km: Optional[float] = None
    annual_flights: Optional[int] = None

    @model_validator(mode='after')
    def compute_legacy_fields(self):
        # Calculate weekly distance across all ground modes
        car_dist = 0.0
        transit_dist = 0.0
        bike_dist = 0.0
        walk_dist = 0.0
        
        if self.weekly_override.is_active:
            car_dist = self.weekly_override.car
            transit_dist = self.weekly_override.public_transit
            bike_dist = self.weekly_override.bicycle
            walk_dist = self.weekly_override.walking
        else:
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                daily = getattr(self.current_week, day)
                car_dist += daily.car
                transit_dist += daily.public_transit
                bike_dist += daily.bicycle
                walk_dist += daily.walking
                
        total_dist = car_dist + transit_dist + bike_dist + walk_dist
        self.weekly_distance_km = total_dist
        
        # Determine primary commute method by highest distance
        modes = {
            CommuteMethod.CAR: car_dist,
            CommuteMethod.PUBLIC_TRANSIT: transit_dist,
            CommuteMethod.BICYCLE: bike_dist,
            CommuteMethod.WALKING: walk_dist
        }
        primary_mode = max(modes, key=lambda k: modes[k])
        self.commute_method = primary_mode
        
        # Set annual flights
        self.annual_flights = len(self.flight_records)
        
        return self

class SolarSetupTier(str, Enum):
    NONE = "none"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"

class ApplianceType(str, Enum):
    PRESET = "preset"
    CUSTOM = "custom"

class ApplianceItemSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    type: ApplianceType
    quantity: int = Field(ge=0, default=0)
    daily_usage_hours: float = Field(ge=0, le=24, default=0.0)
    power_watts: float = Field(ge=0, default=0.0)

    @field_validator("id", "name", mode="before")
    @classmethod
    def clean_appliance_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


class HomeEnergySchema(BaseModel):
    household_size: int = Field(ge=1, default=1)
    monthly_electricity_bill_inr: float = Field(ge=0, default=0.0)
    solar_tier: SolarSetupTier = SolarSetupTier.NONE
    appliances: List[ApplianceItemSchema] = Field(default_factory=list)
    
    # Legacy fields derived on save or validation
    monthly_electricity_kwh: Optional[float] = None
    ac_usage_hours_per_day: Optional[float] = None
    renewable_energy_percentage: Optional[float] = None

    @model_validator(mode='after')
    def compute_legacy_fields(self):
        bill_kwh = self.monthly_electricity_bill_inr / 8.0
        
        appliance_kwh = sum(
            (app.power_watts / 1000.0) * app.quantity * app.daily_usage_hours * 30.0
            for app in self.appliances
        )
        
        solar_capacities = {
            SolarSetupTier.NONE: 0.0,
            SolarSetupTier.SMALL: 2.0,
            SolarSetupTier.MEDIUM: 5.0,
            SolarSetupTier.LARGE: 10.0
        }
        solar_cap = solar_capacities.get(self.solar_tier, 0.0)
        solar_gen_kwh = solar_cap * 4.0 * 30.0
        
        total_gross_kwh = bill_kwh + appliance_kwh
        net_kwh = max(0.0, total_gross_kwh - solar_gen_kwh)
        
        self.monthly_electricity_kwh = net_kwh
        
        ac_apps = [app for app in self.appliances if "ac" in app.name.lower() or "air conditioner" in app.name.lower()]
        if ac_apps:
            self.ac_usage_hours_per_day = max(app.daily_usage_hours for app in ac_apps)
        else:
            self.ac_usage_hours_per_day = 0.0
            
        if total_gross_kwh > 0:
            self.renewable_energy_percentage = min(100.0, (solar_gen_kwh / total_gross_kwh) * 100.0)
        else:
            self.renewable_energy_percentage = 0.0
            
        return self

class FoodCategory(str, Enum):
    BEEF = "beef"
    POULTRY = "poultry"
    FISH = "fish"
    DAIRY = "dairy"
    PLANT_PROTEIN = "plant_protein"
    VEGETABLES = "vegetables"
    GRAINS = "grains"
    OTHER = "other"

class FoodItemSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=150)
    portion_g: float = Field(ge=0)
    category: FoodCategory

    @field_validator("id", "name", mode="before")
    @classmethod
    def clean_food_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


class MealRecordSchema(BaseModel):
    id: str
    meal_type: str # breakfast, lunch, dinner, custom_meals, snacks
    items: List[FoodItemSchema] = Field(default_factory=list)

class FoodHabitsSchema(BaseModel):
    meals: List[MealRecordSchema] = Field(default_factory=list)
    
    # Legacy field
    diet_type: Optional[FoodHabit] = None

    @model_validator(mode='after')
    def compute_legacy_fields(self):
        total_weight = 0.0
        meat_weight = 0.0
        animal_weight = 0.0
        
        for meal in self.meals:
            for item in meal.items:
                total_weight += item.portion_g
                if item.category == FoodCategory.BEEF:
                    meat_weight += item.portion_g
                    animal_weight += item.portion_g
                elif item.category in [FoodCategory.POULTRY, FoodCategory.FISH]:
                    meat_weight += item.portion_g
                    animal_weight += item.portion_g
                elif item.category == FoodCategory.DAIRY:
                    animal_weight += item.portion_g
        
        if total_weight == 0:
            self.diet_type = FoodHabit.MIXED
            return self
            
        meat_ratio = meat_weight / total_weight
        animal_ratio = animal_weight / total_weight
        
        if meat_ratio > 0.25:
            self.diet_type = FoodHabit.HIGH_MEAT
        elif meat_ratio > 0:
            self.diet_type = FoodHabit.MIXED
        elif animal_ratio > 0:
            self.diet_type = FoodHabit.VEGETARIAN
        else:
            self.diet_type = FoodHabit.VEGAN
            
        return self

class ClothingItemsSchema(BaseModel):
    shirts: int = Field(ge=0, default=0)
    pants: int = Field(ge=0, default=0)
    outerwear: int = Field(ge=0, default=0)
    shoes: int = Field(ge=0, default=0)

class ElectronicsItemsSchema(BaseModel):
    phones: int = Field(ge=0, default=0)
    laptops: int = Field(ge=0, default=0)
    tvs: int = Field(ge=0, default=0)
    accessories: int = Field(ge=0, default=0)

class LargePurchaseCategory(str, Enum):
    FURNITURE = "furniture"
    APPLIANCES = "appliances"
    EV_VEHICLE = "ev_vehicle"
    GAS_VEHICLE = "gas_vehicle"
    OTHER = "other"

class LargePurchaseSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    item_name: str = Field(..., min_length=1, max_length=150)
    cost_usd: float = Field(ge=0)
    purchase_date: str
    category: LargePurchaseCategory

    @field_validator("id", "item_name", mode="before")
    @classmethod
    def clean_large_purchase_fields(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


class ShoppingSchema(BaseModel):
    clothing_items: ClothingItemsSchema = Field(default_factory=ClothingItemsSchema)
    electronics_items: ElectronicsItemsSchema = Field(default_factory=ElectronicsItemsSchema)
    food_deliveries_per_week: int = Field(ge=0, default=0)
    package_deliveries_per_week: int = Field(ge=0, default=0)
    large_purchases: List[LargePurchaseSchema] = Field(default_factory=list)
    
    # Legacy fields
    monthly_purchases_usd: Optional[float] = None
    clothing_purchases_per_month: Optional[int] = None
    electronics_purchases_per_year: Optional[int] = None

    @model_validator(mode='after')
    def compute_legacy_fields(self):
        self.clothing_purchases_per_month = (
            self.clothing_items.shirts + 
            self.clothing_items.pants + 
            self.clothing_items.outerwear + 
            self.clothing_items.shoes
        )
        
        self.electronics_purchases_per_year = (
            self.electronics_items.phones + 
            self.electronics_items.laptops + 
            self.electronics_items.tvs + 
            self.electronics_items.accessories
        )
        
        clothing_spend = (
            self.clothing_items.shirts * 30 +
            self.clothing_items.pants * 50 +
            self.clothing_items.outerwear * 100 +
            self.clothing_items.shoes * 80
        )
        electronics_spend = (
            self.electronics_items.phones * 800 +
            self.electronics_items.laptops * 1200 +
            self.electronics_items.tvs * 600 +
            self.electronics_items.accessories * 50
        ) / 12.0
        
        delivery_spend = (
            self.food_deliveries_per_week * 20 + 
            self.package_deliveries_per_week * 40
        ) * 4.33
        
        large_spend = sum(p.cost_usd for p in self.large_purchases) / 12.0
        
        self.monthly_purchases_usd = clothing_spend + electronics_spend + delivery_spend + large_spend
        return self

class AssessmentCreateRequest(BaseModel):
    transportation: TransportationSchema
    home_energy: HomeEnergySchema
    food_habits: FoodHabitsSchema
    shopping: ShoppingSchema

class AssessmentResponse(AssessmentCreateRequest):
    id: str
    user_id: str
    calculated_footprint_tons: Optional[float] = None
    carbon_score: Optional[int] = None
    emissions_breakdown: Optional[dict] = None
    created_at: str
