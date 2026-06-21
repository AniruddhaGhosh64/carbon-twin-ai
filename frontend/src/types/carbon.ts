// Shared Type Definitions for CarbonTwin AI

export interface SimulatorLevers {
  use_metro: boolean;
  reduce_meat: boolean;
  carpool: boolean;
  cycle_days: number;
  reduce_electricity: number;
  reduce_driving_percentage: number;
  flight_reduction_count: number;
  solar_adoption: boolean;
  appliance_optimization: boolean;
  reduce_beef_percentage: number;
  diet_transition: string;
  reduce_deliveries_percentage: number;
  reduce_clothing_percentage: number;
  reduce_electronics_percentage: number;
  reduce_electricity_percentage: number;
}

export interface ProjectionTimeline {
  six_months: number;
  one_year: number;
  five_years: number;
  ten_years: number;
}

export interface SimulatorResponse {
  id?: string;
  user_id: string;
  base_emissions_kg: number;
  simulated_emissions_kg: number;
  reduction_percentage: number;
  base_carbon_score: number;
  simulated_carbon_score: number;
  money_saved_usd: number;
  money_spent_usd: number;
  roi_percentage: number;
  break_even_years: number;
  trees_equivalent: number;
  emissions_projection: ProjectionTimeline;
  savings_projection: ProjectionTimeline;
  saved_at?: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  saved_at: string;
  reduction_percentage: number;
  base_emissions_kg: number;
  simulated_emissions_kg: number;
  money_saved_usd: number;
  money_spent_usd: number;
  roi_percentage: number;
  break_even_years: number;
  trees_equivalent: number;
  levers: SimulatorLevers;
}

export interface CategoryEmissions {
  transportation: number;
  energy: number;
  food: number;
  shopping: number;
}

export interface ProgressPoint {
  id: string;
  user_id: string;
  date: string;
  carbon_score: number;
  emissions_kg: number;
  updated_at: string;
  breakdown?: CategoryEmissions;
}

export interface OverviewData {
  total_carbon_reduced_kg: number;
  total_money_saved_usd: number;
  score_improvement: number;
  completion_rate: number;
  comparison: {
    baseline: number;
    current: number;
    target: number;
    gap_remaining: number;
  };
  streaks: {
    current_eco_streak: number;
    longest_eco_streak: number;
    completion_streak: number;
  };
}

export interface CategoryPerf {
  projected_savings_kg: number;
  actual_savings_kg: number;
  variance_percentage: number;
}

export interface ActionPerf {
  action_id: string;
  title: string;
  projected_savings_kg: number;
  actual_savings_kg: number;
  success_rate: number;
}

export interface BadgeProgress {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  unlocked_at?: string;
  progress_percentage: number;
}

export interface AchievementsData {
  total_xp: number;
  badges: BadgeProgress[];
}

export interface ProgressData {
  history: ProgressPoint[];
  overview: OverviewData | null;
  performance: {
    categories: Record<string, CategoryPerf>;
    actions: ActionPerf[];
  } | null;
  achievements: AchievementsData | null;
}

export interface CarbonData {
  total_kg: number;
  total_tons: number;
  carbon_score: number;
  breakdown: {
    transportation: number;
    energy: number;
    food: number;
    shopping: number;
  };
}

export interface TwinState {
  transportation_kg: number;
  energy_kg: number;
  food_kg: number;
  shopping_kg: number;
  total_kg: number;
  carbon_score: number;
}

export interface TwinRecommendationItem {
  id: string;
  title: string;
  category: string;
  description: string;
  emissions_reduction_kg: number;
  money_saved_usd: number;
  accepted: boolean;
  confidence_percentage: number;
}

export interface TwinNarrative {
  summary: string;
  biggest_contributor: string;
  biggest_opportunity: string;
  projected_reduction: string;
  future_self_message: string;
}

export interface TwinProfile {
  archetype: string;
  strengths: string[];
  weaknesses: string[];
  risk_areas: string[];
  opportunity_areas: string[];
}

export interface TwinData {
  current_state: TwinState;
  future_state: TwinState;
  potential_state: TwinState;
  current_profile: TwinProfile;
  future_profile: TwinProfile;
  potential_profile: TwinProfile;
  reduction_percentage: number;
  money_saved_usd: number;
  carbon_score_improvement: number;
  applied_rules: string[];
  recommendations: TwinRecommendationItem[];
  narrative: string | TwinNarrative;
  configuration_snapshot?: {
    timestamp: string;
    scenario_name: string;
    assumptions: Record<string, unknown>;
    horizon: string;
  };
}

export interface EcoAction {
  id: string;
  action_title: string;
  category: string;
  impact_level: string;
  difficulty: string;
  estimated_savings_usd: number;
  description: string;
}

export interface RecommendationData {
  highest_emission_category: string;
  recommendations: EcoAction[];
  explanation: string;
}

export interface AssessmentData {
  transportation: {
    tracking_unit: string;
    vehicle_type: string;
    flight_records: Array<{
      id?: string;
      date: string;
      source_airport: string;
      destination_airport: string;
      trip_type: string;
      distance_km: number;
      carbon_emissions_kg: number;
    }>;
  };
  home_energy: {
    household_size: number;
    monthly_electricity_bill_inr: number;
    solar_tier: string;
    appliances: Array<{
      id: string;
      name: string;
      type: string;
      quantity: number;
      daily_usage_hours: number;
      power_watts: number;
    }>;
  };
  food_habits: {
    meals: Array<{
      id: string;
      meal_type: string;
      items: Array<{
        id: string;
        name: string;
        portion_g: number;
        category: string;
      }>;
    }>;
  };
  shopping: {
    clothing_items: {
      shirts: number;
      pants: number;
      outerwear: number;
      shoes: number;
    };
    electronics_items: {
      phones: number;
      laptops: number;
      tvs: number;
      accessories: number;
    };
    food_deliveries_per_week: number;
    package_deliveries_per_week: number;
    large_purchases: Array<{
      id: string;
      item_name: string;
      cost_usd: number;
      purchase_date: string;
      category: string;
    }>;
  };
}

export interface ChatMessage {
  role: "user" | "model" | string;
  content: string;
}

export interface ChatResponse {
  response: string;
}

export interface FoodItem {
  id: string;
  name: string;
  portion_g: number;
  category: "meat" | "fish" | "dairy" | "plant" | "beverage" | "other" | string;
  checked?: boolean;
  confidence?: number;
}

export interface MissionConfig {
  target_frequency: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface MissionCheckIn {
  date: string;
  status: string;
  verified_auto: boolean;
}

export interface EcoMission {
  id: string;
  user_id: string;
  action_id: string;
  title: string;
  description: string;
  source: "dashboard" | "coach" | "twin" | "simulator" | "manual";
  status: "suggested" | "active" | "completed" | "archived";
  carbon_reduction_kg: number;
  money_saved_usd: number;
  effort_level: "low" | "moderate" | "high" | "transformational";
  success_probability: number;
  config?: MissionConfig;
  check_ins: MissionCheckIn[];
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  image: string | null;
  providers: string[];
}

export interface DashboardOverviewResponse {
  carbonData: CarbonData | null;
  twinData: TwinData | null;
  recommendationData: RecommendationData | null;
  assessment: AssessmentData | null;
  progress: ProgressData | null;
}

export interface MissionsResponse {
  suggested?: EcoMission[];
  active?: EcoMission[];
  completed?: EcoMission[];
}

export interface ExtractedMealItem {
  name: string;
  category: string;
  confidence?: number;
}

export interface FoodExtractResponse {
  success: boolean;
  data: {
    items: ExtractedMealItem[];
  };
}
