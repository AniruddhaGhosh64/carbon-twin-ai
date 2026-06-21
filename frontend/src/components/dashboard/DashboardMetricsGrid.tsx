"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, TrendingDown, Wallet } from "lucide-react";

interface DashboardMetricsGridProps {
  carbonScore: number;
  carbonScoreView: "lifestyle" | "national";
  setCarbonScoreView: (view: "lifestyle" | "national") => void;
  isLowerThanNational: boolean;
  pctDiffFromNational: number;
  nationalAverageTonsInScope: number;
  userTonsInScope: number;
  timeScope: "week" | "month" | "year";
  totalAnnualKg: number;
  scaleEmissions: (kgValue: number) => number;
  reductionPercentage: number;
  savedEmissionsText: string;
  scaledSavingsUsd: number;
}

export function DashboardMetricsGrid({
  carbonScore,
  carbonScoreView,
  setCarbonScoreView,
  isLowerThanNational,
  pctDiffFromNational,
  nationalAverageTonsInScope,
  userTonsInScope,
  timeScope,
  totalAnnualKg,
  scaleEmissions,
  reductionPercentage,
  savedEmissionsText,
  scaledSavingsUsd,
}: DashboardMetricsGridProps) {
  const getScopeLabel = () => {
    if (timeScope === "week") return "Week";
    if (timeScope === "month") return "Month";
    return "Year";
  };

  return (
    <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
      {/* Carbon Score Card (with Interactive Toggle) */}
      <Card hoverable className="relative overflow-hidden border border-glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-label-caps text-on-surface-variant">Score Card</span>
          <div role="tablist" aria-label="Score Comparison Mode" className="flex bg-surface-container-low p-0.5 rounded-md border border-glass/40">
            <button
              role="tab"
              aria-selected={carbonScoreView === "lifestyle"}
              onClick={() => setCarbonScoreView("lifestyle")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-semibold rounded focus-visible:ring-1 focus-visible:ring-primary focus:outline-none",
                carbonScoreView === "lifestyle"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-on-surface-variant"
              )}
            >
              Score
            </button>
            <button
              role="tab"
              aria-selected={carbonScoreView === "national"}
              onClick={() => setCarbonScoreView("national")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-semibold rounded focus-visible:ring-1 focus-visible:ring-primary focus:outline-none",
                carbonScoreView === "national"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-on-surface-variant"
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
                    : `${pctDiffFromNational.toFixed(0)}% Higher`}
                </span>
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                  Than National Avg ({nationalAverageTonsInScope.toFixed(2)} T)
                </span>
              </div>
              {/* Visual Comparison Bar */}
              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-3 relative overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(100, (userTonsInScope / nationalAverageTonsInScope) * 100)}%`,
                  }}
                  className={cn("h-full rounded-full", isLowerThanNational ? "bg-primary" : "bg-error")}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Annual/Scope Emissions Card */}
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
            <span className="text-display-lg text-secondary font-bold">
              {reductionPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="space-y-2">
            <div className="relative h-2 w-full rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-secondary transition-all"
                style={{ width: `${reductionPercentage}%` }}
              />
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
  );
}
