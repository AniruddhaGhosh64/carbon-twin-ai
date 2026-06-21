"use client";

import { useState, useMemo } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Link from "next/link";
import {
  ArrowRight,
  AlertCircle,
  Plane,
  Cookie,
  Zap,
  Sparkles,
  Plus,
  Leaf
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useCarbon } from "@/context/CarbonContext";

// Import extracted sub-components
import { DashboardMetricsGrid } from "@/components/dashboard/DashboardMetricsGrid";
import { DashboardBreakdownCard } from "@/components/dashboard/DashboardBreakdownCard";
import { DashboardCoachCard } from "@/components/dashboard/DashboardCoachCard";
import { DashboardActivityCenter } from "@/components/dashboard/DashboardActivityCenter";

function DashboardPage() {
  const [dashboardMode, setDashboardMode] = useState<"executive" | "activity">("executive");
  const [carbonScoreView, setCarbonScoreView] = useState<"lifestyle" | "national">("lifestyle");
  const [timeScope, setTimeScope] = useState<"week" | "month" | "year">("year");
  const [chartView, setChartView] = useState<"bar" | "pie">("bar");

  const {
    carbonData,
    twinData,
    recommendationData,
    latestAssessment,
    isLoading
  } = useCarbon();

  // ----------------------------------------------------
  // Executive Overview Calculations & Scaling
  // ----------------------------------------------------
  const totalAnnualKg = carbonData ? carbonData.total_kg : 0;
  const carbonScore = carbonData ? carbonData.carbon_score : 0;

  // Scale emissions values based on scope
  const scaleEmissions = useMemo(() => (kgValue: number) => {
    let scaled = kgValue;
    if (timeScope === "month") scaled = kgValue / 12;
    if (timeScope === "week") scaled = kgValue / 52;
    return scaled;
  }, [timeScope]);

  const formatEmissions = useMemo(() => (kgValue: number) => {
    const scaled = scaleEmissions(kgValue);
    if (scaled >= 1000) {
      return `${(scaled / 1000).toFixed(2)} T`;
    }
    return `${Math.round(scaled).toLocaleString()} kg`;
  }, [scaleEmissions]);

  // Sector Breakdown data points (scaled)
  const breakdownData = useMemo(() => {
    if (!carbonData) return [];
    return [
      { name: "Transport", value: scaleEmissions(carbonData.breakdown.transportation), color: "#95d4b3", raw: carbonData.breakdown.transportation },
      { name: "Food", value: scaleEmissions(carbonData.breakdown.food), color: "#a5d0b9", raw: carbonData.breakdown.food },
      { name: "Energy", value: scaleEmissions(carbonData.breakdown.energy), color: "#2D6A4F", raw: carbonData.breakdown.energy },
      { name: "Shopping", value: scaleEmissions(carbonData.breakdown.shopping), color: "#29513f", raw: carbonData.breakdown.shopping },
    ];
  }, [scaleEmissions, carbonData]);

  const totalEmissionsInScope = scaleEmissions(totalAnnualKg);
  const getPct = useMemo(() => (valInScope: number) => {
    return totalEmissionsInScope > 0 ? `${((valInScope / totalEmissionsInScope) * 100).toFixed(1)}%` : "0%";
  }, [totalEmissionsInScope]);

  // Potential Reduction & Money Saved (scaled)
  const baseEmissionsTwin = twinData ? twinData.current_state.total_kg : totalAnnualKg;
  const futureEmissionsTwin = twinData ? twinData.future_state.total_kg : totalAnnualKg;
  const reductionPercentage = twinData ? twinData.reduction_percentage : 0;
  const annualSavedKg = Math.max(0, baseEmissionsTwin - futureEmissionsTwin);
  const savedEmissionsText = formatEmissions(annualSavedKg);

  const annualSavingsUsd = twinData ? twinData.money_saved_usd : 0;
  const scaledSavingsUsd = timeScope === "year" ? annualSavingsUsd : timeScope === "month" ? annualSavingsUsd / 12 : annualSavingsUsd / 52;

  // Biggest Contributor Calculation
  const { biggestCategory, biggestPercentage, biggestRecommendation } = useMemo(() => {
    if (!carbonData) return { biggestCategory: "none", biggestPercentage: "0", biggestRecommendation: "" };
    let category = "transportation";
    let val = 0;
    Object.entries(carbonData.breakdown).forEach(([k, v]) => {
      if (v > val) {
        val = v;
        category = k;
      }
    });

    const pct = totalAnnualKg > 0 ? ((val / totalAnnualKg) * 100).toFixed(0) : "0";

    const recommendations = {
      transportation: "Opt for public transit or active cycling for commutes, and log flights carefully.",
      energy: "Increase solar setup tier and configure efficient thermostat daily hours.",
      food: "Focus on switching high-impact meats (like beef) to plant proteins or grains.",
      shopping: "Reduce monthly discretionary retail spend and aggregate delivery packages."
    };

    const rec = recommendationData?.recommendations?.find(
      r => r.category === category
    )?.action_title || recommendations[category as keyof typeof recommendations] || "Consider optimizing this category to lower your footprint.";

    return { biggestCategory: category, biggestPercentage: pct, biggestRecommendation: rec };
  }, [carbonData, totalAnnualKg, recommendationData?.recommendations]);

  // National Comparison data (National Average is 6.2 Tons per year)
  const nationalAverageTonsAnnual = 6.2;
  const nationalAverageTonsInScope = timeScope === "year" ? nationalAverageTonsAnnual : timeScope === "month" ? nationalAverageTonsAnnual / 12 : nationalAverageTonsAnnual / 52;
  
  const userTonsInScope = scaleEmissions(totalAnnualKg) / 1000;
  const pctDiffFromNational = ((userTonsInScope - nationalAverageTonsInScope) / nationalAverageTonsInScope) * 100;
  const isLowerThanNational = pctDiffFromNational < 0;

  // ----------------------------------------------------
  // Activity Center Data Resolving (Raw logs)
  // ----------------------------------------------------
  const recentFlights = latestAssessment?.transportation?.flight_records || [];
  
  // Flatten logged food items
  const recentFoodItems = useMemo(() => {
    const items: Array<{ id: string; name: string; portion_g: number; category: string; meal_type: string }> = [];
    const meals = latestAssessment?.food_habits?.meals || [];
    meals.forEach(meal => {
      meal.items.forEach(item => {
        items.push({
          id: item.id,
          name: item.name,
          portion_g: item.portion_g,
          category: item.category,
          meal_type: meal.meal_type
        });
      });
    });
    return items;
  }, [latestAssessment?.food_habits?.meals]);

  // Active home energy appliances
  const activeAppliances = latestAssessment?.home_energy?.appliances?.filter(a => a.quantity > 0) || [];

  // Shopping activities
  const largePurchases = latestAssessment?.shopping?.large_purchases || [];
  const clothingCount = latestAssessment?.shopping?.clothing_items 
    ? Object.values(latestAssessment.shopping.clothing_items).reduce((s, v) => s + v, 0)
    : 0;
  const electronicsCount = latestAssessment?.shopping?.electronics_items
    ? Object.values(latestAssessment.shopping.electronics_items).reduce((s, v) => s + v, 0)
    : 0;
  const foodDeliveriesVal = latestAssessment?.shopping?.food_deliveries_per_week || 0;
  const packageDeliveriesVal = latestAssessment?.shopping?.package_deliveries_per_week || 0;

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-body-sm text-on-surface-variant">Loading your CarbonTwin dashboard...</p>
      </div>
    );
  }

  // If no calculations or assessment exists yet, prompt user to fill out footprint
  if (!carbonData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border border-glass bg-glass shadow-glow p-8 text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 text-primary">
            <Leaf className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold">Baseline Your Carbon Footprint</CardTitle>
            <CardDescription className="text-body-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              You haven&apos;t completed your carbon footprint assessment yet. Baseline your transportation, energy, food, and shopping habits to unlock your dynamic dashboard.
            </CardDescription>
          </div>
          <Link
            href="/footprint"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-body-sm font-bold text-on-primary hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            Start Assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      
      {/* 1. Header / Mode Selector & Time Scope */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass pb-6">
        <div className="text-left space-y-1">
          <h1 className="text-headline-lg font-bold text-on-surface">
            {dashboardMode === "executive" ? "Executive Overview" : "Activity Center"}
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            {dashboardMode === "executive" 
              ? "Your real-time environmental footprint and optimization metrics." 
              : "Historical and recent logs submitted across all lifestyle domains."
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Dashboard Mode Selector */}
          <div role="tablist" aria-label="Dashboard View Mode" className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass">
            <button
              role="tab"
              id="tab-executive"
              aria-selected={dashboardMode === "executive"}
              aria-controls="panel-executive"
              onClick={() => setDashboardMode("executive")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none",
                dashboardMode === "executive" 
                  ? "bg-primary text-on-primary shadow-glow font-bold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Executive Overview
            </button>
            <button
              role="tab"
              id="tab-activity"
              aria-selected={dashboardMode === "activity"}
              aria-controls="panel-activity"
              onClick={() => setDashboardMode("activity")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none",
                dashboardMode === "activity" 
                  ? "bg-primary text-on-primary shadow-glow font-bold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Activity Center
            </button>
          </div>

          {/* Time Scope Toggle */}
          <div role="tablist" aria-label="Timeframe Scope" className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass">
            {(["week", "month", "year"] as const).map((scope) => (
              <button
                key={scope}
                role="tab"
                id={`tab-time-${scope}`}
                aria-selected={timeScope === scope}
                onClick={() => setTimeScope(scope)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all capitalize focus-visible:ring-2 focus-visible:ring-primary focus:outline-none",
                  timeScope === scope 
                    ? "bg-primary/20 border border-primary/20 text-primary font-bold" 
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {scope}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dashboardMode === "executive" ? (
        /* ========================================================
           EXECUTIVE OVERVIEW MODE
           ======================================================== */
        <div id="panel-executive" role="tabpanel" aria-labelledby="tab-executive" className="space-y-stack-lg animate-fade-in outline-none">
          
          {/* Row 1: Key Metrics Grid */}
          <DashboardMetricsGrid
            carbonScore={carbonScore}
            carbonScoreView={carbonScoreView}
            setCarbonScoreView={setCarbonScoreView}
            isLowerThanNational={isLowerThanNational}
            pctDiffFromNational={pctDiffFromNational}
            nationalAverageTonsInScope={nationalAverageTonsInScope}
            userTonsInScope={userTonsInScope}
            timeScope={timeScope}
            totalAnnualKg={totalAnnualKg}
            scaleEmissions={scaleEmissions}
            reductionPercentage={reductionPercentage}
            savedEmissionsText={savedEmissionsText}
            scaledSavingsUsd={scaledSavingsUsd}
          />

          {/* Row 2: Breakdown & AI Coach */}
          <div className="grid gap-gutter lg:grid-cols-3">
            <DashboardBreakdownCard
              breakdownData={breakdownData}
              chartView={chartView}
              setChartView={setChartView}
              getPct={getPct}
              formatEmissions={formatEmissions}
            />

            <DashboardCoachCard
              explanation={recommendationData?.explanation}
              biggestCategory={biggestCategory}
            />
          </div>

          {/* Row 3: Biggest Contributor & Quick Actions */}
          <div className="grid gap-gutter md:grid-cols-3">
            {/* Biggest Contributor */}
            <Card className="md:col-span-1 border border-glass bg-glass-panel relative overflow-hidden text-left">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-error" />
                  <CardTitle className="text-base font-bold text-on-surface">Biggest Contributor</CardTitle>
                </div>
                <CardDescription>Highest emitting segment of your footprint.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-primary capitalize">{biggestCategory}</span>
                  <span className="text-2xl font-black text-error">{biggestPercentage}%</span>
                </div>
                <div className="text-xs text-on-surface-variant leading-relaxed">
                  <span className="font-bold text-on-surface block mb-1">Recommendation:</span>
                  {biggestRecommendation}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <Card className="md:col-span-2 border border-glass text-left">
              <CardHeader>
                <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
                <CardDescription>Submit logs or run calculations directly.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Link
                  href="/footprint?tab=transportation"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-center transition-all hover:border-primary/20 group"
                >
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Plane className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-on-surface">Add Flight</span>
                </Link>

                <Link
                  href="/footprint?tab=food"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-center transition-all hover:border-primary/20 group"
                >
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Cookie className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-on-surface">Add Meal</span>
                </Link>

                <Link
                  href="/footprint?tab=energy"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-center transition-all hover:border-primary/20 group"
                >
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Zap className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-on-surface">Add Appliance</span>
                </Link>

                <Link
                  href="/simulator"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-center transition-all hover:border-primary/20 group"
                >
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-on-surface">Run Simulation</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ========================================================
           ACTIVITY CENTER MODE
           ======================================================== */
        <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity" className="space-y-stack-lg outline-none">
          <DashboardActivityCenter
            recentFlights={recentFlights}
            recentFoodItems={recentFoodItems}
            activeAppliances={activeAppliances}
            largePurchases={largePurchases}
            clothingCount={clothingCount}
            electronicsCount={electronicsCount}
            foodDeliveriesVal={foodDeliveriesVal}
            packageDeliveriesVal={packageDeliveriesVal}
          />

          {/* Quick Actions in Activity Center */}
          <Card className="border border-glass text-left">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href="/footprint?tab=transportation"
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-all hover:border-primary/20"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Flight
              </Link>
              <Link
                href="/footprint?tab=food"
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-all hover:border-primary/20"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Meal
              </Link>
              <Link
                href="/footprint?tab=energy"
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-all hover:border-primary/20"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Appliance
              </Link>
              <Link
                href="/simulator"
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-glass bg-surface-container-low hover:bg-surface-container text-xs font-bold text-on-surface transition-all hover:border-primary/20"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Run Simulation
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}

export default function WrappedDashboardPage() {
  return (
    <ErrorBoundary fallbackName="Dashboard Overview">
      <DashboardPage />
    </ErrorBoundary>
  );
}
