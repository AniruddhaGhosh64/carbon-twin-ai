from pydantic import BaseModel, Field
from typing import List, Optional

class CategoryEmissions(BaseModel):
    transportation: float
    energy: float
    food: float
    shopping: float

class ProgressEntry(BaseModel):
    id: str
    user_id: str
    date: str
    carbon_score: int
    emissions_kg: float
    updated_at: str
    breakdown: Optional[CategoryEmissions] = None

class ProgressHistoryResponse(BaseModel):
    history: List[ProgressEntry]

class TargetComparison(BaseModel):
    baseline: float
    current: float
    target: float
    gap_remaining: float

class ActionPerformanceItem(BaseModel):
    action_id: str
    title: str
    projected_savings_kg: float
    actual_savings_kg: float
    success_rate: float

class StreakStats(BaseModel):
    current_eco_streak: int
    longest_eco_streak: int
    completion_streak: int

class ProgressOverviewResponse(BaseModel):
    total_carbon_reduced_kg: float
    total_money_saved_usd: float
    score_improvement: int
    completion_rate: float
    comparison: TargetComparison
    streaks: StreakStats

class BadgeProgress(BaseModel):
    id: str
    title: str
    description: str
    earned: bool
    unlocked_at: Optional[str] = None
    progress_percentage: float

class AchievementsResponse(BaseModel):
    total_xp: int
    badges: List[BadgeProgress]
