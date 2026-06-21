"use client";

import { useState, useMemo } from "react";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import Link from "next/link";
import { 
  ArrowUpRight, 
  TrendingDown, 
  Leaf, 
  Wallet, 
  ChevronRight, 
  Sparkles, 
  BarChart2, 
  PieChart as PieIcon,
  Plane,
  Cookie,
  Zap,
  ShoppingBag,
  Plus,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useCarbon } from "@/context/CarbonContext";
import dynamic from "next/dynamic";

const DashboardPieChart = dynamic(
  () => import("@/components/charts/DashboardPieChart"),
  { ssr: false, loading: () => <div className="text-body-sm text-on-surface-variant">Loading Pie Chart...</div> }
);

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

  const getScopeLabel = () => {
    if (timeScope === "week") return "Week";
    if (timeScope === "month") return "Month";
    return "Year";
  };

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
          <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass">
            <button
              onClick={() => setDashboardMode("executive")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                dashboardMode === "executive" 
                  ? "bg-primary text-on-primary shadow-glow font-bold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Executive Overview
            </button>
            <button
              onClick={() => setDashboardMode("activity")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                dashboardMode === "activity" 
                  ? "bg-primary text-on-primary shadow-glow font-bold" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Activity Center
            </button>
          </div>

          {/* Time Scope Toggle (Visible in both modes or Overview specifically) */}
          <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass">
            {(["week", "month", "year"] as const).map((scope) => (
              <button
                key={scope}
                onClick={() => setTimeScope(scope)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
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
        <div className="space-y-stack-lg animate-fade-in">
          
          {/* Row 1: Key Metrics Grid */}
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Carbon Score Card (with Interactive Toggle) */}
            <Card hoverable className="relative overflow-hidden border border-glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-label-caps text-on-surface-variant">Score Card</span>
                <div className="flex bg-surface-container-low p-0.5 rounded-md border border-glass/40">
                  <button
                    onClick={() => setCarbonScoreView("lifestyle")}
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-semibold rounded",
                      carbonScoreView === "lifestyle" ? "bg-primary/20 text-primary font-bold" : "text-on-surface-variant"
                    )}
                  >
                    Score
                  </button>
                  <button
                    onClick={() => setCarbonScoreView("national")}
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-semibold rounded",
                      carbonScoreView === "national" ? "bg-primary/20 text-primary font-bold" : "text-on-surface-variant"
                    )}
                  >
                    National
                  </button>
                </div>
              </CardHeader>
              <CardContent className="min-h-[105px] flex flex-col justify-between">
                {carbonScoreView === "lifestyle" ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-display-lg text-primary font-bold">{carbonScore}</span>
                      <span className="text-body-sm text-on-surface-variant">/100</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-primary w-fit">
                      Lifestyle Score
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-title-md font-bold text-on-surface">
                        {isLowerThanNational 
                          ? `${Math.abs(pctDiffFromNational).toFixed(0)}% Lower`
                          : `${pctDiffFromNational.toFixed(0)}% Higher`
                        }
                      </span>
                      <span className="text-[10px] text-on-surface-variant mt-1 block">
                        Than National Avg ({nationalAverageTonsInScope.toFixed(2)} T)
                      </span>
                    </div>
                    {/* Visual Comparison Bar */}
                    <div className="w-full bg-surface-container-highest h-2 rounded-full mt-3 relative overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, (userTonsInScope / nationalAverageTonsInScope) * 100)}%` }}
                        className={cn("h-full rounded-full", isLowerThanNational ? "bg-primary" : "bg-error")} 
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Annual Emissions Card */}
            <Card hoverable className="border border-glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-label-caps text-on-surface-variant">
                  {getScopeLabel()} Emissions
                </span>
                <TrendingDown className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="min-h-[105px] flex flex-col justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-display-lg text-on-surface font-bold">
                    {(scaleEmissions(totalAnnualKg) / 1000).toFixed(2)}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">Tons CO₂e</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant w-fit">
                  Total: {Math.round(scaleEmissions(totalAnnualKg)).toLocaleString()} kg
                </span>
              </CardContent>
            </Card>

            {/* Potential Reduction Card */}
            <Card hoverable className="border border-glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-label-caps text-on-surface-variant">Potential Reduction</span>
                <ArrowUpRight className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent className="min-h-[105px] flex flex-col justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-display-lg text-secondary font-bold">{reductionPercentage.toFixed(0)}%</span>
                </div>
                <div className="space-y-2">
                  <div className="relative h-2 w-full rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-secondary transition-all" style={{ width: `${reductionPercentage}%` }} />
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-medium">
                    Offset up to {savedEmissionsText}/{getScopeLabel().toLowerCase()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Money Saved Card */}
            <Card hoverable className="border border-glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-label-caps text-on-surface-variant">Money Saved</span>
                <Wallet className="h-4 w-4 text-on-surface" />
              </CardHeader>
              <CardContent className="min-h-[105px] flex flex-col justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-display-lg text-on-surface font-bold">
                    ${scaledSavingsUsd.toFixed(2)}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">USD</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-primary w-fit">
                  Projected annual savings
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Breakdown, AI Coach & Biggest Contributor */}
          <div className="grid gap-gutter lg:grid-cols-3">
            
            {/* Footprint Breakdown */}
            <Card className="lg:col-span-2 border border-glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="text-left">
                  <CardTitle>Footprint Breakdown</CardTitle>
                  <CardDescription>Estimated carbon output per sector category.</CardDescription>
                </div>
                
                {/* View toggles: Bar vs Recharts Pie */}
                <div className="flex items-center gap-1 bg-surface-container-lowest border border-glass p-1 rounded-md">
                  <button
                    onClick={() => setChartView("bar")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      chartView === "bar" ? "bg-primary-container/20 text-primary border border-primary/20" : "text-on-surface-variant hover:text-on-surface"
                    )}
                    aria-label="Bar Chart View"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setChartView("pie")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      chartView === "pie" ? "bg-primary-container/20 text-primary border border-primary/20" : "text-on-surface-variant hover:text-on-surface"
                    )}
                    aria-label="Pie Chart View"
                  >
                    <PieIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {chartView === "bar" ? (
                  /* Segmented Bar View with percentages */
                  <div className="flex h-5 w-full overflow-hidden rounded-md bg-surface-container-highest animate-fade-in">
                    {breakdownData.map((item) => (
                      <div 
                        key={item.name}
                        className="h-full first:rounded-l-md last:rounded-r-md transition-all border-r border-surface last:border-r-0" 
                        style={{ 
                          width: getPct(item.value),
                          backgroundColor: item.color 
                        }}
                        title={`${item.name}: ${getPct(item.value)} (${formatEmissions(item.raw)})`}
                      />
                    ))}
                  </div>
                ) : (
                  /* Recharts Pie Chart View */
                  <div className="h-44 w-full flex items-center justify-center animate-fade-in">
                    <DashboardPieChart data={breakdownData} formatEmissions={formatEmissions} getPct={getPct} />
                  </div>
                )}

                {/* Category legend detail list */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                  {breakdownData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex flex-col text-left">
                        <span className="text-body-sm font-medium text-on-surface">{item.name}</span>
                        <span className="text-[11px] text-on-surface-variant mt-0.5">
                          {getPct(item.value)} ({formatEmissions(item.raw)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendation Widget powered by Carbon Coach */}
            <Card className="lg:col-span-1 border border-glass relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-300" />
              
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  <span className="text-label-caps text-primary">Carbon Coach AI</span>
                </div>
                <CardTitle className="pt-2 text-left text-base">Personalized Improvement</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between h-full pt-0 text-left min-h-[170px]">
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6 italic">
                  &ldquo;{recommendationData?.explanation || `Focus on optimizing your ${biggestCategory} lifestyle habits to lower your total emissions.`}&rdquo;
                </p>
                <Link
                  href="/simulator"
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary/15 border border-primary/20 py-2.5 text-xs font-semibold text-primary hover:bg-primary/25 transition-all"
                >
                  Simulate Impact
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
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
        <div className="grid gap-gutter md:grid-cols-2 animate-fade-in text-left">
          
          {/* Section 1: Recent Flights */}
          <Card className="border border-glass">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                <Plane className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Recent Flights</CardTitle>
                <CardDescription>Logged air travel records</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentFlights.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {recentFlights.map((flight, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-container/30 border border-glass/40 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="text-left">
                        <span className="text-xs font-bold text-on-surface block">
                          {flight.source_airport} &rarr; {flight.destination_airport}
                        </span>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5 capitalize">
                          {flight.trip_type.replace("_", " ")} | {flight.date}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-on-surface-variant block">Distance: {Math.round(flight.distance_km)} km</span>
                        <span className="text-xs font-black text-secondary">{Math.round(flight.carbon_emissions_kg)} kg CO₂e</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center italic text-xs text-on-surface-variant py-8 border border-dashed border-glass rounded-xl">
                  No flights logged yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Recent Meals */}
          <Card className="border border-glass">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                <Cookie className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Recent Meals</CardTitle>
                <CardDescription>Direct food intake logs</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentFoodItems.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {recentFoodItems.map((food, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-container/30 border border-glass/40 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="text-left">
                        <span className="text-xs font-bold text-on-surface block">{food.name}</span>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5 capitalize">
                          {food.meal_type} | Category: {food.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-secondary">{food.portion_g}g portion</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center italic text-xs text-on-surface-variant py-8 border border-dashed border-glass rounded-xl">
                  No meals logged yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Recent Appliance Changes */}
          <Card className="border border-glass">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Active Appliances</CardTitle>
                <CardDescription>Home energy profile items</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {activeAppliances.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeAppliances.map((app, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-container/30 border border-glass/40 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="text-left">
                        <span className="text-xs font-bold text-on-surface block">{app.name}</span>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">
                          {app.power_watts} Watts | Qty: {app.quantity}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-secondary">{app.daily_usage_hours} hrs/day</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center italic text-xs text-on-surface-variant py-8 border border-dashed border-glass rounded-xl">
                  No appliances configured yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Recent Shopping Changes */}
          <Card className="border border-glass bg-glass-panel">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                <ShoppingBag className="h-4.5 w-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Shopping & Discretionary Logs</CardTitle>
                <CardDescription>Consumer spendings and package logistics</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Deliveries & Items Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-surface-container/30 border border-glass/40 rounded-xl text-left">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Shipment Deliveries</span>
                  <span className="text-lg font-black text-on-surface mt-1 block">
                    {foodDeliveriesVal + packageDeliveriesVal} <span className="text-xs font-normal text-on-surface-variant">/week</span>
                  </span>
                  <span className="text-[9px] text-on-surface-variant block mt-0.5">
                    Food: {foodDeliveriesVal} | Parcel: {packageDeliveriesVal}
                  </span>
                </div>

                <div className="p-3.5 bg-surface-container/30 border border-glass/40 rounded-xl text-left">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Retail Items</span>
                  <span className="text-lg font-black text-on-surface mt-1 block">
                    {clothingCount + electronicsCount} <span className="text-xs font-normal text-on-surface-variant">/year</span>
                  </span>
                  <span className="text-[9px] text-on-surface-variant block mt-0.5">
                    Clothing: {clothingCount} | Devices: {electronicsCount}
                  </span>
                </div>
              </div>

              {/* Large Purchases list */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-on-surface-variant block text-left">Recorded Major Purchases</span>
                {largePurchases.length > 0 ? (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {largePurchases.map((purchase) => (
                      <div 
                        key={purchase.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-glass/20 text-xs"
                      >
                        <div className="text-left">
                          <span className="font-bold text-on-surface block">{purchase.item_name}</span>
                          <span className="text-[10px] text-on-surface-variant mt-0.5 block capitalize">{purchase.purchase_date} | {purchase.category}</span>
                        </div>
                        <span className="font-black text-secondary">${purchase.cost_usd.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center italic text-[11px] text-on-surface-variant py-4 bg-surface-container/10 border border-dashed border-glass rounded-xl">
                    No major asset purchases recorded.
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Quick Actions in Activity Center */}
          <Card className="md:col-span-2 border border-glass text-left">
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
