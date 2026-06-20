from pydantic import BaseModel
from typing import List, Optional, Union

class TwinState(BaseModel):
    transportation_kg: float
    energy_kg: float
    food_kg: float
    shopping_kg: float
    total_kg: float
    carbon_score: int

class TwinRecommendationItem(BaseModel):
    id: str
    title: str
    category: str
    description: str
    emissions_reduction_kg: float
    money_saved_usd: float
    accepted: bool
    confidence_percentage: int

class CarbonTwinRequest(BaseModel):
    accepted_rules: Optional[List[str]] = None

class TwinConfigurationSnapshot(BaseModel):
    timestamp: str
    scenario_name: str
    assumptions: dict
    horizon: str

class CarbonTwinNarrative(BaseModel):
    summary: str
    biggest_contributor: str
    biggest_opportunity: str
    projected_reduction: str
    future_self_message: str

class TwinProfile(BaseModel):
    archetype: str
    strengths: List[str]
    weaknesses: List[str]
    risk_areas: List[str]
    opportunity_areas: List[str]

class CarbonTwinResponse(BaseModel):
    current_state: TwinState
    future_state: TwinState
    potential_state: TwinState
    current_profile: TwinProfile
    future_profile: TwinProfile
    potential_profile: TwinProfile
    reduction_percentage: float
    money_saved_usd: float
    carbon_score_improvement: int
    applied_rules: List[str]
    recommendations: List[TwinRecommendationItem]
    narrative: Union[str, CarbonTwinNarrative]
    configuration_snapshot: Optional[TwinConfigurationSnapshot] = None

from app.schemas.simulator import SimulatorLevers

class ApplySimulationRequest(BaseModel):
    scenario_name: str
    horizon: str
    levers: SimulatorLevers



