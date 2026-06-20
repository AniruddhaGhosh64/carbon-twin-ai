"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  RotateCcw, 
  Save, 
  Leaf, 
  TrendingDown, 
  TrendingUp, 
  Trees,
  Check,
  Trash2,
  FolderOpen,
  AlertTriangle,
  X,
  Sparkles,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { cn } from "@/lib/utils";

interface TimelinePoint {
  name: string;
  baseline: number;
  projected: number;
}

interface SavedScenario {
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
  levers: {
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
  };
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  
  // Interactive levers states
  const [useMetro, setUseMetro] = useState(false);
  const [reduceMeat, setReduceMeat] = useState(false);
  const [carpool, setCarpool] = useState(false);
  const [cycleDays, setCycleDays] = useState(0);
  const [reduceElectricity, setReduceElectricity] = useState(0);

  // Redesigned levers
  const [reduceDrivingPercentage, setReduceDrivingPercentage] = useState(0.0);
  const [flightReductionCount, setFlightReductionCount] = useState(0);
  const [solarAdoption, setSolarAdoption] = useState(false);
  const [applianceOptimization, setApplianceOptimization] = useState(false);
  const [reduceBeefPercentage, setReduceBeefPercentage] = useState(0.0);
  const [dietTransition, setDietTransition] = useState("none");
  const [reduceDeliveriesPercentage, setReduceDeliveriesPercentage] = useState(0.0);
  const [reduceClothingPercentage, setReduceClothingPercentage] = useState(0.0);
  const [reduceElectronicsPercentage, setReduceElectronicsPercentage] = useState(0.0);
  const [reduceElectricityPercentage, setReduceElectricityPercentage] = useState(0.0);
  
  const [timeframe, setTimeframe] = useState<"6m" | "1y" | "5y" | "10y">("1y");
  const [savingScenario, setSavingScenario] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Apply to twin state
  const [applyingTwin, setApplyingTwin] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Scenarios state
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Backend response state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [simResults, setSimResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch saved scenarios
  const fetchScenarios = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/simulator/scenarios", {
        headers: {
          "X-User-Id": "default_user",
        }
      });
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
      }
    } catch (err) {
      console.error("Failed to load scenarios:", err);
    }
  };

  // Fetch simulation results from backend
  const fetchSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/simulator/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "default_user",
        },
        body: JSON.stringify({
          levers: {
            use_metro: useMetro,
            reduce_meat: reduceMeat,
            carpool: carpool,
            cycle_days: cycleDays,
            reduce_electricity: reduceElectricity,
            reduce_driving_percentage: reduceDrivingPercentage,
            flight_reduction_count: flightReductionCount,
            solar_adoption: solarAdoption,
            appliance_optimization: applianceOptimization,
            reduce_beef_percentage: reduceBeefPercentage,
            diet_transition: dietTransition,
            reduce_deliveries_percentage: reduceDeliveriesPercentage,
            reduce_clothing_percentage: reduceClothingPercentage,
            reduce_electronics_percentage: reduceElectronicsPercentage,
            reduce_electricity_percentage: reduceElectricityPercentage
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSimResults(data);
      }
    } catch (err) {
      console.error("Simulation request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger calculation when levers change
  useEffect(() => {
    fetchSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useMetro, reduceMeat, carpool, cycleDays, reduceElectricity,
    reduceDrivingPercentage, flightReductionCount, solarAdoption,
    applianceOptimization, reduceBeefPercentage, dietTransition,
    reduceDeliveriesPercentage, reduceClothingPercentage,
    reduceElectronicsPercentage, reduceElectricityPercentage
  ]);

  useEffect(() => {
    setMounted(true);
    fetchScenarios();
  }, []);

  // Reset simulator parameters
  const handleReset = () => {
    setUseMetro(false);
    setReduceMeat(false);
    setCarpool(false);
    setCycleDays(0);
    setReduceElectricity(0);
    setReduceDrivingPercentage(0.0);
    setFlightReductionCount(0);
    setSolarAdoption(false);
    setApplianceOptimization(false);
    setReduceBeefPercentage(0.0);
    setDietTransition("none");
    setReduceDeliveriesPercentage(0.0);
    setReduceClothingPercentage(0.0);
    setReduceElectronicsPercentage(0.0);
    setReduceElectricityPercentage(0.0);
  };

  const handleSaveScenario = async () => {
    if (scenarios.length >= 5) {
      setShowLimitModal(true);
      return;
    }

    setSavingScenario(true);
    setSaveSuccess(false);
    try {
      const scenarioName = prompt("Enter a name for this scenario:", "My Carbon Plan") || "My Carbon Plan";
      const response = await fetch("http://127.0.0.1:8000/api/v1/simulator/scenario", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "default_user",
        },
        body: JSON.stringify({
          name: scenarioName,
          levers: {
            use_metro: useMetro,
            reduce_meat: reduceMeat,
            carpool: carpool,
            cycle_days: cycleDays,
            reduce_electricity: reduceElectricity,
            reduce_driving_percentage: reduceDrivingPercentage,
            flight_reduction_count: flightReductionCount,
            solar_adoption: solarAdoption,
            appliance_optimization: applianceOptimization,
            reduce_beef_percentage: reduceBeefPercentage,
            diet_transition: dietTransition,
            reduce_deliveries_percentage: reduceDeliveriesPercentage,
            reduce_clothing_percentage: reduceClothingPercentage,
            reduce_electronics_percentage: reduceElectronicsPercentage,
            reduce_electricity_percentage: reduceElectricityPercentage
          }
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchScenarios();
      } else {
        const errorData = await response.json();
        if (errorData.detail === "MAX_SCENARIOS_EXCEEDED") {
          setShowLimitModal(true);
        } else {
          alert(errorData.detail || "Failed to save scenario");
        }
      }
    } catch (err) {
      console.error("Save scenario failed:", err);
    } finally {
      setSavingScenario(false);
    }
  };

  const handleApplyToTwin = async () => {
    if (!simResults) return;
    setApplyingTwin(true);
    setApplySuccess(false);
    try {
      const scenarioName = "Applied Simulator Strategy";
      
      // 1. POST Apply to Twin Snapshot
      const response = await fetch("http://127.0.0.1:8000/api/v1/carbontwin/apply_simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "default_user",
        },
        body: JSON.stringify({
          scenario_name: scenarioName,
          horizon: timeframe,
          levers: {
            use_metro: useMetro,
            reduce_meat: reduceMeat,
            carpool: carpool,
            cycle_days: cycleDays,
            reduce_electricity: reduceElectricity,
            reduce_driving_percentage: reduceDrivingPercentage,
            flight_reduction_count: flightReductionCount,
            solar_adoption: solarAdoption,
            appliance_optimization: applianceOptimization,
            reduce_beef_percentage: reduceBeefPercentage,
            diet_transition: dietTransition,
            reduce_deliveries_percentage: reduceDeliveriesPercentage,
            reduce_clothing_percentage: reduceClothingPercentage,
            reduce_electronics_percentage: reduceElectronicsPercentage,
            reduce_electricity_percentage: reduceElectricityPercentage
          }
        })
      });

      // 2. Commit Simulation Levers as committed Eco Actions
      await fetch("http://127.0.0.1:8000/api/v1/dashboard/commit_simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "default_user",
        },
        body: JSON.stringify({
          use_metro: useMetro,
          reduce_meat: reduceMeat,
          carpool: carpool,
          cycle_days: cycleDays,
          reduce_electricity: reduceElectricity,
          reduce_driving_percentage: reduceDrivingPercentage,
          flight_reduction_count: flightReductionCount,
          solar_adoption: solarAdoption,
          appliance_optimization: applianceOptimization,
          reduce_beef_percentage: reduceBeefPercentage,
          diet_transition: dietTransition,
          reduce_deliveries_percentage: reduceDeliveriesPercentage,
          reduce_clothing_percentage: reduceClothingPercentage,
          reduce_electronics_percentage: reduceElectronicsPercentage,
          reduce_electricity_percentage: reduceElectricityPercentage
        })
      });

      if (response.ok) {
        setApplySuccess(true);
      }
    } catch (err) {
      console.error("Apply simulation to Twin failed:", err);
    } finally {
      setApplyingTwin(false);
    }
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    const l = scenario.levers;
    if (l) {
      setUseMetro(l.use_metro || false);
      setReduceMeat(l.reduce_meat || false);
      setCarpool(l.carpool || false);
      setCycleDays(l.cycle_days || 0);
      setReduceElectricity(l.reduce_electricity || 0);
      setReduceDrivingPercentage(l.reduce_driving_percentage || 0.0);
      setFlightReductionCount(l.flight_reduction_count || 0);
      setSolarAdoption(l.solar_adoption || false);
      setApplianceOptimization(l.appliance_optimization || false);
      setReduceBeefPercentage(l.reduce_beef_percentage || 0.0);
      setDietTransition(l.diet_transition || "none");
      setReduceDeliveriesPercentage(l.reduce_deliveries_percentage || 0.0);
      setReduceClothingPercentage(l.reduce_clothing_percentage || 0.0);
      setReduceElectronicsPercentage(l.reduce_electronics_percentage || 0.0);
      setReduceElectricityPercentage(l.reduce_electricity_percentage || 0.0);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scenario?")) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/simulator/scenario/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": "default_user",
        }
      });
      if (response.ok) {
        fetchScenarios();
      }
    } catch (err) {
      console.error("Delete scenario failed:", err);
    }
  };

  // Prepare chart data based on selected timeframe
  const getChartData = (): TimelinePoint[] => {
    if (!simResults) return [];

    const baseVal = simResults.base_emissions_kg / 12; // monthly average
    const simVal = simResults.simulated_emissions_kg / 12;

    if (timeframe === "6m") {
      return Array.from({ length: 6 }).map((_, idx) => ({
        name: `Month ${idx + 1}`,
        baseline: Math.round(baseVal * (idx + 1)),
        projected: Math.round(simVal * (idx + 1))
      }));
    } else if (timeframe === "1y") {
      return [
        { name: "Q1", baseline: Math.round(baseVal * 3), projected: Math.round(simVal * 3) },
        { name: "Q2", baseline: Math.round(baseVal * 6), projected: Math.round(simVal * 6) },
        { name: "Q3", baseline: Math.round(baseVal * 9), projected: Math.round(simVal * 9) },
        { name: "Q4", baseline: Math.round(baseVal * 12), projected: Math.round(simVal * 12) }
      ];
    } else if (timeframe === "5y") {
      return Array.from({ length: 5 }).map((_, idx) => ({
        name: `Year ${idx + 1}`,
        baseline: Math.round(simResults.base_emissions_kg * (idx + 1)),
        projected: Math.round(simResults.simulated_emissions_kg * (idx + 1))
      }));
    } else { // 10y
      return Array.from({ length: 10 }).map((_, idx) => ({
        name: `Year ${idx + 1}`,
        baseline: Math.round(simResults.base_emissions_kg * (idx + 1)),
        projected: Math.round(simResults.simulated_emissions_kg * (idx + 1))
      }));
    }
  };

  // Get scaling factor for cumulative numbers
  const getHorizonFactor = () => {
    if (timeframe === "6m") return 0.5;
    if (timeframe === "1y") return 1;
    if (timeframe === "5y") return 5;
    return 10;
  };

  const timeframeFactor = getHorizonFactor();
  const chartData = getChartData();
  const co2Saved = simResults ? Math.round((simResults.base_emissions_kg - simResults.simulated_emissions_kg) * timeframeFactor) : 0;
  const moneySaved = simResults ? Math.round(simResults.money_saved_usd * timeframeFactor) : 0;
  const moneySpent = simResults ? Math.round(simResults.money_spent_usd) : 0;
  const roiPct = simResults ? simResults.roi_percentage : 100.0;
  const breakEvenYears = simResults ? simResults.break_even_years : 0.0;
  const reductionPercent = simResults ? simResults.reduction_percentage : 0;
  const treesEquivalent = simResults ? Math.round(simResults.trees_equivalent * timeframeFactor) : 0;

  // Prioritized AI Recommended Actions (Deterministic List)
  const aiActions = [
    {
      id: "solar",
      title: "Switch to Solar Energy Provider",
      impact: "High",
      difficulty: "Hard",
      timeframe: "1-3 Months",
      reduction: "-800 kg CO₂e",
      savings: "$450/yr",
      cost: "$2,500",
      active: solarAdoption,
      onToggle: () => setSolarAdoption(!solarAdoption)
    },
    {
      id: "cycle",
      title: "Cycle to Work 3 Days/Week",
      impact: "Medium",
      difficulty: "Moderate",
      timeframe: "Immediate",
      reduction: "-300 kg CO₂e",
      savings: "$180/yr",
      cost: "$300",
      active: cycleDays === 3,
      onToggle: () => setCycleDays(cycleDays === 3 ? 0 : 3)
    },
    {
      id: "diet",
      title: "Shift to Vegetarian Diet",
      impact: "Medium",
      difficulty: "Moderate",
      timeframe: "Immediate",
      reduction: "-450 kg CO₂e",
      savings: "$250/yr",
      cost: "$0",
      active: dietTransition === "vegetarian",
      onToggle: () => setDietTransition(dietTransition === "vegetarian" ? "none" : "vegetarian")
    },
    {
      id: "appliances",
      title: "Smart Appliance Upgrades",
      impact: "Low",
      difficulty: "Easy",
      timeframe: "1-3 Months",
      reduction: "-120 kg CO₂e",
      savings: "$90/yr",
      cost: "$500",
      active: applianceOptimization,
      onToggle: () => setApplianceOptimization(!applianceOptimization)
    },
    {
      id: "driving",
      title: "Reduce Single-Passenger Driving",
      impact: "High",
      difficulty: "Moderate",
      timeframe: "Immediate",
      reduction: "-500 kg CO₂e",
      savings: "$400/yr",
      cost: "$0",
      active: reduceDrivingPercentage === 30,
      onToggle: () => setReduceDrivingPercentage(reduceDrivingPercentage === 30 ? 0 : 30)
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Impact Simulator</h1>
          <p className="text-sm text-on-surface-variant">Model household carbon strategies, analyze financial ROI, and sync directly with Carbon Twin.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-glass text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Levers
          </button>
          <button 
            onClick={handleSaveScenario}
            disabled={savingScenario || !simResults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {savingScenario ? "Saving..." : `Save Plan (${scenarios.length}/5)`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. HORIZONTAL HERO ROW (Metrics Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reduction % Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-secondary/15 border border-secondary/20 flex items-center justify-center flex-shrink-0">
            <Leaf className="h-5 w-5 text-secondary animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Reduction</span>
            <span className="text-2xl font-extrabold text-secondary leading-none">-{reductionPercent.toFixed(0)}%</span>
          </div>
        </Card>
        
        {/* Horizon Savings Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Horizon Savings</span>
            <span className="text-2xl font-extrabold text-primary leading-none">${moneySaved.toLocaleString()}</span>
          </div>
        </Card>

        {/* Rating Gain Card */}
        <Card className="border border-glass bg-glass p-5 flex items-center gap-4 text-left">
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Rating Gain</span>
            <span className="text-2xl font-extrabold text-primary leading-none">
              +{simResults ? Math.max(0, simResults.simulated_carbon_score - simResults.base_carbon_score) : 0} pts
            </span>
          </div>
        </Card>

        {/* Time Horizon selector */}
        <Card className="border border-glass bg-glass p-5 flex flex-col justify-center text-left">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block mb-2">Time Horizon</span>
          <div className="flex gap-1 bg-surface-container rounded-lg p-1 border border-glass">
            {(["6m", "1y", "5y", "10y"] as const).map((h) => (
              <button
                key={h}
                onClick={() => setTimeframe(h)}
                className={cn(
                  "flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all",
                  timeframe === h
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                )}
              >
                {h === "6m" ? "6M" : h === "1y" ? "1Y" : h === "5y" ? "5Y" : "10Y"}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 2. Before/After Dashboard + Apply to Carbon Twin Trigger */}
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {/* Baseline Profile */}
        <Card className="border border-glass bg-glass p-5 flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Baseline State</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-glass text-on-surface-variant bg-surface-container-low font-bold">Current</span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-on-surface">
                {simResults ? ((simResults.base_emissions_kg * timeframeFactor) / 1000).toFixed(1) : "0.0"}
              </span>
              <span className="text-sm font-semibold text-on-surface-variant">Tons CO₂e</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-on-surface-variant">Baseline Score</span>
              <span className="text-lg font-extrabold text-on-surface">
                {simResults ? simResults.base_carbon_score : "0"} / 100
              </span>
            </div>
          </div>
        </Card>

        {/* Simulated Future */}
        <Card className="border border-glass bg-glass p-5 flex flex-col justify-between text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Simulated Future</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-secondary/20 text-secondary bg-secondary/15 font-bold">-{reductionPercent.toFixed(0)}% CO₂e</span>
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-secondary">
                {simResults ? ((simResults.simulated_emissions_kg * timeframeFactor) / 1000).toFixed(1) : "0.0"}
              </span>
              <span className="text-sm font-semibold text-secondary/90">Tons CO₂e</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-on-surface-variant">Future Carbon Score</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-secondary">
                  {simResults ? simResults.simulated_carbon_score : "0"} / 100
                </span>
                {simResults && simResults.simulated_carbon_score > simResults.base_carbon_score && (
                  <span className="text-[9px] text-secondary font-bold bg-secondary/15 px-1.5 py-0.5 rounded-md border border-secondary/10">
                    +{simResults.simulated_carbon_score - simResults.base_carbon_score} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Apply to Twin Workspace */}
        <Card className="border border-primary/30 bg-gradient-to-br from-emerald-950/25 to-emerald-900/10 p-5 flex flex-col justify-between text-left shadow-glow">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Connected Engine</span>
            </div>
            <h4 className="text-base font-bold text-on-surface">Apply To Carbon Twin</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Persist your customized simulator scenario levers directly into your Carbon Twin as an optimization configuration snapshot.
            </p>
          </div>

          <div className="pt-4 space-y-2.5">
            {applySuccess ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs bg-primary/10 border border-primary/20 p-2.5 rounded-lg">
                  <Check className="h-4.5 w-4.5" />
                  Twin Snapshot Applied!
                </div>
                <Link href="/carbon-twin" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/95 transition-all">
                  Go to Carbon Twin
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <button 
                onClick={handleApplyToTwin}
                disabled={applyingTwin || !simResults}
                className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50"
              >
                {applyingTwin ? "Applying..." : "Apply To Twin"}
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* 3. PRIORITIZED AI RECOMMENDED ACTIONS SECTION */}
      <Card className="border border-glass bg-glass text-left">
        <CardHeader className="pb-3 border-b border-glass flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Prioritized AI Recommended Actions
            </CardTitle>
            <CardDescription>Highest-impact options detected from your assessment profile. Click to simulate instantly.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {aiActions.map((act) => (
              <div 
                key={act.id}
                className={cn(
                  "p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 text-left",
                  act.active 
                    ? "border-primary bg-primary-container/10 shadow-glow" 
                    : "border-glass bg-surface-container-low hover:border-glass-subtle"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                      act.impact === "High" 
                        ? "border-secondary/20 bg-secondary/10 text-secondary"
                        : act.impact === "Medium"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-glass bg-surface-container-highest text-on-surface-variant"
                    )}>
                      {act.impact} Impact
                    </span>
                    <span className="text-[9px] font-bold text-on-surface-variant font-mono">
                      {act.timeframe}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-on-surface line-clamp-2">{act.title}</h4>
                  
                  <div className="space-y-1 pt-1.5 text-[10px] font-semibold">
                    <div className="text-secondary">CO₂: {act.reduction}</div>
                    <div className="text-primary">Save: {act.savings}</div>
                    <div className="text-on-surface-variant">Cost: {act.cost}</div>
                  </div>
                </div>

                <button 
                  onClick={act.onToggle}
                  className={cn(
                    "w-full py-1.5 rounded-md text-[10px] font-bold transition-all border",
                    act.active 
                      ? "bg-primary border-primary text-on-primary" 
                      : "bg-surface-container-low border-glass text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {act.active ? "Simulated" : "Simulate Action"}
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. FINANCIAL ROI ANALYTICS */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Capital Spent */}
        <Card className="border border-glass bg-glass p-5 text-left relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Capital Spent</span>
            <DollarSign className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">
              ${moneySpent.toLocaleString()}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed font-semibold">
              Initial technology spent
            </div>
          </div>
        </Card>

        {/* Annual Savings */}
        <Card className="border border-glass bg-glass p-5 text-left relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Annual Savings</span>
            <TrendingUp className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-primary">
              ${moneySaved.toLocaleString()}
            </div>
            <div className="text-[10px] text-primary mt-1.5 leading-relaxed font-semibold">
              Calculated over Selected Horizon
            </div>
          </div>
        </Card>

        {/* ROI (%) */}
        <Card className="border border-glass bg-glass p-5 text-left relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Return On Investment</span>
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">
              {moneySpent === 0 ? "100.0" : roiPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed font-semibold">
              {moneySpent === 0 ? "Zero investment ROI" : "Annual percentage yield"}
            </div>
          </div>
        </Card>

        {/* Break-even Period */}
        <Card className="border border-glass bg-glass p-5 text-left relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Break-even Period</span>
            <Zap className="h-4.5 w-4.5 text-primary animate-pulse" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-on-surface">
              {moneySpent === 0 ? "Instant" : `${breakEvenYears.toFixed(1)} Years`}
            </div>
            <div className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed font-semibold">
              Capital recovery timeframe
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Main Grid: Advanced Controls & Chart */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Side: Advanced Manual Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-glass bg-glass text-left">
            <CardHeader className="pb-4 border-b border-glass">
              <CardTitle>Advanced Manual Controls</CardTitle>
              <CardDescription>Fine-tune individual green parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* Transportation Group */}
              <div className="space-y-4">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Transportation Levers</span>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Use Public Metro</span>
                    <span className="text-[10px] text-on-surface-variant">Switch daily commute to transit</span>
                  </div>
                  <Switch checked={useMetro} onCheckedChange={setUseMetro} />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Carpool Sharing</span>
                    <span className="text-[10px] text-on-surface-variant">Carpool for non-transit driving</span>
                  </div>
                  <Switch checked={carpool} onCheckedChange={setCarpool} />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Reduce Weekly Driving</span>
                    <span className="text-xs font-bold text-primary">{reduceDrivingPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceDrivingPercentage}
                    onValueChange={(val) => setReduceDrivingPercentage(val)}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Cycling Commutes</span>
                    <span className="text-xs font-bold text-primary">{cycleDays} Days/Wk</span>
                  </div>
                  <Slider
                    min={0}
                    max={7}
                    value={cycleDays}
                    onValueChange={(val) => setCycleDays(val)}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Reduce Annual Flights</span>
                    <span className="text-xs font-bold text-primary">{flightReductionCount} flights</span>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    value={flightReductionCount}
                    onValueChange={(val) => setFlightReductionCount(val)}
                  />
                </div>
              </div>

              {/* Energy Group */}
              <div className="space-y-4 border-t border-glass pt-4">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Home Energy Levers</span>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Solar Panels Setup</span>
                    <span className="text-[10px] text-on-surface-variant">Switch power supply to solar</span>
                  </div>
                  <Switch checked={solarAdoption} onCheckedChange={setSolarAdoption} />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">Smart Appliances</span>
                    <span className="text-[10px] text-on-surface-variant">Appliance efficiency settings</span>
                  </div>
                  <Switch checked={applianceOptimization} onCheckedChange={setApplianceOptimization} />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Reduce Electricity Grid Draw</span>
                    <span className="text-xs font-bold text-primary">-{reduceElectricityPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceElectricityPercentage}
                    onValueChange={(val) => setReduceElectricityPercentage(val)}
                  />
                </div>
              </div>

              {/* Food Group */}
              <div className="space-y-4 border-t border-glass pt-4">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Dietary Levers</span>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Lower Beef Intake</span>
                    <span className="text-xs font-bold text-primary">-{reduceBeefPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceBeefPercentage}
                    onValueChange={(val) => setReduceBeefPercentage(val)}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-on-surface block">Diet Transition Scheme</span>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container rounded-lg border border-glass">
                    {["none", "balanced", "vegetarian", "vegan"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDietTransition(d)}
                        className={cn(
                          "py-1 rounded text-[9px] font-bold uppercase transition-all",
                          dietTransition === d
                            ? "bg-primary text-on-primary shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shopping Group */}
              <div className="space-y-4 border-t border-glass pt-4">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Discretionary Shopping Levers</span>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Consolidate Deliveries</span>
                    <span className="text-xs font-bold text-primary">-{reduceDeliveriesPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceDeliveriesPercentage}
                    onValueChange={(val) => setReduceDeliveriesPercentage(val)}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Reduce Clothing Purchases</span>
                    <span className="text-xs font-bold text-primary">-{reduceClothingPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceClothingPercentage}
                    onValueChange={(val) => setReduceClothingPercentage(val)}
                  />
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-on-surface">Reduce Electronics Purchases</span>
                    <span className="text-xs font-bold text-primary">-{reduceElectronicsPercentage}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={reduceElectronicsPercentage}
                    onValueChange={(val) => setReduceElectronicsPercentage(val)}
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Side: Projections & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {/* CO2 Saved */}
            <Card className="border border-glass bg-glass p-4 text-left">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">CO₂ Saved</span>
                <TrendingDown className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl font-bold text-on-surface">
                {co2Saved.toLocaleString()} kg
              </div>
              <div className="text-[10px] text-primary font-medium mt-1">
                over horizon
              </div>
            </Card>

            {/* % Reduction */}
            <Card className="border border-glass bg-glass p-4 text-left">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">% Reduction</span>
                <Leaf className="h-4 w-4 text-secondary" />
              </div>
              <div className="text-xl font-bold text-secondary">{reductionPercent.toFixed(0)}%</div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mt-2">
                <div className="h-full bg-secondary" style={{ width: `${Math.min(reductionPercent, 100)}%` }} />
              </div>
            </Card>

            {/* Trees Eqv. */}
            <Card className="border border-glass bg-glass p-4 text-left">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Trees Eqv.</span>
                <Trees className="h-4 w-4 text-on-surface" />
              </div>
              <div className="text-xl font-bold text-on-surface">
                {treesEquivalent.toLocaleString()}
              </div>
              <div className="text-[10px] text-on-surface-variant mt-1">
                offset equivalent
              </div>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="border border-glass bg-glass">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-glass text-left">
              <div>
                <CardTitle>Emissions Timeline Projection</CardTitle>
                <CardDescription>Estimated trajectory offset over selected timeframe (kg CO₂e).</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {mounted && simResults ? (
                <div className={cn("h-72 w-full transition-opacity duration-300", loading && "opacity-50")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#95d4b3" stopOpacity={0.3} />
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
                        dataKey="name" 
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
                        dataKey="baseline"
                        stroke="#8a938c"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        fill="none"
                        name="Baseline Trajectory"
                      />
                      <Area
                        type="monotone"
                        dataKey="projected"
                        stroke="#95d4b3"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorProjected)"
                        name="Projected Trajectory"
                        dot={{ r: 4, fill: "#95d4b3", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#95d4b3" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 w-full flex items-center justify-center text-sm text-on-surface-variant">
                  Loading timeline sandbox...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scenario Lockbox Storage */}
      <Card className="border border-glass bg-glass mt-6">
        <CardHeader className="border-b border-glass pb-4 text-left">
          <CardTitle className="flex items-center gap-2">
            <span>Scenario Lockbox</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-glass font-medium text-on-surface-variant bg-surface-container-low/40">
              {scenarios.length} / 5 Saved
            </span>
          </CardTitle>
          <CardDescription>Load previously designed plans or delete them to free up space.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {scenarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant gap-2 text-center">
              <FolderOpen className="h-8 w-8 text-on-surface-variant/45" />
              <p className="text-sm font-medium">No saved scenarios yet.</p>
              <p className="text-xs">Adjust behavioral parameters and click &quot;Save Plan&quot; above.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {scenarios.map((s) => (
                <div 
                  key={s.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-glass bg-surface-container-low/20 hover:border-glass-subtle transition-all gap-4 text-left"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-on-surface line-clamp-1">{s.name}</h4>
                    <span className="text-[10px] text-on-surface-variant">
                      Saved {new Date(s.saved_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-secondary">
                        -{s.reduction_percentage.toFixed(0)}% CO₂e
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        |
                      </span>
                      <span className="text-xs font-semibold text-primary">
                        ${Math.round(s.money_saved_usd)}/yr
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-glass pt-2">
                    <button 
                      onClick={() => handleLoadScenario(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low/80 hover:bg-surface-container text-xs font-bold text-on-surface hover:text-primary transition-all border border-glass"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Load
                    </button>
                    <button 
                      onClick={() => handleDeleteScenario(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/20 hover:bg-red-950/45 text-xs font-bold text-red-400 transition-all border border-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overflow Scenario Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="relative border border-glass bg-[#031d13] p-6 rounded-2xl max-w-md w-full text-center space-y-6 shadow-glow">
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="h-14 w-14 rounded-full bg-red-950/50 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-on-surface">Maximum Scenarios Reached</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                You have reached the maximum number of saved scenarios. Delete an existing scenario before creating a new one.
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold text-red-400 transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
