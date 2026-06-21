"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  AlertTriangle, 
  Leaf, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCarbon } from "@/context/CarbonContext";
import { TwinNarrative } from "@/types/carbon";
import logger from "@/lib/logger";
import ErrorBoundary from "@/components/layout/ErrorBoundary";

function CarbonTwinPage() {
  const { 
    twinData, 
    latestAssessment, 
    isLoading, 
    error, 
    updateTwinCustomization, 
    fetchLatestCalculation 
  } = useCarbon();

  // Local state for UI controls
  const [twinMode, setTwinMode] = useState<"ai" | "custom">("ai");
  const [timeHorizon, setTimeHorizon] = useState<1 | 5 | 10>(1);
  const [acceptedRuleIds, setAcceptedRuleIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"current" | "future" | "potential">("current");

  // Sync accepted rules from backend state when twinData loads
  useEffect(() => {
    if (twinData && twinData.recommendations) {
      const activeIds = twinData.recommendations
        .filter(r => r.accepted)
        .map(r => r.id);
      setAcceptedRuleIds(activeIds);
      
      // Determine mode based on whether the applied rules match all applicable recommendations
      const applicableCount = twinData.recommendations.filter(r => r.confidence_percentage > 0).length;
      const activeApplicableCount = twinData.recommendations.filter(r => r.accepted && r.confidence_percentage > 0).length;
      
      if (applicableCount === activeApplicableCount && activeApplicableCount > 0) {
        setTwinMode("ai");
      } else {
        setTwinMode("custom");
      }
    }
  }, [twinData]);

  // Handle recommendation toggle
  const handleToggleRule = async (ruleId: string) => {
    if (twinMode !== "custom") {
      setTwinMode("custom");
    }

    setIsUpdating(true);
    let newAccepted = [...acceptedRuleIds];
    if (newAccepted.includes(ruleId)) {
      newAccepted = newAccepted.filter(id => id !== ruleId);
    } else {
      newAccepted.push(ruleId);
    }
    setAcceptedRuleIds(newAccepted);

    try {
      await updateTwinCustomization(newAccepted);
    } catch (err) {
      logger.error("Failed to update custom twin", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Switch to AI Auto Mode
  const handleSetAiMode = async () => {
    setTwinMode("ai");
    setIsUpdating(true);
    try {
      await updateTwinCustomization([]);
    } catch (err) {
      logger.error("Failed to reset to AI Twin", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      await fetchLatestCalculation(true);
    } catch (err) {
      logger.error("Failed to refresh Twin", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading Skeleton State
  if (isLoading && !twinData) {
    return (
      <div className="space-y-6 animate-pulse p-4 text-left">
        <div className="h-10 w-1/4 bg-surface-container rounded-md mb-8" />
        
        {/* Horizontal Hero loading */}
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-surface-container rounded-lg border border-glass" />
          <div className="h-24 bg-surface-container rounded-lg border border-glass" />
          <div className="h-24 bg-surface-container rounded-lg border border-glass" />
          <div className="h-24 bg-surface-container rounded-lg border border-glass" />
        </div>
        
        {/* Grid loading */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-80 bg-surface-container rounded-lg border border-glass" />
          <div className="h-80 bg-surface-container rounded-lg border border-glass" />
        </div>
      </div>
    );
  }

  // Onboarding / Empty State (No calculations found)
  if (!twinData || !latestAssessment) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-10 animate-fade-in text-left">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto shadow-glow">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-headline-lg font-bold text-on-surface">Meet Your Sustainable Twin</h1>
          <p className="text-body-md text-on-surface-variant max-w-lg mx-auto">
            Our Carbon Twin engine builds a optimized, simulated version of your household based on realistic lifestyle adjustments.
          </p>
        </div>

        <Card className="border border-glass bg-glass p-8 space-y-6">
          <CardHeader className="text-center p-0">
            <CardTitle>Onboarding: How it Works</CardTitle>
            <CardDescription>Follow these steps to unlock your Future Sustainable Self</CardDescription>
          </CardHeader>
          
          <CardContent className="grid sm:grid-cols-3 gap-6 pt-4">
            <div className="flex flex-col items-center text-center space-y-3 p-4 bg-surface-container-low/50 rounded-xl border border-glass-subtle">
              <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</span>
              <h3 className="text-body-sm font-semibold text-on-surface">Baseline Assessment</h3>
              <p className="text-[11px] text-on-surface-variant">Log your daily commutes, home appliances, meal habits, and shopping patterns.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4 bg-surface-container-low/50 rounded-xl border border-glass-subtle">
              <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</span>
              <h3 className="text-body-sm font-semibold text-on-surface">Optimization Matrix</h3>
              <p className="text-[11px] text-on-surface-variant">We run balanced rules to determine realistic carbon reductions (35% to 50% savings).</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4 bg-surface-container-low/50 rounded-xl border border-glass-subtle">
              <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">3</span>
              <h3 className="text-body-sm font-semibold text-on-surface">Future Twin Divergence</h3>
              <p className="text-[11px] text-on-surface-variant">Toggle suggestions, scale your horizon up to 10 years, and read your Gemini coaching plan.</p>
            </div>
          </CardContent>

          <div className="flex justify-center pt-2">
            <Link href="/footprint" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-bold text-body-sm hover:bg-primary/95 transition-all shadow-glow">
              Complete Footprint Assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Horizon Scaling Factors
  const emissionsSavedAnnualKg = Math.max(0, twinData.current_state.total_kg - twinData.future_state.total_kg);
  const emissionsSavedTonsHorizon = ((emissionsSavedAnnualKg * timeHorizon) / 1000).toFixed(1);
  const moneySavedHorizon = (twinData.money_saved_usd * timeHorizon).toLocaleString(undefined, { maximumFractionDigits: 0 });

  // Circular gauge config
  const reductionPct = Math.round(twinData.reduction_percentage);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (reductionPct / 100) * circumference;


  // Parse structured narrative vs fallback string
  const isNarrativeObject = twinData && typeof twinData.narrative === "object" && twinData.narrative !== null;
  const narrativeObj = isNarrativeObject ? (twinData.narrative as TwinNarrative) : null;
  const isNarrativeError = !twinData || !twinData.narrative
    ? false
    : typeof twinData.narrative === "string"
      ? twinData.narrative.includes("temporarily unavailable") || twinData.narrative.includes("issue connecting")
      : (twinData.narrative as TwinNarrative).summary?.includes("temporarily unavailable");

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* Error Alert Bar */}
      {error && (
        <div className="flex items-center justify-between bg-error-container/20 border border-error/30 p-4 rounded-xl text-error text-body-sm gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="px-3 py-1.5 bg-error text-on-error rounded-md text-body-xs font-semibold hover:bg-error/90 transition-all">
            Retry
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface flex items-center gap-2">
            Carbon Twin Projection
            {isUpdating && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />}
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Analyze, customize, and project your household trajectory over long-term horizons.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isUpdating}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-glass text-body-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-50 transition-all"
        >
          <RotateCcw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Applied Simulation Snapshot Banner */}
      {twinData.configuration_snapshot && (
        <div className="border border-primary/40 bg-gradient-to-r from-emerald-950/45 to-[#0b2b1d]/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-glow animate-fade-in text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-on-surface">Applied Simulation Snapshot: &quot;{twinData.configuration_snapshot.scenario_name}&quot;</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Applied on {new Date(twinData.configuration_snapshot.timestamp).toLocaleString()} | Time Horizon: {twinData.configuration_snapshot.horizon === "6m" ? "6 Months" : twinData.configuration_snapshot.horizon === "1y" ? "1 Year" : twinData.configuration_snapshot.horizon === "5y" ? "5 Years" : "10 Years"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-bold">
              Active Optimization State
            </span>
          </div>
        </div>
      )}

      {/* 1. HORIZONTAL HERO ROW (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Reduction % Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="24" 
                cy="24" 
                r={radius} 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="transparent" 
                className="text-surface-container-highest"
              />
              <circle 
                cx="24" 
                cy="24" 
                r={radius} 
                stroke="#95d4b3" 
                strokeWidth="5" 
                strokeDasharray={circumference} 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round" 
                fill="transparent" 
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-on-surface">
              -{reductionPct}%
            </div>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Reduction</span>
            <span className="text-headline-md font-bold text-primary leading-none">-{reductionPct}%</span>
          </div>
        </Card>
        
        {/* Horizon Savings Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Horizon Savings</span>
            <span className="text-headline-md font-bold text-primary leading-none">${moneySavedHorizon}</span>
          </div>
        </Card>

        {/* Score Gain Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Rating Gain</span>
            <span className="text-headline-md font-bold text-primary leading-none">+{twinData.carbon_score_improvement} pts</span>
          </div>
        </Card>

        {/* Time Horizon Card */}
        <Card className="border border-glass bg-glass p-5 flex flex-col justify-center text-left">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block mb-2">Time Horizon</span>
          <div role="tablist" aria-label="Projection Time Horizon" className="flex items-center bg-surface-container rounded-lg p-1 border border-glass w-full">
            {([1, 5, 10] as const).map((h) => (
              <button
                key={h}
                role="tab"
                aria-selected={timeHorizon === h}
                onClick={() => setTimeHorizon(h)}
                aria-label={`Select ${h}-year simulation projection time horizon`}
                className={`flex-1 py-1 text-body-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
                  timeHorizon === h 
                    ? "bg-secondary text-on-secondary shadow-sm" 
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {h}Y
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 2. TWIN EVOLUTION SECTION (Progression of Current -> Future -> Potential) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Twin Evolution Path</h2>
          <p className="text-body-xs text-on-surface-variant">See how your sustainable archetype transforms as you adopt optimizations.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch">
          {/* 1. Current Twin Card */}
          <Card 
            className="text-left relative overflow-hidden flex flex-col justify-between group rounded-2xl border border-glass transition-all duration-300"
            style={{ backgroundColor: "rgba(10, 20, 15, 0.75)" }}
          >
            <CardHeader className="pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-0.5 text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                Current Twin (Baseline)
              </span>
              <CardTitle className="text-headline-sm font-extrabold mt-2 text-on-surface/90">
                {twinData.current_profile?.archetype || "Baseline User"}
              </CardTitle>
              <CardDescription className="text-on-surface-variant/80">Based on your active assessment data.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Annual Emissions</span>
                  <span className="text-headline-md font-bold text-on-surface/90">{(twinData.current_state.total_kg / 1000).toFixed(1)}</span>
                  <span className="text-body-xs text-on-surface-variant ml-1 font-medium">tons CO₂e</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Carbon Rating</span>
                  <span className="text-headline-md font-bold text-on-surface/90">{twinData.current_state.carbon_score}</span>
                  <span className="text-body-xs text-on-surface-variant ml-1 font-medium">/100</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-emerald-950/60 overflow-hidden relative border border-emerald-900/30">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${twinData.current_state.carbon_score}%`, backgroundColor: "#2d6a4f" }} 
                  />
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-2 border-t border-glass-subtle">
                <div className="h-3 w-full rounded-md bg-emerald-950/40 overflow-hidden flex border border-emerald-900/30">
                  <div style={{ width: `${(twinData.current_state.transportation_kg / twinData.current_state.total_kg) * 100}%`, backgroundColor: "#95d4b3" }} title="Transit" />
                  <div style={{ width: `${(twinData.current_state.energy_kg / twinData.current_state.total_kg) * 100}%`, backgroundColor: "#52b788" }} title="Energy" />
                  <div style={{ width: `${(twinData.current_state.food_kg / twinData.current_state.total_kg) * 100}%`, backgroundColor: "#2d6a4f" }} title="Food" />
                  <div style={{ width: `${(twinData.current_state.shopping_kg / twinData.current_state.total_kg) * 100}%`, backgroundColor: "#74c69d" }} title="Shopping" />
                </div>
                <div className="flex justify-between text-[8px] text-on-surface-variant font-medium">
                  <span>Transit: {Math.round(twinData.current_state.transportation_kg)}kg</span>
                  <span>Energy: {Math.round(twinData.current_state.energy_kg)}kg</span>
                  <span>Food: {Math.round(twinData.current_state.food_kg)}kg</span>
                  <span>Shopping: {Math.round(twinData.current_state.shopping_kg)}kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Future Twin Card */}
          <Card 
            className="text-left relative overflow-hidden flex flex-col justify-between group rounded-2xl border border-primary/30 transition-all duration-300 shadow-glow"
            style={{ backgroundColor: "rgba(20, 45, 30, 0.8)" }}
          >
            <CardHeader className="pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/20 px-2.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                Future Twin (Committed)
              </span>
              <CardTitle className="text-headline-sm font-extrabold mt-2 text-primary">
                {twinData.future_profile?.archetype || "Future Self"}
              </CardTitle>
              <CardDescription className="text-primary-container/80">Based on accepted rules & levers.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Annual Emissions</span>
                  <span className="text-headline-md font-bold text-primary">{(twinData.future_state.total_kg / 1000).toFixed(1)}</span>
                  <span className="text-body-xs text-primary/80 ml-1 font-medium">tons CO₂e</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Carbon Rating</span>
                  <span className="text-headline-md font-bold text-primary">{twinData.future_state.carbon_score}</span>
                  <span className="text-body-xs text-primary/80 ml-1 font-medium">/100</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-emerald-950/60 overflow-hidden relative border border-primary/20">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500 shadow-glow" 
                    style={{ width: `${twinData.future_state.carbon_score}%` }} 
                  />
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-2 border-t border-glass-subtle">
                <div className="h-3 w-full rounded-md bg-emerald-950/40 overflow-hidden flex border border-primary/20">
                  {twinData.future_state.total_kg > 0 ? (
                    <>
                      <div style={{ width: `${(twinData.future_state.transportation_kg / twinData.future_state.total_kg) * 100}%`, backgroundColor: "#95d4b3" }} />
                      <div style={{ width: `${(twinData.future_state.energy_kg / twinData.future_state.total_kg) * 100}%`, backgroundColor: "#52b788" }} />
                      <div style={{ width: `${(twinData.future_state.food_kg / twinData.future_state.total_kg) * 100}%`, backgroundColor: "#2d6a4f" }} />
                      <div style={{ width: `${(twinData.future_state.shopping_kg / twinData.future_state.total_kg) * 100}%`, backgroundColor: "#74c69d" }} />
                    </>
                  ) : (
                    <div className="w-full bg-emerald-950/60 flex items-center justify-center text-[8px] text-primary/80 italic font-semibold">
                      Fully Offset!
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[8px] text-on-surface-variant font-medium">
                  <span>Transit: {Math.round(twinData.future_state.transportation_kg)}kg</span>
                  <span>Energy: {Math.round(twinData.future_state.energy_kg)}kg</span>
                  <span>Food: {Math.round(twinData.future_state.food_kg)}kg</span>
                  <span>Shopping: {Math.round(twinData.future_state.shopping_kg)}kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Potential Twin Card */}
          <Card 
            className="text-left relative overflow-hidden flex flex-col justify-between group rounded-2xl border border-glass transition-all duration-300"
            style={{ backgroundColor: "rgba(15, 30, 20, 0.65)" }}
          >
            <CardHeader className="pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 border border-secondary/20 px-2.5 py-0.5 text-[9px] font-bold text-secondary uppercase tracking-wider">
                Potential Twin (Max Optimized)
              </span>
              <CardTitle className="text-headline-sm font-extrabold mt-2 text-secondary">
                {twinData.potential_profile?.archetype || "Potential Self"}
              </CardTitle>
              <CardDescription className="text-on-surface-variant/80">With all optimization rules applied.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Annual Emissions</span>
                  <span className="text-headline-md font-bold text-secondary">{(twinData.potential_state.total_kg / 1000).toFixed(1)}</span>
                  <span className="text-body-xs text-on-surface-variant ml-1 font-medium">tons CO₂e</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-semibold">Carbon Rating</span>
                  <span className="text-headline-md font-bold text-secondary">{twinData.potential_state.carbon_score}</span>
                  <span className="text-body-xs text-on-surface-variant ml-1 font-medium">/100</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-emerald-950/60 overflow-hidden relative border border-secondary/20">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${twinData.potential_state.carbon_score}%`, backgroundColor: "#52b788" }} 
                  />
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-2 border-t border-glass-subtle">
                <div className="h-3 w-full rounded-md bg-emerald-950/40 overflow-hidden flex border border-secondary/20">
                  {twinData.potential_state.total_kg > 0 ? (
                    <>
                      <div style={{ width: `${(twinData.potential_state.transportation_kg / twinData.potential_state.total_kg) * 100}%`, backgroundColor: "#95d4b3" }} />
                      <div style={{ width: `${(twinData.potential_state.energy_kg / twinData.potential_state.total_kg) * 100}%`, backgroundColor: "#52b788" }} />
                      <div style={{ width: `${(twinData.potential_state.food_kg / twinData.potential_state.total_kg) * 100}%`, backgroundColor: "#2d6a4f" }} />
                      <div style={{ width: `${(twinData.potential_state.shopping_kg / twinData.potential_state.total_kg) * 100}%`, backgroundColor: "#74c69d" }} />
                    </>
                  ) : (
                    <div className="w-full bg-emerald-950/60 flex items-center justify-center text-[8px] text-secondary italic font-semibold">
                      Fully Offset!
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[8px] text-on-surface-variant font-medium">
                  <span>Transit: {Math.round(twinData.potential_state.transportation_kg)}kg</span>
                  <span>Energy: {Math.round(twinData.potential_state.energy_kg)}kg</span>
                  <span>Food: {Math.round(twinData.potential_state.food_kg)}kg</span>
                  <span>Shopping: {Math.round(twinData.potential_state.shopping_kg)}kg</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2.5 TWIN INSIGHTS SECTION */}
      <Card className="border border-glass bg-glass p-6 rounded-2xl text-left space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-headline-md font-bold flex items-center gap-2">
              Twin Profile Insights
            </CardTitle>
            <CardDescription>
              Review the detailed behavioral fingerprint for each stage of your twin’s evolution.
            </CardDescription>
          </div>
          {/* Tab switcher */}
          <div role="tablist" aria-label="Twin Profile Insights" className="flex bg-surface-container rounded-lg p-1 border border-glass self-start">
            {(["current", "future", "potential"] as const).map((tab) => (
              <button
                key={tab}
                id={`tab-profile-${tab}`}
                role="tab"
                aria-selected={activeProfileTab === tab}
                aria-controls={`panel-profile-${tab}`}
                onClick={() => setActiveProfileTab(tab)}
                className={`px-3 py-1.5 text-body-xs font-semibold rounded-md transition-all uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
                  activeProfileTab === tab 
                    ? "bg-primary text-on-primary shadow-sm" 
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Profile Content */}
        {(() => {
          const profile = 
            activeProfileTab === "current" ? twinData.current_profile :
            activeProfileTab === "future" ? twinData.future_profile :
            twinData.potential_profile;

          if (!profile) return (
            <p id={`panel-profile-${activeProfileTab}`} role="tabpanel" aria-labelledby={`tab-profile-${activeProfileTab}`} className="text-body-xs text-on-surface-variant italic py-4 outline-none">Profile data not yet generated.</p>
          );

          return (
            <div 
              id={`panel-profile-${activeProfileTab}`}
              role="tabpanel"
              aria-labelledby={`tab-profile-${activeProfileTab}`}
              className="space-y-4 pt-2 outline-none"
              tabIndex={0}
            >
              <div className="flex items-center gap-3">
                <span className="text-body-xs font-bold text-on-surface-variant uppercase tracking-wider">Active Archetype:</span>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-extrabold text-primary shadow-sm">
                  {profile.archetype}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-emerald-950/15 border border-emerald-900/20 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Strengths</span>
                  </div>
                  <ul className="space-y-1 text-body-xs text-on-surface-variant">
                    {profile.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-red-950/10 border border-red-900/10 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Weaknesses</span>
                  </div>
                  <ul className="space-y-1 text-body-xs text-on-surface-variant">
                    {profile.weaknesses.map((weak, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Areas */}
                <div className="bg-amber-950/10 border border-amber-900/10 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-orange-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Risk Areas</span>
                  </div>
                  <ul className="space-y-1 text-body-xs text-on-surface-variant">
                    {profile.risk_areas.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-orange-500 mt-0.5">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunity Areas */}
                <div className="bg-[#0f2e24] border border-primary/20 p-4 rounded-xl space-y-2 shadow-glow">
                  <div className="flex items-center gap-2 text-primary">
                    <Leaf className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Opportunity Areas</span>
                  </div>
                  <ul className="space-y-1 text-body-xs text-on-surface-variant">
                    {profile.opportunity_areas.map((opp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 font-medium">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* 3. GEMINI NARRATIVE "MEET FUTURE YOU" CENTERPIECE (Directly below comparison) */}
      <Card className="border border-primary/30 bg-gradient-to-br from-emerald-950/30 to-emerald-900/10 p-6 rounded-2xl relative overflow-hidden text-left shadow-glow">
        <div className="absolute right-0 top-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="flex flex-col md:flex-row gap-6 items-start w-full">
          <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-glow">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-3 flex-grow w-full">
            <div className="flex justify-between items-center w-full">
              <h2 className="text-headline-md font-extrabold text-primary flex items-center gap-2 leading-none">
                Meet Future You
              </h2>
              {isUpdating && (
                <span className="text-[10px] text-primary font-bold animate-pulse">Generating Future Twin...</span>
              )}
            </div>

            {isUpdating ? (
              <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant gap-3 bg-surface-container-low/20 border border-glass rounded-xl mt-2 w-full">
                <div className="h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-body-sm font-semibold animate-pulse text-primary">Generating Future Twin...</span>
              </div>
            ) : isNarrativeError ? (
              <div className="flex items-start gap-3 bg-error-container/10 border border-error/20 p-4 rounded-xl text-error text-body-sm mt-2 w-full">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
                <p className="font-semibold text-on-surface-variant leading-relaxed">
                  Carbon Coach AI is temporarily unavailable. Your sustainability projections remain fully functional.
                </p>
              </div>
            ) : !isNarrativeObject ? (
              <div className="space-y-3 w-full">
                <p className="text-body-md font-semibold text-on-surface leading-snug">
                  In {timeHorizon} {timeHorizon === 1 ? "year" : "years"}, your optimized lifestyle could reduce{" "}
                  <span className="text-primary text-headline-sm font-extrabold">{emissionsSavedTonsHorizon} tons CO₂e</span>{" "}
                  while saving{" "}
                  <span className="text-primary text-headline-sm font-extrabold">${moneySavedHorizon}</span>.
                </p>
                <div className="bg-surface-container-low/40 border border-glass rounded-xl p-4 mt-2">
                  <p className="text-body-sm text-on-surface-variant italic leading-relaxed">
                    &ldquo;{twinData.narrative as string}&rdquo;
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <p className="text-body-md font-semibold text-on-surface leading-snug">
                  In {timeHorizon} {timeHorizon === 1 ? "year" : "years"}, your optimized lifestyle could reduce{" "}
                  <span className="text-primary text-headline-sm font-extrabold">{emissionsSavedTonsHorizon} tons CO₂e</span>{" "}
                  while saving{" "}
                  <span className="text-primary text-headline-sm font-extrabold">${moneySavedHorizon}</span>.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 mt-3 w-full">
                  <div className="bg-surface-container-low/30 border border-glass/30 rounded-xl p-4 sm:col-span-2 text-left">
                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Summary</span>
                    <p className="text-body-sm text-on-surface mt-1 leading-relaxed">{narrativeObj?.summary}</p>
                  </div>
                  <div className="bg-surface-container-low/30 border border-glass/30 rounded-xl p-4 text-left">
                    <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Biggest Contributor</span>
                    <p className="text-body-sm text-on-surface mt-1 leading-relaxed">{narrativeObj?.biggest_contributor}</p>
                  </div>
                  <div className="bg-surface-container-low/30 border border-glass/30 rounded-xl p-4 text-left">
                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Biggest Opportunity</span>
                    <p className="text-body-sm text-on-surface mt-1 leading-relaxed">{narrativeObj?.biggest_opportunity}</p>
                  </div>
                  <div className="bg-surface-container-low/30 border border-glass/30 rounded-xl p-4 sm:col-span-2 text-left">
                    <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Projected Reduction Detail</span>
                    <p className="text-body-sm text-on-surface mt-1 leading-relaxed">{narrativeObj?.projected_reduction}</p>
                  </div>
                  <div className="bg-surface-container-low/30 border border-glass/30 rounded-xl p-4 sm:col-span-2 text-left">
                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Future Self Message</span>
                    <p className="text-body-sm text-on-surface mt-1 leading-relaxed italic">&ldquo;{narrativeObj?.future_self_message}&rdquo;</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 4. MODE CONTROL PANEL */}
      <Card className="border border-glass bg-glass p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
        <div>
          <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Optimized Operating Mode</span>
          <p className="text-body-xs text-on-surface-variant">Switch between standard AI configurations and your customized levers.</p>
        </div>
        <div role="tablist" aria-label="Optimized Operating Mode" className="flex items-center bg-surface-container rounded-lg p-1 border border-glass w-full sm:w-auto">
          <button
            id="tab-mode-ai"
            role="tab"
            aria-selected={twinMode === "ai"}
            aria-controls="panel-recommendations"
            onClick={handleSetAiMode}
            className={`flex-1 sm:flex-none px-4 py-2 text-body-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
              twinMode === "ai" 
                ? "bg-primary text-on-primary shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            AI Balanced Twin
          </button>
          <button
            id="tab-mode-custom"
            role="tab"
            aria-selected={twinMode === "custom"}
            aria-controls="panel-recommendations"
            onClick={() => setTwinMode("custom")}
            className={`flex-1 sm:flex-none px-4 py-2 text-body-xs font-semibold rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
              twinMode === "custom" 
                ? "bg-primary text-on-primary shadow-sm" 
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Customize Levers
          </button>
        </div>
      </Card>

      {/* 5. RECOMMENDATIONS PANEL (Optimization Levers) */}
      <Card id="panel-recommendations" role="tabpanel" aria-labelledby={twinMode === "ai" ? "tab-mode-ai" : "tab-mode-custom"} className="border border-glass bg-glass text-left outline-none">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-headline-md font-bold flex items-center gap-2">
              Future Optimization Levers
              {twinMode === "ai" && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wide">
                  AI Auto-Balanced
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Adopt specific lifestyle upgrades to instantly configure your Future Twin trajectory.
            </CardDescription>
          </div>
          {twinMode === "custom" && (
            <button 
              onClick={handleSetAiMode}
              className="text-body-xs text-primary font-bold hover:underline flex items-center gap-1 self-start sm:self-center"
            >
              Reset to AI Auto-Balanced
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </CardHeader>

        <CardContent className="divide-y divide-glass pt-2">
          {twinData.recommendations && twinData.recommendations.length > 0 ? (
            twinData.recommendations.map((rec) => {
              const hasConfidence = rec.confidence_percentage > 0;
              const isChecked = acceptedRuleIds.includes(rec.id);
              
              // Map feasibility percentages to tags
              const getDifficulty = (conf: number) => {
                if (conf >= 92) return "Easy";
                if (conf >= 85) return "Moderate";
                return "Hard";
              };

              return (
                <div 
                  key={rec.id} 
                  className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 ${
                    !hasConfidence ? "opacity-30" : ""
                  }`}
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body-sm font-bold text-on-surface">{rec.title}</span>
                      
                      {/* Category Badge */}
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {rec.category}
                      </span>
                      
                      {/* Feasibility Confidence Pill */}
                      {hasConfidence ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          Feasibility: {rec.confidence_percentage}% ({getDifficulty(rec.confidence_percentage)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-[9px] font-semibold text-on-surface-variant">
                          Not Applicable
                        </span>
                      )}
                    </div>
                    
                    <p className="text-body-xs text-on-surface-variant leading-relaxed">
                      {rec.description}
                    </p>

                    {/* Impact Stats */}
                    {hasConfidence && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[10px] font-semibold">
                        <span className="text-primary flex items-center gap-1">
                          <Leaf className="h-3 w-3" />
                          Impact: -{Math.round(rec.emissions_reduction_kg * timeHorizon)} kg CO₂e ({timeHorizon} yr)
                        </span>
                        <span className="text-primary flex items-center gap-1 border-l border-glass pl-4">
                          <DollarSign className="h-3 w-3" />
                          Savings: ${Math.round(rec.money_saved_usd * timeHorizon)} ({timeHorizon} yr)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Adopt / Applied Action Toggles */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasConfidence ? (
                      <button
                        onClick={() => handleToggleRule(rec.id)}
                        disabled={isUpdating}
                        aria-label={`${isChecked ? "Remove" : "Adopt"} optimization action: ${rec.title}`}
                        aria-pressed={isChecked}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-body-xs font-bold transition-all w-28 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none ${
                          isChecked 
                            ? "bg-emerald-600 border border-emerald-400 text-white shadow-glow hover:bg-emerald-700" 
                            : "bg-surface-container border border-glass text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                        }`}
                      >
                        {isChecked ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-white" />
                            <span>Applied</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg leading-none font-light">+</span>
                            <span>Adopt</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[10px] text-on-surface-variant font-medium italic">
                        Not required by profile
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-body-sm text-on-surface-variant">
              No recommendations calculated for your footprint profile.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WrappedCarbonTwinPage() {
  return (
    <ErrorBoundary fallbackName="Carbon Twin Hub">
      <CarbonTwinPage />
    </ErrorBoundary>
  );
}
