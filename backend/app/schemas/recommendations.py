from pydantic import BaseModel
from typing import List

class EcoAction(BaseModel):
    id: str
    action_title: str
    category: str
    impact_level: str  # "High", "Medium", "Low"
    difficulty: str   # "Easy", "Moderate", "Hard"
    estimated_savings_usd: float
    description: str

class RecommendationResponse(BaseModel):
    highest_emission_category: str
    recommendations: List[EcoAction]
    explanation: str

class ToggleCommitmentRequest(BaseModel):
    action_id: str
    committed: bool

class CommitSimulationRequest(BaseModel):
    use_metro: bool = False
    reduce_meat: bool = False
    carpool: bool = False
    cycle_days: int = 0
    reduce_electricity: int = 0
    
    # Redesigned Levers
    reduce_driving_percentage: float = 0.0
    flight_reduction_count: int = 0
    solar_adoption: bool = False
    appliance_optimization: bool = False
    reduce_beef_percentage: float = 0.0
    diet_transition: str = "none"
    reduce_deliveries_percentage: float = 0.0
    reduce_clothing_percentage: float = 0.0
    reduce_electronics_percentage: float = 0.0
    reduce_electricity_percentage: float = 0.0



