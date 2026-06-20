from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.core.security import sanitize_string

class SimulatorLevers(BaseModel):
    use_metro: bool = Field(default=False, description="Whether the user switched to public transit/metro")
    reduce_meat: bool = Field(default=False, description="Whether the user reduced meat consumption")
    carpool: bool = Field(default=False, description="Whether the user carpools")
    cycle_days: int = Field(default=0, ge=0, le=7, description="Number of days the user cycles per week")
    reduce_electricity: int = Field(default=0, ge=0, le=100, description="Percentage electricity reduction")
    
    # Redesigned Levers
    reduce_driving_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage of baseline driving reduced")
    flight_reduction_count: int = Field(default=0, ge=0, description="Annual flights reduced")
    solar_adoption: bool = Field(default=False, description="Switch energy provider to solar panels")
    appliance_optimization: bool = Field(default=False, description="Appliance efficiency upgrades")
    reduce_beef_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage beef consumption reduction")
    diet_transition: str = Field(default="none", description="Diet transition: none, balanced, vegetarian, vegan")
    reduce_deliveries_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage delivery frequency reduction")
    reduce_clothing_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage clothing purchases reduced")
    reduce_electronics_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage electronics purchases reduced")
    reduce_electricity_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage electricity reduction (redesigned)")

    @field_validator("diet_transition", mode="before")
    @classmethod
    def clean_diet_transition(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


class SimulatorRequest(BaseModel):
    levers: SimulatorLevers

class ScenarioSaveRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    levers: SimulatorLevers

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        return sanitize_string(v) if isinstance(v, str) else v


class ProjectionTimeline(BaseModel):
    six_months: float
    one_year: float
    five_years: float
    ten_years: float

class SimulatorResponse(BaseModel):
    id: Optional[str] = None
    user_id: str
    base_emissions_kg: float
    simulated_emissions_kg: float
    reduction_percentage: float
    base_carbon_score: int = Field(default=0)
    simulated_carbon_score: int = Field(default=0)
    money_saved_usd: float
    money_spent_usd: float = Field(default=0.0)
    roi_percentage: float = Field(default=0.0)
    break_even_years: float = Field(default=0.0)
    trees_equivalent: int
    emissions_projection: ProjectionTimeline
    savings_projection: ProjectionTimeline
    saved_at: Optional[str] = None
