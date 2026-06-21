"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { 
  CarbonData, 
  TwinData, 
  RecommendationData, 
  AssessmentData, 
  ProgressData,
  DashboardOverviewResponse
} from "@/types/carbon";
import api from "@/lib/api/client";
import logger from "@/lib/logger";

interface CarbonContextType {
  carbonData: CarbonData | null;
  setCarbonData: (data: CarbonData) => void;
  twinData: TwinData | null;
  recommendationData: RecommendationData | null;
  latestAssessment: AssessmentData | null;
  progressData: ProgressData | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  calculateFootprint: (payload: AssessmentData) => Promise<boolean>;
  fetchLatestCalculation: (regenerate?: boolean) => Promise<boolean>;
  updateTwinCustomization: (acceptedRules: string[]) => Promise<boolean>;
}

const CarbonContext = createContext<CarbonContextType | undefined>(undefined);

export function CarbonProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id || session?.user?.email || "default_user";

  const fetcher = (path: string) => api.get<DashboardOverviewResponse>(path, { userId });

  const { data, error: swrError, isLoading: swrLoading, mutate } = useSWR(
    userId ? "/api/v1/dashboard/overview" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes cache
    }
  );

  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const carbonData = data?.carbonData || null;
  const twinData = data?.twinData || null;
  const recommendationData = data?.recommendationData || null;
  const latestAssessment = data?.assessment || null;
  const progressData = data?.progress || null;

  const isLoading = swrLoading || localIsLoading;
  const error = localError || (swrError ? swrError.message : null);

  const calculateFootprint = async (payload: AssessmentData) => {
    setLocalIsLoading(true);
    setLocalError(null);
    try {
      await api.post("/api/v1/footprint/calculate", payload, { userId });
      await mutate();
      return true;
    } catch (err: unknown) {
      logger.error("Calculation failed", err);
      setLocalError(err instanceof Error ? err.message : "Failed to calculate footprint");
      return false;
    } finally {
      setLocalIsLoading(false);
    }
  };

  const updateTwinCustomization = async (acceptedRules: string[]) => {
    setLocalIsLoading(true);
    setLocalError(null);
    try {
      await api.post("/api/v1/carbontwin/generate", { accepted_rules: acceptedRules }, { userId });
      await mutate();
      return true;
    } catch (err: unknown) {
      logger.error("Customization failed", err);
      setLocalError(err instanceof Error ? err.message : "Failed to update custom twin");
      return false;
    } finally {
      setLocalIsLoading(false);
    }
  };

  const fetchLatestCalculation = async (regenerate: boolean = false) => {
    setLocalIsLoading(true);
    try {
      if (regenerate) {
        await api.get("/api/v1/carbontwin/latest?regenerate=true", { userId });
      }
      await mutate();
      return true;
    } catch (err) {
      logger.error("Failed to refresh/regenerate twin data", err);
      return false;
    } finally {
      setLocalIsLoading(false);
    }
  };

  return (
    <CarbonContext.Provider
      value={{
        carbonData,
        setCarbonData: () => {},
        twinData,
        recommendationData,
        latestAssessment,
        progressData,
        isLoading,
        setIsLoading: setLocalIsLoading,
        error,
        setError: setLocalError,
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

