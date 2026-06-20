"use client";

import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";
import { 
  Award, 
  Flame, 
  Leaf, 
  TrendingDown, 
  Calendar,
  ShieldCheck,
  Bike,
  Lock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  DollarSign,
  Info,
  Clock,
  Compass,
  Zap,
  Activity,
  CheckCircle,
  HelpCircle,
  Globe,
  Home
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";

interface ProgressPoint {
  id: string;
  user_id: string;
  date: string;
  carbon_score: number;
  emissions_kg: number;
  updated_at: string;
}

interface OverviewData {
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

interface CategoryPerf {
  projected_savings_kg: number;
  actual_savings_kg: number;
  variance_percentage: number;
}

interface ActionPerf {
  action_id: string;
  title: string;
  projected_savings_kg: number;
  actual_savings_kg: number;
  success_rate: number;
}

interface BadgeProgress {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  unlocked_at?: string;
  progress_percentage: number;
}

interface AchievementsData {
  total_xp: number;
  badges: BadgeProgress[];
}

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "performance" | "achievements" | "history">("overview");
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "1y" | "all">("1y");
  
  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [performance, setPerformance] = useState<{ categories: Record<string, CategoryPerf>, actions: ActionPerf[] } | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
  const [history, setHistory] = useState<ProgressPoint[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Overview
      const overviewRes = await fetch(getApiUrl("/api/v1/progress/overview"), {
        headers: { "X-User-Id": "default_user" }
      });
      if (!overviewRes.ok) throw new Error("Failed to load progress overview");
      const overviewJson = await overviewRes.json();
      setOverview(overviewJson);

      // 2. Fetch Performance
      const perfRes = await fetch(getApiUrl(`/api/v1/progress/performance?timeframe=${timeframe}`), {
        headers: { "X-User-Id": "default_user" }
      });
      if (perfRes.ok) {
        const perfJson = await perfRes.json();
        setPerformance(perfJson);
      }

      // 3. Fetch Achievements
      const achRes = await fetch(getApiUrl("/api/v1/progress/achievements"), {
        headers: { "X-User-Id": "default_user" }
      });
      if (achRes.ok) {
        const achJson = await achRes.json();
        setAchievements(achJson);
      }

      // 4. Fetch History
      const historyRes = await fetch(getApiUrl("/api/v1/progress/history"), {
        headers: { "X-User-Id": "default_user" }
      });
      if (historyRes.ok) {
        const historyJson = await historyRes.json();
        setHistory(historyJson.history || []);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "Failed to load Progress timeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setMounted(true);
  }, [timeframe]);

  if (loading && !overview) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center text-body-md text-on-surface-variant gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading actual results and milestones...
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center text-body-md text-on-surface-variant gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-error" />
        <span>{error || "No progress history found. Please perform your footprint assessment first."}</span>
      </div>
    );
  }

  // Format history for Chart
  const chartData = history.map((h) => {
    const d = new Date(h.date);
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return {
      date: formatted,
      Emissions: Math.round(h.emissions_kg)
    };
  });

  if (chartData.length === 1 && history.length > 0) {
    chartData.unshift({
      date: "Baseline",
      Emissions: Math.round(history[0].emissions_kg * 1.05)
    });
  }

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Progress & Reality Control</h1>
          <p className="text-body-sm text-on-surface-variant">
            Track actual carbon footprint updates, daily action check-ins, and earned achievements.
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#01110b] border border-glass p-1 rounded-md self-start md:self-auto">
          {([
            { id: "overview", label: "Overview" },
            { id: "performance", label: "Performance" },
            { id: "achievements", label: "Achievements" },
            { id: "history", label: "History" }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === tab.id 
                  ? "bg-primary-container/20 text-primary border border-primary/20" 
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-stack-lg animate-fade-in">
          
          {/* Overview Hero Panel */}
          <div className="grid gap-gutter md:grid-cols-4">
            
            {/* Primary visual KPI: Total Carbon Reduced */}
            <Card className="md:col-span-2 border border-glass bg-glass p-6 text-left relative overflow-hidden group border-l-4 border-l-primary flex flex-col justify-between min-h-[160px]">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-all" />
              <div className="flex items-center justify-between pb-1.5 z-10">
                <span className="text-label-caps text-on-surface-variant">Total Carbon Reduced</span>
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-display-lg font-bold text-primary">
                  {(overview.total_carbon_reduced_kg / 1000).toFixed(2)}
                </span>
                <span className="text-body-md font-semibold text-on-surface-variant">Tons CO2e</span>
              </div>
              <p className="text-[10px] text-on-surface-variant/75 font-mono pt-3 border-t border-glass mt-3 uppercase tracking-wider">
                PRIMARY SUSTAINABILITY SUCCESS KPI
              </p>
            </Card>

            <Card className="border border-glass bg-glass p-6 text-left relative overflow-hidden group flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-label-caps text-on-surface-variant">Cumulative Savings</span>
                <DollarSign className="h-5 w-5 text-secondary" />
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-display-sm font-bold text-secondary">${Math.round(overview.total_money_saved_usd)}</span>
                <span className="text-body-xs text-on-surface-variant">USD / yr</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-4 font-semibold">
                From completed and active check-ins.
              </p>
            </Card>

            <Card className="border border-glass bg-glass p-6 text-left relative overflow-hidden group flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-label-caps text-on-surface-variant">Score Improvement</span>
                <Activity className="h-5 w-5 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-1.5 pt-2">
                <span className="text-display-sm font-bold text-teal-400">
                  {overview.score_improvement >= 0 ? `+${overview.score_improvement}` : overview.score_improvement}
                </span>
                <span className="text-body-xs text-on-surface-variant">pts</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-4 font-semibold">
                Action completion rate: <span className="text-teal-400 font-bold">{overview.completion_rate}%</span>
              </p>
            </Card>
          </div>

          {/* Reality vs Baseline vs Target Comparison */}
          <div className="grid gap-gutter md:grid-cols-3">
            
            {/* Target comparison engine progress bars */}
            <Card className="md:col-span-2 border border-glass bg-glass p-6 text-left space-y-5">
              <div>
                <h3 className="text-title-sm font-bold text-on-surface">Target Comparison Engine</h3>
                <p className="text-body-xs text-on-surface-variant">Actual recorded footprint vs baseline and twin targets.</p>
              </div>

              <div className="space-y-4">
                {/* Baseline */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-body-xs font-semibold">
                    <span className="text-on-surface-variant">Original Baseline</span>
                    <span className="font-mono text-on-surface-variant">{Math.round(overview.comparison.baseline)} kg CO2e</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden border border-glass">
                    <div className="h-full bg-on-surface-variant/40" style={{ width: "100%" }} />
                  </div>
                </div>

                {/* Current Reality */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-body-xs font-semibold">
                    <span className="text-on-surface font-bold">Current Reality</span>
                    <span className="font-mono text-primary font-bold">{Math.round(overview.comparison.current)} kg CO2e</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden border border-glass">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(overview.comparison.current / overview.comparison.baseline) * 100}%` }} 
                    />
                  </div>
                </div>

                {/* Target */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-body-xs font-semibold">
                    <span className="text-secondary font-bold">Carbon Twin Target</span>
                    <span className="font-mono text-secondary font-bold">{Math.round(overview.comparison.target)} kg CO2e</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden border border-glass">
                    <div 
                      className="h-full bg-secondary" 
                      style={{ width: `${(overview.comparison.target / overview.comparison.baseline) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Gap remaining card */}
              <div className="pt-3 border-t border-glass flex items-center justify-between text-body-xs">
                <span className="text-on-surface-variant font-semibold">Variance Gap Remaining:</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded font-mono",
                  overview.comparison.gap_remaining > 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}>
                  {overview.comparison.gap_remaining > 0 ? `+${Math.round(overview.comparison.gap_remaining)} kg CO2e to target` : "Target Achieved!"}
                </span>
              </div>
            </Card>

            {/* Streaks Card */}
            <Card className="border border-glass bg-glass p-6 text-left flex flex-col justify-between">
              <div>
                <h3 className="text-title-sm font-bold text-on-surface">Commitment Streaks</h3>
                <p className="text-body-xs text-on-surface-variant">Maintaining streaks locks in footprint reductions.</p>
              </div>

              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
                    <Flame className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Current Eco Streak</span>
                    <p className="text-title-md font-extrabold text-on-surface">{overview.streaks.current_eco_streak} Days</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Mission Completions</span>
                    <p className="text-title-md font-extrabold text-on-surface">{overview.streaks.completion_streak} Missions</p>
                  </div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-on-surface-variant border-t border-glass pt-3">
                LONGEST ECO STREAK: {overview.streaks.longest_eco_streak} DAYS
              </div>
            </Card>

          </div>

        </div>
      )}

      {/* TAB CONTENT: PERFORMANCE */}
      {activeTab === "performance" && performance && (
        <div className="space-y-stack-lg animate-fade-in">
          
          {/* Category Performance Grid: Projected vs Actual vs Variance */}
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {(["transportation", "energy", "food", "shopping"] as const).map((cat) => {
              const p = performance.categories[cat] || { projected_savings_kg: 0, actual_savings_kg: 0, variance_percentage: 0 };
              
              return (
                <Card key={cat} className="border border-glass bg-glass p-5 text-left space-y-2">
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider capitalize">{cat} Savings</span>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-title-lg font-bold text-primary">{Math.round(p.actual_savings_kg)} kg</span>
                    <span className="text-body-xs text-on-surface-variant">saved</span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant/80 space-y-0.5 font-semibold">
                    <div>Projected: {Math.round(p.projected_savings_kg)} kg</div>
                    <div className="flex items-center gap-1.5">
                      <span>Variance:</span>
                      <span className={cn(
                        "font-bold",
                        p.variance_percentage >= 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {p.variance_percentage >= 0 ? `+${p.variance_percentage}%` : `${p.variance_percentage}%`}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Action Performance Table */}
          <Card className="border border-glass bg-glass text-left">
            <CardHeader className="border-b border-glass pb-4">
              <CardTitle>Eco Action Commitments Performance</CardTitle>
              <CardDescription>Projected carbon reduction vs actual logged reduction and success rate metrics.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-glass text-on-surface-variant uppercase font-bold text-[10px] tracking-wider text-left bg-surface-container-low/20">
                      <th className="px-6 py-4">Action Committed</th>
                      <th className="px-6 py-4">Projected Offset (kg)</th>
                      <th className="px-6 py-4">Actual Offset (kg)</th>
                      <th className="px-6 py-4 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.actions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                          No active or completed missions logged to track action performance.
                        </td>
                      </tr>
                    ) : (
                      performance.actions.map((act) => (
                        <tr key={act.action_id} className="border-b border-glass hover:bg-glass/10 transition-colors">
                          <td className="px-6 py-4 font-semibold text-on-surface">{act.title}</td>
                          <td className="px-6 py-4 font-mono text-on-surface-variant">{act.projected_savings_kg}</td>
                          <td className="px-6 py-4 font-mono text-primary font-bold">{act.actual_savings_kg}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                              act.success_rate >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {act.success_rate}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Community Comparison Benchmarks */}
          <Card className="border border-glass bg-glass p-6 text-left space-y-4">
            <div>
              <h3 className="text-title-sm font-bold text-on-surface">Community Footprint Benchmarks</h3>
              <p className="text-body-xs text-on-surface-variant">Compare your actual performance against municipal and national averages.</p>
            </div>

            <div className="grid gap-gutter sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-surface-container-low border border-glass flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Your Footprint</span>
                  <span className="text-title-lg font-bold text-primary">{(overview.comparison.current / 1000).toFixed(2)} Tons</span>
                </div>
                <Globe className="h-5 w-5 text-primary" />
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-glass flex items-center justify-between opacity-85">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">City Average</span>
                  <span className="text-title-lg font-bold text-on-surface-variant">4.20 Tons</span>
                </div>
                <Info className="h-5 w-5 text-on-surface-variant" />
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-glass flex items-center justify-between opacity-70">
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">National Average</span>
                  <span className="text-title-lg font-bold text-on-surface-variant">5.50 Tons</span>
                </div>
                <Info className="h-5 w-5 text-on-surface-variant" />
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* TAB CONTENT: ACHIEVEMENTS */}
      {activeTab === "achievements" && achievements && (
        <div className="space-y-stack-lg animate-fade-in text-left">
          
          {/* XP Status Card */}
          <Card className="border border-glass bg-glass p-6 relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-label-caps text-primary">Gamified Milestone Engine</span>
            </div>
            <div className="flex items-baseline gap-2 pt-3">
              <span className="text-display-md font-black text-primary">{achievements.total_xp}</span>
              <span className="text-body-md font-bold text-on-surface-variant">Total XP Accumulated</span>
            </div>
            <p className="text-[11px] text-on-surface-variant/80 pt-2 font-semibold border-t border-glass mt-3">
              Earn 10 XP per daily action check-in and 100 XP per mission completed. No levels required.
            </p>
          </Card>

          {/* Badges Grid with Progress Bars */}
          <div className="grid gap-gutter sm:grid-cols-2">
            {achievements.badges.map((b) => (
              <Card 
                key={b.id} 
                className={cn(
                  "border p-5 text-left flex flex-col justify-between transition-all gap-4",
                  b.earned 
                    ? "border-primary bg-primary/5 shadow-glow" 
                    : "border-glass bg-glass/60 opacity-75"
                )}
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "h-11 w-11 rounded-lg border flex items-center justify-center shrink-0",
                    b.earned ? "border-primary/20 bg-primary/10 text-primary" : "border-glass bg-surface-container-highest text-on-surface-variant"
                  )}>
                    {b.id === "commuter" && <Bike className="h-5.5 w-5.5" />}
                    {b.id === "solar" && <Home className="h-5.5 w-5.5" />}
                    {b.id === "vegetarian" && <Leaf className="h-5.5 w-5.5" />}
                    {b.id === "delivery" && <Clock className="h-5.5 w-5.5" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-body-sm font-bold text-on-surface">{b.title}</h4>
                      {b.earned && (
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full animate-pulse">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant pr-2 leading-relaxed">{b.description}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[9px] font-mono text-on-surface-variant font-bold">
                    <span>PROGRESS</span>
                    <span>{Math.round(b.progress_percentage)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden border border-glass">
                    <div 
                      className={cn("h-full", b.earned ? "bg-primary" : "bg-on-surface-variant/40")} 
                      style={{ width: `${b.progress_percentage}%` }} 
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-stack-lg animate-fade-in text-left">
          
          {/* Historical emissions area chart */}
          <Card className="border border-glass bg-glass">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-glass">
              <div>
                <CardTitle>Historical Emissions Trend</CardTitle>
                <CardDescription>Aggregated actual footprint logs (kg CO2e) over the selected timeframe.</CardDescription>
              </div>
              
              {/* Historical scaling timeframe buttons */}
              <div className="flex items-center gap-1.5 bg-[#01110b] border border-glass p-1 rounded-md">
                {([
                  { id: "30d", label: "30D" },
                  { id: "90d", label: "90D" },
                  { id: "1y", label: "1Y" },
                  { id: "all", label: "All Time" }
                ] as const).map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      timeframe === tf.id ? "bg-primary-container/20 text-primary border border-primary/20" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {mounted ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorHistoryEmissions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#95d4b3" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#95d4b3" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        stroke="#1B4332" 
                        strokeOpacity={0.5} 
                        strokeWidth={0.5} 
                        vertical={false} 
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke="#8a938c" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#8a938c" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#10231c",
                          border: "1px solid rgba(216, 226, 220, 0.1)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#d1e8dc",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Emissions"
                        stroke="#95d4b3"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorHistoryEmissions)"
                        name="Footprint (kg CO2e)"
                        dot={{ r: 4, fill: "#95d4b3", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#95d4b3" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 w-full flex items-center justify-center text-body-sm text-on-surface-variant">
                  Loading trend chart...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed timeline list */}
          <Card className="border border-glass bg-glass text-left">
            <CardHeader className="border-b border-glass pb-4">
              <CardTitle>Footprint Logs Timeline</CardTitle>
              <CardDescription>Unfiltered list of recorded calculations and assessment saves.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-glass max-h-96 overflow-y-auto">
                {history.slice().reverse().map((h) => (
                  <div key={h.id} className="p-4 flex items-center justify-between hover:bg-glass/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-surface-container-highest border border-glass flex items-center justify-center text-on-surface-variant">
                        <Clock className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-body-sm font-semibold text-on-surface">Footprint Assessment Logged</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">{h.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-bold text-primary">{Math.round(h.emissions_kg)} kg CO2e</p>
                      <p className="text-[10px] text-on-surface-variant font-semibold">Score: {h.carbon_score}/100</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}
