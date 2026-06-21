"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { BarChart2, PieChart as PieIcon } from "lucide-react";
import dynamic from "next/dynamic";

const DashboardPieChart = dynamic(
  () => import("@/components/charts/DashboardPieChart"),
  {
    ssr: false,
    loading: () => <div className="text-body-sm text-on-surface-variant">Loading Pie Chart...</div>,
  }
);

interface BreakdownDataItem {
  name: string;
  value: number;
  color: string;
  raw: number;
}

interface DashboardBreakdownCardProps {
  breakdownData: BreakdownDataItem[];
  chartView: "bar" | "pie";
  setChartView: (view: "bar" | "pie") => void;
  getPct: (valInScope: number) => string;
  formatEmissions: (kgValue: number) => string;
}

export function DashboardBreakdownCard({
  breakdownData,
  chartView,
  setChartView,
  getPct,
  formatEmissions,
}: DashboardBreakdownCardProps) {
  return (
    <Card className="lg:col-span-2 border border-glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="text-left">
          <CardTitle>Footprint Breakdown</CardTitle>
          <CardDescription>Estimated carbon output per sector category.</CardDescription>
        </div>

        {/* View toggles: Bar vs Recharts Pie */}
        <div role="tablist" aria-label="Breakdown Chart View" className="flex items-center gap-1 bg-surface-container-lowest border border-glass p-1 rounded-md">
          <button
            role="tab"
            aria-selected={chartView === "bar"}
            onClick={() => setChartView("bar")}
            className={cn(
              "p-1.5 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none",
              chartView === "bar"
                ? "bg-primary-container/20 text-primary border border-primary/20"
                : "text-on-surface-variant hover:text-on-surface"
            )}
            aria-label="Bar Chart View"
          >
            <BarChart2 className="h-3.5 w-3.5" />
          </button>
          <button
            role="tab"
            aria-selected={chartView === "pie"}
            onClick={() => setChartView("pie")}
            className={cn(
              "p-1.5 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus:outline-none",
              chartView === "pie"
                ? "bg-primary-container/20 text-primary border border-primary/20"
                : "text-on-surface-variant hover:text-on-surface"
            )}
            aria-label="Pie Chart View"
          >
            <PieIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Screen Reader Summary */}
        <div className="sr-only">
          <h3>Footprint Breakdown Data</h3>
          <ul>
            {breakdownData.map((item) => (
              <li key={item.name}>
                {item.name}: {getPct(item.value)} ({formatEmissions(item.raw)})
              </li>
            ))}
          </ul>
        </div>
        
        {chartView === "bar" ? (
          /* Segmented Bar View with percentages */
          <div className="flex h-5 w-full overflow-hidden rounded-md bg-surface-container-highest animate-fade-in">
            {breakdownData.map((item) => (
              <div
                key={item.name}
                className="h-full first:rounded-l-md last:rounded-r-md transition-all border-r border-surface last:border-r-0"
                style={{
                  width: getPct(item.value),
                  backgroundColor: item.color,
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
  );
}
