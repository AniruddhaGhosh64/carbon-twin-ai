"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getApiUrl } from "@/lib/api";

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

interface CarbonContextType {
  carbonData: CarbonData | null;
  setCarbonData: (data: CarbonData) => void;
  twinData: TwinData | null;
  recommendationData: RecommendationData | null;
  latestAssessment: AssessmentData | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  calculateFootprint: (payload: unknown) => Promise<boolean>;
  fetchLatestCalculation: (regenerate?: boolean) => Promise<boolean>;
  updateTwinCustomization: (acceptedRules: string[]) => Promise<boolean>;
}

const CarbonContext = createContext<CarbonContextType | undefined>(undefined);

export function CarbonProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id || session?.user?.email || "default_user";

  const [carbonData, setCarbonData] = useState<CarbonData | null>(null);
  const [twinData, setTwinData] = useState<TwinData | null>(null);
  const [recommendationData, setRecommendationData] = useState<RecommendationData | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<AssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestCalculation = async (regenerate: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch latest calculation
      const response = await fetch(getApiUrl("/api/v1/footprint/latest"), {
        headers: { "X-User-Id": userId },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setIsLoading(false);
          return false;
        }
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setCarbonData(result.data);
        
        // Parallel fetches for details, failing gracefully
        await Promise.allSettled([
          // Fetch raw assessment
          fetch(getApiUrl("/api/v1/footprint/assessment/latest"), {
            headers: { "X-User-Id": userId },
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && data.success) setLatestAssessment(data.data);
            })
            .catch(err => console.error("Failed to fetch raw assessment:", err)),

          // Fetch carbon twin
          fetch(getApiUrl(`/api/v1/carbontwin/latest${regenerate ? "?regenerate=true" : ""}`), {
            headers: { "X-User-Id": userId },
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) setTwinData(data);
            })
            .catch(err => console.error("Failed to fetch twin:", err)),

          // Fetch recommendations
          fetch(getApiUrl("/api/v1/dashboard/generate"), {
            method: "POST",
            headers: { "X-User-Id": userId },
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) setRecommendationData(data);
            })
            .catch(err => console.error("Failed to fetch recommendations:", err))
        ]);

        return true;
      }
      return false;
    } catch (err: unknown) {
      console.error("Failed to fetch latest calculation:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFootprint = async (payload: unknown) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/v1/footprint/calculate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        setCarbonData({
          total_kg: result.data.emissions_breakdown.transportation + 
                    result.data.emissions_breakdown.energy + 
                    result.data.emissions_breakdown.food + 
                    result.data.emissions_breakdown.shopping,
          total_tons: result.data.calculated_footprint_tons,
          carbon_score: result.data.carbon_score,
          breakdown: result.data.emissions_breakdown
        });

        // Trigger updates for other endpoints
        await fetchLatestCalculation();
        return true;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: unknown) {
      console.error("Calculation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate footprint");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTwinCustomization = async (acceptedRules: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl("/api/v1/carbontwin/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({ accepted_rules: acceptedRules }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update customized twin: ${response.statusText}`);
      }

      const data = await response.json();
      setTwinData(data);
      return true;
    } catch (err: unknown) {
      console.error("Customization failed:", err);
      setError(err instanceof Error ? err.message : "Failed to update custom twin");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestCalculation();
  }, [userId]);

  return (
    <CarbonContext.Provider
      value={{
        carbonData,
        setCarbonData,
        twinData,
        recommendationData,
        latestAssessment,
        isLoading,
        setIsLoading,
        error,
        setError,
        calculateFootprint,
        fetchLatestCalculation,
        updateTwinCustomization,
      }}
    >
      {children}
    </CarbonContext.Provider>
  );
}

export function useCarbon() {
  const context = useContext(CarbonContext);
  if (context === undefined) {
    throw new Error("useCarbon must be used within a CarbonProvider");
  }
  return context;
}
