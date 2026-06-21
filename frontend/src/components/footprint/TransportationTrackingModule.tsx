"use client";

import React, { useState, useEffect } from "react";
import { 
  Car, Train, Bike, Footprints, Plane, Leaf, Plus, Trash2, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import { AIRPORTS, calculateFlightDistanceKm, calculateFlightEmissions } from "@/data/airports";
import { VEHICLE_FACTORS, TRANSIT_FACTOR, MILES_TO_KM } from "@/lib/constants";

export interface DailyLog {
  car: number;
  public_transit: number;
  bicycle: number;
  walking: number;
}

export interface WeeklyLog {
  monday: DailyLog;
  tuesday: DailyLog;
  wednesday: DailyLog;
  thursday: DailyLog;
  friday: DailyLog;
  saturday: DailyLog;
  sunday: DailyLog;
}

export interface FlightRecord {
  id: string;
  date: string;
  source_airport: string;
  destination_airport: string;
  trip_type: "one_way" | "round_trip";
  distance_km: number;
  carbon_emissions_kg: number;
}

interface TransportationTrackingModuleProps {
  trackingUnit: "km" | "miles";
  setTrackingUnit: (unit: "km" | "miles") => void;
  vehicleType: "gasoline" | "hybrid" | "ev";
  setVehicleType: (type: "gasoline" | "hybrid" | "ev") => void;
  isWeeklyOverride: boolean;
  setIsWeeklyOverride: (val: boolean) => void;
  currentWeek: WeeklyLog;
  setCurrentWeek: React.Dispatch<React.SetStateAction<WeeklyLog>>;
  weeklyOverride: DailyLog;
  setWeeklyOverride: React.Dispatch<React.SetStateAction<DailyLog>>;
  flightRecords: FlightRecord[];
  setFlightRecords: (records: FlightRecord[]) => void;
}

export default function TransportationTrackingModule({
  trackingUnit,
  setTrackingUnit,
  vehicleType,
  setVehicleType,
  isWeeklyOverride,
  setIsWeeklyOverride,
  currentWeek,
  setCurrentWeek,
  weeklyOverride,
  setWeeklyOverride,
  flightRecords,
  setFlightRecords
}: TransportationTrackingModuleProps) {
  const [activeGroundMode, setActiveGroundMode] = useState<"car" | "public_transit" | "bicycle" | "walking">("car");
  const [summaryViewMode, setSummaryViewMode] = useState<"week" | "month" | "year">("week");
  const [isWeekend, setIsWeekend] = useState(false);

  // Default flight date to today
  const [newFlightDate, setNewFlightDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [newFlightSrc, setNewFlightSrc] = useState("CCU");
  const [newFlightDst, setNewFlightDst] = useState("DEL");
  const [newFlightType, setNewFlightType] = useState<"one_way" | "round_trip">("one_way");

  useEffect(() => {
    const day = new Date().getDay();
    // 0 is Sunday, 6 is Saturday
    setIsWeekend(day === 0 || day === 6);
  }, []);

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const modes: { id: "car" | "public_transit" | "bicycle" | "walking"; icon: typeof Car; label: string }[] = [
    { id: "car", icon: Car, label: "Personal Car" },
    { id: "public_transit", icon: Train, label: "Public Transit" },
    { id: "bicycle", icon: Bike, label: "Bicycle" },
    { id: "walking", icon: Footprints, label: "Walking" }
  ];

  // Transportation Summary Card Calculations
  const selectedModeDistance = isWeeklyOverride
    ? (weeklyOverride[activeGroundMode] || 0)
    : days.reduce((sum, day) => {
        const dayData = currentWeek[day as keyof typeof currentWeek];
        return sum + (dayData[activeGroundMode] || 0);
      }, 0);

  const totalGroundDistance = isWeeklyOverride
    ? Object.values(weeklyOverride).reduce((sum, val) => sum + (val || 0), 0)
    : days.reduce((sum, day) => {
        const dayData = currentWeek[day as keyof typeof currentWeek];
        return sum + Object.values(dayData).reduce((dSum: number, val: number) => dSum + (val || 0), 0);
      }, 0);

  const totalFlightDistanceKm = flightRecords.reduce((sum, f) => sum + (f.distance_km || 0), 0);
  const totalFlightDistance = trackingUnit === "miles" ? totalFlightDistanceKm / MILES_TO_KM : totalFlightDistanceKm;

  const totalTransportationDistance = totalGroundDistance + totalFlightDistance;

  const carFactor = VEHICLE_FACTORS[vehicleType as keyof typeof VEHICLE_FACTORS] ?? VEHICLE_FACTORS.gasoline;
  const transitFactor = TRANSIT_FACTOR;

  const getWeeklyModeDistanceKm = (mode: "car" | "public_transit" | "bicycle" | "walking") => {
    const dist = isWeeklyOverride
      ? (weeklyOverride[mode] || 0)
      : days.reduce((sum, day) => {
          const dayData = currentWeek[day as keyof typeof currentWeek];
          return sum + (dayData[mode] || 0);
        }, 0);
    return trackingUnit === "miles" ? dist * MILES_TO_KM : dist;
  };

  const carDistKm = getWeeklyModeDistanceKm("car");
  const transitDistKm = getWeeklyModeDistanceKm("public_transit");

  const estimatedGroundCO2 = (carDistKm * carFactor) + (transitDistKm * transitFactor);
  const estimatedFlightCO2 = flightRecords.reduce((sum, f) => sum + (f.carbon_emissions_kg || 0), 0);
  const totalTransportationCO2 = estimatedGroundCO2 + estimatedFlightCO2;

  const srcAirport = AIRPORTS.find(a => a.code === newFlightSrc);
  const dstAirport = AIRPORTS.find(a => a.code === newFlightDst);
  const liveFlightDistance = srcAirport && dstAirport 
    ? calculateFlightDistanceKm(srcAirport.lat, srcAirport.lng, dstAirport.lat, dstAirport.lng)
    : 0;
  const liveFlightEmissions = calculateFlightEmissions(liveFlightDistance, newFlightType);

  const handleWeeklyToggle = (checked: boolean) => {
    setIsWeeklyOverride(checked);
  };

  const updateDaily = (day: string, mode: "car" | "public_transit" | "bicycle" | "walking", val: string) => {
    const num = val === "" ? 0 : parseFloat(val);
    if (isNaN(num) || num < 0) return;
    
    setCurrentWeek(prev => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof currentWeek], [mode]: num }
    }));
  };

  const updateWeekly = (mode: "car" | "public_transit" | "bicycle" | "walking", val: string) => {
    const num = val === "" ? 0 : parseFloat(val);
    if (isNaN(num) || num < 0) return;
    
    setWeeklyOverride(prev => ({
      ...prev,
      [mode]: num
    }));
  };

  const handleAddFlight = () => {
    if (newFlightSrc === newFlightDst) return;
    
    const src = AIRPORTS.find(a => a.code === newFlightSrc);
    const dst = AIRPORTS.find(a => a.code === newFlightDst);
    if (!src || !dst) return;
    
    const dist = calculateFlightDistanceKm(src.lat, src.lng, dst.lat, dst.lng);
    const co2 = calculateFlightEmissions(dist, newFlightType);
    
    setFlightRecords([
      ...flightRecords,
      {
        id: `flight_${Date.now()}`,
        date: newFlightDate,
        source_airport: newFlightSrc,
        destination_airport: newFlightDst,
        trip_type: newFlightType,
        distance_km: dist,
        carbon_emissions_kg: co2
      }
    ]);
  };

  const removeFlight = (id: string) => {
    setFlightRecords(flightRecords.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-10">
      {/* Ground Transportation Card */}
      <Card className="border border-glass">
        <CardHeader className="flex flex-row items-center gap-4 p-8 md:p-10 pb-8 border-b border-glass">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Car className="h-6 w-6" />
          </div>
          <div className="text-left">
            <CardTitle className="text-lg font-bold">Ground Transportation</CardTitle>
            <CardDescription className="text-xs">Configure your daily or weekly land commute distance.</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 md:p-10 pt-8 space-y-8">
          {/* Unit and Mode Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-glass pb-6">
            {/* Daily / Weekly Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant font-semibold">Tracking Mode:</span>
              <div className="relative flex items-center bg-surface-container/60 border border-glass p-0.5 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => handleWeeklyToggle(false)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                    !isWeeklyOverride 
                      ? "bg-primary text-on-primary shadow-glow" 
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  Daily
                </button>
                
                <div className="relative group">
                  <button
                    type="button"
                    disabled={!isWeekend}
                    onClick={() => handleWeeklyToggle(true)}
                    className={cn(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                      isWeeklyOverride 
                        ? "bg-primary text-on-primary shadow-glow" 
                        : "text-on-surface-variant hover:text-on-surface disabled:hover:text-on-surface-variant"
                    )}
                  >
                    Weekly
                  </button>
                  
                  {!isWeekend && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block bg-surface-container border border-glass text-[11px] text-on-surface p-2 rounded-lg shadow-lg text-center z-50 pointer-events-none">
                      Available on Saturday and Sunday
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Unit Selector */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-sm text-on-surface-variant font-semibold">Unit:</span>
              <div className="flex bg-surface-container/60 border border-glass p-0.5 rounded-lg w-fit">
                <button 
                  type="button"
                  onClick={() => setTrackingUnit("km")}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                    trackingUnit === "km" 
                      ? "bg-primary/20 border border-primary/20 text-primary font-bold" 
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  KM
                </button>
                <button 
                  type="button"
                  onClick={() => setTrackingUnit("miles")}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                    trackingUnit === "miles" 
                      ? "bg-primary/20 border border-primary/20 text-primary font-bold" 
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  MI
                </button>
              </div>
            </div>
          </div>

          {isWeeklyOverride && (
            <div className="flex items-center gap-3 text-xs text-secondary bg-secondary/10 border border-secondary/20 p-4 rounded-xl">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Daily entries are ignored. Using Weekly values for calculations.
            </div>
          )}

          {/* Ground Transport Mode Selector */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-left block">
              Select Transport Mode
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modes.map((m) => {
                const Icon = m.icon;
                const isSelected = activeGroundMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveGroundMode(m.id)}
                    className={cn(
                      "flex items-center justify-center gap-3 py-3 px-4 rounded-xl border text-xs font-bold transition-all",
                      isSelected 
                        ? "bg-primary/15 border-primary text-primary shadow-glow" 
                        : "border-glass text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle Energy Type Row (Only visible when Car is active) */}
          {activeGroundMode === "car" && (
            <div className="space-y-3 pt-4 text-left border-t border-glass">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Vehicle Fuel Type
              </span>
              <div className="flex flex-wrap gap-3">
                {["gasoline", "hybrid", "ev"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type as "gasoline" | "hybrid" | "ev")}
                    className={cn(
                      "px-5 py-2.5 rounded-full border text-xs font-semibold transition-all capitalize",
                      vehicleType === type
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-glass text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    )}
                  >
                    {type === "ev" ? "Electric (EV)" : type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inputs area */}
          {!isWeeklyOverride ? (
            <div className="space-y-6 pt-4 border-t border-glass">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-left block">
                Daily Distance Entries ({modes.find(m => m.id === activeGroundMode)?.label})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 md:gap-6">
                {days.map((day) => {
                  const dayKey = day as keyof typeof currentWeek;
                  const value = currentWeek[dayKey][activeGroundMode];
                  return (
                    <div key={day} className="flex flex-col bg-surface-container/40 border border-glass rounded-2xl p-4 text-left transition-all hover:border-primary/20 hover:bg-surface-container/60 shadow-sm">
                      <span className="text-xs font-semibold text-on-surface-variant capitalize">{day.substring(0, 3)}</span>
                      <div className="mt-2.5 relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={value || ""}
                        onChange={(e) => updateDaily(day, activeGroundMode, e.target.value)}
                        placeholder="0"
                        aria-label={`Distance for ${day}`}
                        className="w-full bg-surface border border-glass rounded-xl py-2 px-3 text-sm text-on-surface text-center focus:border-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-4 border-t border-glass text-left">
              {modes.filter(m => m.id === activeGroundMode).map(m => (
                <div key={m.id} className="bg-surface-container/40 border border-glass rounded-2xl p-6 md:p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <m.icon className="h-6 w-6 text-primary" />
                      <span className="text-base font-semibold text-on-surface">{m.label} Weekly Distance</span>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="number" min="0" step="0.1"
                        value={weeklyOverride[m.id] || ""}
                        onChange={(e) => updateWeekly(m.id, e.target.value)}
                        aria-label={`${m.label} Weekly Distance`}
                        className="w-28 bg-surface border border-glass rounded-xl py-2 pl-4 pr-10 text-sm text-on-surface focus:border-primary outline-none text-right font-semibold"
                        placeholder="0"
                      />
                      <span className="absolute right-3.5 text-[10px] text-on-surface-variant font-semibold uppercase">
                        {trackingUnit}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Slider
                      min={0}
                      max={1000}
                      value={weeklyOverride[m.id] || 0}
                      onValueChange={(val) => updateWeekly(m.id, val.toString())}
                      aria-label={`${m.label} Weekly Distance Slider`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transportation Summary Card */}
      <Card className="border border-glass bg-glass-panel backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between p-8 md:p-10 pb-6 border-b border-glass">
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Leaf className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Transportation Summary</CardTitle>
              <CardDescription className="text-xs">Real-time weekly carbon footprint estimation</CardDescription>
            </div>
          </div>
          
          {/* View switcher */}
          <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass w-fit">
            <button
              type="button"
              onClick={() => setSummaryViewMode("week")}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold rounded-md transition-all",
                summaryViewMode === "week" ? "bg-primary text-on-primary shadow-glow" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Week
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled
                className="px-3 py-1 text-[11px] font-semibold rounded-md text-on-surface-variant/40 cursor-not-allowed"
              >
                Month
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-surface-container border border-glass text-[10px] text-on-surface px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                Month view coming soon
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                disabled
                className="px-3 py-1 text-[11px] font-semibold rounded-md text-on-surface-variant/40 cursor-not-allowed"
              >
                Year
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-surface-container border border-glass text-[10px] text-on-surface px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                Year view coming soon
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 md:p-10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Card 1: Selected Mode Distance */}
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-primary/30 hover:bg-surface-container/50 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Selected Mode ({modes.find(m => m.id === activeGroundMode)?.label})
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {selectedModeDistance.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">{trackingUnit}</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Active tracking mode
              </div>
            </div>

            {/* Card 2: Total Transportation Distance */}
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-primary/30 hover:bg-surface-container/50 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Total Distance
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {totalTransportationDistance.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">{trackingUnit}</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Ground {totalGroundDistance.toFixed(0)} + Flight {totalFlightDistance.toFixed(0)} {trackingUnit}
              </div>
            </div>

            {/* Card 3: Estimated Transportation CO2 */}
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-secondary/30 hover:bg-surface-container/50 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Estimated Transportation CO₂
                </span>
                <span className="text-2xl font-black text-secondary mt-2 block">
                  {estimatedGroundCO2.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">kg</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Land transit emissions
              </div>
            </div>

            {/* Card 4: Flight CO2 */}
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-secondary/30 hover:bg-surface-container/50 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Flight CO₂
                </span>
                <span className="text-2xl font-black text-secondary mt-2 block">
                  {estimatedFlightCO2.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">kg</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Logged flight emissions
              </div>
            </div>

            {/* Card 5: Total Transportation CO2 */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-primary/40 shadow-glow-sm text-left">
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                  Total Transport CO₂
                </span>
                <span className="text-2xl font-black text-primary mt-2 block">
                  {totalTransportationCO2.toFixed(1)} <span className="text-xs font-normal text-primary/70">kg</span>
                </span>
              </div>
              <div className="text-[10px] text-primary/70 font-medium">
                Ground {estimatedGroundCO2.toFixed(0)}kg + Flight {estimatedFlightCO2.toFixed(0)}kg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Air Travel Card */}
      <Card className="border border-glass">
        <CardHeader className="flex flex-row items-center justify-between p-8 md:p-10 pb-8 border-b border-glass">
          <div className="flex items-center gap-4 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Plane className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Air Travel</CardTitle>
              <CardDescription className="text-xs">Log your domestic flights and calculate aviation emissions.</CardDescription>
            </div>
          </div>

          {/* Domestic / International Tabs */}
          <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass w-fit">
            <button
              type="button"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-primary text-on-primary shadow-glow"
            >
              Domestic
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md text-on-surface-variant/40 cursor-not-allowed"
              >
                International
              </button>
              <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block bg-surface-container border border-glass text-[10px] text-on-surface px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                Coming Soon
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 md:p-10 pt-8 space-y-8">
          {/* Route & Distance Live Preview */}
          {srcAirport && dstAirport && newFlightSrc !== newFlightDst && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex items-center gap-6 text-lg font-bold text-on-surface">
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black text-primary leading-none">{srcAirport.code}</span>
                  <span className="text-xs font-medium text-on-surface-variant mt-1">{srcAirport.city}</span>
                </div>
                <div className="flex flex-col items-center justify-center px-4">
                  <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    {newFlightType === "one_way" ? "One Way" : "Round Trip"}
                  </span>
                  <div className="flex items-center gap-2 my-2">
                    <div className="h-0.5 w-16 bg-primary/30 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <Plane className="h-5 w-5 text-primary animate-pulse" />
                    <div className="h-0.5 w-16 bg-primary/30 relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-3xl font-black text-primary leading-none">{dstAirport.code}</span>
                  <span className="text-xs font-medium text-on-surface-variant mt-1">{dstAirport.city}</span>
                </div>
              </div>
              
              <div className="flex gap-8 text-xs border-t border-glass pt-4 w-full justify-center">
                <div>
                  <span className="text-on-surface-variant block text-[10px] uppercase tracking-wider">Est. Distance</span>
                  <span className="font-bold text-sm text-on-surface block mt-0.5">
                    {trackingUnit === "miles" 
                      ? `${(liveFlightDistance / 1.60934).toFixed(1)} miles`
                      : `${liveFlightDistance.toFixed(1)} km`
                    }
                  </span>
                </div>
                <div className="border-r border-glass" />
                <div>
                  <span className="text-on-surface-variant block text-[10px] uppercase tracking-wider">Est. CO₂ Impact</span>
                  <span className="font-bold text-sm text-secondary block mt-0.5">{liveFlightEmissions.toFixed(1)} kg CO₂e</span>
                </div>
              </div>
            </div>
          )}

          {newFlightSrc === newFlightDst && (
            <div className="bg-glass border border-dashed border-glass rounded-2xl p-6 text-center text-xs text-on-surface-variant italic">
              Select different departure and destination airports to see route previews.
            </div>
          )}

          {/* Flight Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 p-6 md:p-8 bg-surface-container/20 border border-glass rounded-2xl">
            <div className="flex flex-col text-left space-y-1.5">
              <label htmlFor="flightSource" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">From Airport</label>
              <select 
                id="flightSource"
                value={newFlightSrc}
                onChange={e => setNewFlightSrc(e.target.value)}
                className="w-full bg-surface border border-glass rounded-xl p-3 text-sm focus:border-primary outline-none text-on-surface font-medium"
              >
                {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.city}</option>)}
              </select>
            </div>
            <div className="flex flex-col text-left space-y-1.5">
              <label htmlFor="flightDest" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">To Airport</label>
              <select 
                id="flightDest"
                value={newFlightDst}
                onChange={e => setNewFlightDst(e.target.value)}
                className="w-full bg-surface border border-glass rounded-xl p-3 text-sm focus:border-primary outline-none text-on-surface font-medium"
              >
                {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.city}</option>)}
              </select>
            </div>
            <div className="flex flex-col text-left space-y-1.5">
              <label htmlFor="flightType" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Trip Type</label>
              <select 
                id="flightType"
                value={newFlightType}
                onChange={e => setNewFlightType(e.target.value as "one_way" | "round_trip")}
                className="w-full bg-surface border border-glass rounded-xl p-3 text-sm focus:border-primary outline-none text-on-surface font-medium"
              >
                <option value="one_way">One Way</option>
                <option value="round_trip">Round Trip</option>
              </select>
            </div>
            <div className="flex flex-col text-left space-y-1.5">
              <label htmlFor="flightDate" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Flight Date</label>
              <input 
                id="flightDate"
                type="date"
                value={newFlightDate}
                onChange={e => setNewFlightDate(e.target.value)}
                className="w-full bg-surface border border-glass rounded-xl p-3 text-sm focus:border-primary outline-none text-on-surface font-medium"
              />
            </div>
          </div>

          <button 
            type="button"
            onClick={handleAddFlight}
            disabled={newFlightSrc === newFlightDst}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-xl font-bold hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] text-sm"
          >
            <Plus className="h-5 w-5" />
            Add Flight Record
          </button>

          {/* Recent Flights List */}
          <div className="border-t border-glass pt-6 space-y-4">
            {flightRecords.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-left">Recent Flights</h4>
                <div className="grid gap-4">
                  {flightRecords.map(f => (
                    <div key={f.id} className="relative flex flex-col md:flex-row bg-glass border border-glass rounded-2xl overflow-hidden hover:bg-surface-container/30 transition-all duration-300">
                      {/* Left Side: Boarding Pass Main Body */}
                      <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Departure</span>
                            <span className="text-2xl font-black text-primary mt-1">{f.source_airport}</span>
                            <span className="text-xs text-on-surface-variant leading-none">{AIRPORTS.find(a => a.code === f.source_airport)?.city}</span>
                          </div>
                          
                          {/* Center flight line */}
                          <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-[120px]">
                            <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wider">
                              {f.trip_type === "one_way" ? "1-Way" : "Round"}
                            </span>
                            <div className="flex items-center gap-1.5 w-full my-1">
                              <div className="h-px flex-1 bg-glass relative" />
                              <Plane className="h-4 w-4 text-primary rotate-90 md:rotate-0" />
                              <div className="h-px flex-1 bg-glass relative" />
                            </div>
                            <span className="text-[9px] text-on-surface-variant font-medium">
                              {new Date(f.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">Arrival</span>
                            <span className="text-2xl font-black text-primary mt-1">{f.destination_airport}</span>
                            <span className="text-xs text-on-surface-variant leading-none">{AIRPORTS.find(a => a.code === f.destination_airport)?.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dashed perforated line separator */}
                      <div className="hidden md:flex flex-col items-center justify-between relative py-2">
                        <div className="w-4 h-4 rounded-full bg-background absolute -top-2 border-b border-glass" />
                        <div className="w-px h-full border-l border-dashed border-glass" />
                        <div className="w-4 h-4 rounded-full bg-background absolute -bottom-2 border-t border-glass" />
                      </div>

                      <div className="flex md:hidden items-center justify-between relative px-2">
                        <div className="w-4 h-4 rounded-full bg-background absolute -left-2 border-r border-glass" />
                        <div className="h-px w-full border-t border-dashed border-glass" />
                        <div className="w-4 h-4 rounded-full bg-background absolute -right-2 border-l border-glass" />
                      </div>

                      {/* Right Side: Ticket Stub (Summary & Delete) */}
                      <div className="w-full md:w-56 bg-surface-container/20 p-6 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center md:space-y-3 border-t md:border-t-0 md:border-l border-glass">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">Est. Emissions</span>
                          <span className="text-lg font-black text-secondary">{Math.round(f.carbon_emissions_kg)} kg CO₂e</span>
                          <span className="text-xs text-on-surface-variant block font-medium">
                            {trackingUnit === "miles" 
                              ? `${(f.distance_km / 1.60934).toFixed(0)} miles`
                              : `${Math.round(f.distance_km)} km`
                            }
                          </span>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => removeFlight(f.id)} 
                          className="text-error/70 hover:text-error transition-all p-2 rounded-xl hover:bg-error/10 border border-transparent hover:border-error/20 flex items-center gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-xs font-semibold md:hidden">Delete Flight</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-on-surface-variant italic py-4 text-center bg-glass border border-dashed border-glass rounded-2xl">
                No flights recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
