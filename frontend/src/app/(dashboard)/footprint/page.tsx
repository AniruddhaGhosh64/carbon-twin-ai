"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCarbon } from "@/context/CarbonContext";
import {
  Car, Home, Cookie, ShoppingBag, ArrowRight
} from "lucide-react";
import logger from "@/lib/logger";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { cn } from "@/lib/utils";
import HomeEnergyModule, { ApplianceItem, SolarSetupTier } from "@/components/footprint/HomeEnergyModule";
import FoodTrackingModule, { MealRecord } from "@/components/footprint/FoodTrackingModule";
import ShoppingTrackingModule, { LargePurchase } from "@/components/footprint/ShoppingTrackingModule";
import TransportationTrackingModule, { DailyLog, WeeklyLog, FlightRecord } from "@/components/footprint/TransportationTrackingModule";

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "active" | "locked";
}

function FootprintPage() {
  const router = useRouter();
  const { calculateFootprint, isLoading, error } = useCarbon();

  const [activeModule, setActiveModule] = useState("transportation");

  // Transportation State
  const [trackingUnit, setTrackingUnit] = useState<"km" | "miles">("km");
  const [vehicleType, setVehicleType] = useState<"gasoline" | "hybrid" | "ev">("gasoline");
  const [isWeeklyOverride, setIsWeeklyOverride] = useState(false);

  const initialDaily: DailyLog = { car: 0, public_transit: 0, bicycle: 0, walking: 0 };
  const [currentWeek, setCurrentWeek] = useState<WeeklyLog>({
    monday: { ...initialDaily }, tuesday: { ...initialDaily }, wednesday: { ...initialDaily },
    thursday: { ...initialDaily }, friday: { ...initialDaily }, saturday: { ...initialDaily }, sunday: { ...initialDaily }
  });

  const [weeklyOverride, setWeeklyOverride] = useState<DailyLog>({ ...initialDaily });

  const [flightRecords, setFlightRecords] = useState<FlightRecord[]>([]);

  // Home Energy State
  const [householdSize, setHouseholdSize] = useState(1);
  const [monthlyBillInr, setMonthlyBillInr] = useState(2500);
  const [solarTier, setSolarTier] = useState<SolarSetupTier>("none");
  const [appliances, setAppliances] = useState<ApplianceItem[]>([
    { id: "p1", name: "Air Conditioner (AC)", type: "preset", quantity: 0, daily_usage_hours: 0, power_watts: 1500 },
    { id: "p2", name: "Refrigerator", type: "preset", quantity: 1, daily_usage_hours: 24, power_watts: 300 },
    { id: "p3", name: "Washing Machine", type: "preset", quantity: 1, daily_usage_hours: 1, power_watts: 500 },
    { id: "p4", name: "Dishwasher", type: "preset", quantity: 0, daily_usage_hours: 0, power_watts: 1200 },
    { id: "p5", name: "EV Charger", type: "preset", quantity: 0, daily_usage_hours: 0, power_watts: 7000 },
    { id: "p6", name: "Heat Pump", type: "preset", quantity: 0, daily_usage_hours: 0, power_watts: 3000 },
    { id: "p7", name: "Water Heater (Geyser)", type: "preset", quantity: 1, daily_usage_hours: 1, power_watts: 2000 },
    { id: "p8", name: "Microwave Oven", type: "preset", quantity: 1, daily_usage_hours: 0.5, power_watts: 1200 },
  ]);

  // Food Habits State
  const [meals, setMeals] = useState<MealRecord[]>([
    { id: "m1", meal_type: "breakfast", items: [] },
    { id: "m2", meal_type: "lunch", items: [] },
    { id: "m3", meal_type: "dinner", items: [] },
    { id: "m4", meal_type: "snacks", items: [] },
    { id: "m5", meal_type: "custom_meals", items: [] },
  ]);

  // Shopping State
  const [clothing, setClothing] = useState({ shirts: 0, pants: 0, outerwear: 0, shoes: 0 });
  const [electronics, setElectronics] = useState({ phones: 0, laptops: 0, tvs: 0, accessories: 0 });
  const [foodDeliveries, setFoodDeliveries] = useState(0);
  const [packageDeliveries, setPackageDeliveries] = useState(0);
  const [largePurchases, setLargePurchases] = useState<LargePurchase[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("footprint_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeModule) setActiveModule(parsed.activeModule);
        if (parsed.trackingUnit) setTrackingUnit(parsed.trackingUnit);
        if (parsed.vehicleType) setVehicleType(parsed.vehicleType);
        if (parsed.isWeeklyOverride !== undefined) setIsWeeklyOverride(parsed.isWeeklyOverride);
        if (parsed.currentWeek) setCurrentWeek(parsed.currentWeek);
        if (parsed.weeklyOverride) setWeeklyOverride(parsed.weeklyOverride);
        if (parsed.flightRecords) setFlightRecords(parsed.flightRecords);
        if (parsed.householdSize !== undefined) setHouseholdSize(parsed.householdSize);
        if (parsed.monthlyBillInr !== undefined) setMonthlyBillInr(parsed.monthlyBillInr);
        if (parsed.solarTier) setSolarTier(parsed.solarTier);
        if (parsed.appliances) setAppliances(parsed.appliances);
        if (parsed.meals) setMeals(parsed.meals);
        if (parsed.clothing) setClothing(parsed.clothing);
        if (parsed.electronics) setElectronics(parsed.electronics);
        if (parsed.foodDeliveries !== undefined) setFoodDeliveries(parsed.foodDeliveries);
        if (parsed.packageDeliveries !== undefined) setPackageDeliveries(parsed.packageDeliveries);
        if (parsed.largePurchases) setLargePurchases(parsed.largePurchases);
      } catch (e) {
        logger.error("Failed to parse footprint draft", e);
      }
    }

    // Read tab from query parameters to support dashboard quick links
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ["transportation", "energy", "food", "shopping"].includes(tab)) {
        setActiveModule(tab);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const draft = {
      activeModule, trackingUnit, vehicleType, isWeeklyOverride, currentWeek, weeklyOverride, flightRecords,
      householdSize, monthlyBillInr, solarTier, appliances, meals, clothing, electronics, foodDeliveries, packageDeliveries, largePurchases
    };
    localStorage.setItem("footprint_draft", JSON.stringify(draft));
  }, [
    isLoaded, activeModule, trackingUnit, vehicleType, isWeeklyOverride, currentWeek, weeklyOverride, flightRecords,
    householdSize, monthlyBillInr, solarTier, appliances, meals, clothing, electronics, foodDeliveries, packageDeliveries, largePurchases
  ]);

  const handleCalculate = async () => {
    const payload = {
      transportation: {
        tracking_unit: trackingUnit,
        vehicle_type: vehicleType,
        current_week: currentWeek,
        weekly_override: {
          is_active: isWeeklyOverride,
          ...weeklyOverride
        },
        flight_records: flightRecords.map(f => ({
          date: f.date,
          source_airport: f.source_airport,
          destination_airport: f.destination_airport,
          trip_type: f.trip_type,
          distance_km: f.distance_km,
          carbon_emissions_kg: f.carbon_emissions_kg
        }))
      },
      home_energy: {
        household_size: householdSize,
        monthly_electricity_bill_inr: monthlyBillInr,
        solar_tier: solarTier,
        appliances: appliances.map(app => ({
          id: app.id,
          name: app.name,
          type: app.type,
          quantity: app.quantity,
          daily_usage_hours: app.daily_usage_hours,
          power_watts: app.power_watts
        }))
      },
      food_habits: {
        meals: meals.map(m => ({
          id: m.id,
          meal_type: m.meal_type,
          items: m.items.map(item => ({
            id: item.id,
            name: item.name,
            portion_g: item.portion_g,
            category: item.category
          }))
        }))
      },
      shopping: {
        clothing_items: clothing,
        electronics_items: electronics,
        food_deliveries_per_week: foodDeliveries,
        package_deliveries_per_week: packageDeliveries,
        large_purchases: largePurchases.map(p => ({
          id: p.id,
          item_name: p.item_name,
          cost_usd: p.cost_usd,
          purchase_date: p.purchase_date,
          category: p.category
        }))
      }
    };

    const success = await calculateFootprint(payload);
    if (success) {
      localStorage.removeItem("footprint_draft");
      router.push("/dashboard");
    }
  };

  const modules: ModuleItem[] = [
    { id: "transportation", name: "Transportation", description: "Commute & Travel", icon: Car, status: "active" },
    { id: "energy", name: "Home Energy", description: "Power & Heating", icon: Home, status: "active" },
    { id: "food", name: "Food Habits", description: "Diet & Consumption", icon: Cookie, status: "active" },
    { id: "shopping", name: "Shopping", description: "Goods & Services", icon: ShoppingBag, status: "active" },
  ];

  if (!isLoaded) return <div className="h-screen" />;

  return (
    <div className="space-y-stack-lg animate-fade-in max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col text-left mb-4">
        <h1 className="text-headline-lg font-bold text-on-surface">My Footprint</h1>
        <p className="text-body-sm text-on-surface-variant">Complete your assessment to baseline your carbon emissions.</p>
      </div>

      {/* Horizontal Nav Segmented Control */}
      <div className="bg-glass border border-glass p-1.5 rounded-2xl w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = mod.id === activeModule;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModule(mod.id)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4.5 rounded-xl text-left transition-all outline-none",
                  isActive
                    ? "bg-primary/10 border border-primary/20 text-primary shadow-glow font-semibold"
                    : "border border-transparent text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isActive ? "border-primary bg-primary/20 text-primary" : "border-glass text-on-surface-variant"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-tight">{mod.name}</span>
                  <span className="text-xs text-on-surface-variant leading-tight hidden sm:block mt-0.5">{mod.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-10">
        {activeModule === "transportation" && (
          <TransportationTrackingModule
            trackingUnit={trackingUnit}
            setTrackingUnit={setTrackingUnit}
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            isWeeklyOverride={isWeeklyOverride}
            setIsWeeklyOverride={setIsWeeklyOverride}
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            weeklyOverride={weeklyOverride}
            setWeeklyOverride={setWeeklyOverride}
            flightRecords={flightRecords}
            setFlightRecords={setFlightRecords}
          />
        )}

        {activeModule === "energy" && (
          <HomeEnergyModule
            householdSize={householdSize}
            setHouseholdSize={setHouseholdSize}
            monthlyBillInr={monthlyBillInr}
            setMonthlyBillInr={setMonthlyBillInr}
            solarTier={solarTier}
            setSolarTier={setSolarTier}
            appliances={appliances}
            setAppliances={setAppliances}
          />
        )}

        {activeModule === "food" && (
          <FoodTrackingModule
            meals={meals}
            setMeals={setMeals}
          />
        )}

        {activeModule === "shopping" && (
          <ShoppingTrackingModule
            clothing={clothing}
            setClothing={setClothing}
            electronics={electronics}
            setElectronics={setElectronics}
            foodDeliveries={foodDeliveries}
            setFoodDeliveries={setFoodDeliveries}
            packageDeliveries={packageDeliveries}
            setPackageDeliveries={setPackageDeliveries}
            largePurchases={largePurchases}
            setLargePurchases={setLargePurchases}
          />
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-glass border border-glass p-4 rounded-lg">
          <span className="text-body-sm text-on-surface-variant text-left">
            Draft is <span className="text-primary font-semibold">auto-saved</span> as you interact.
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-wait"
            >
              {isLoading ? "Calculating..." : "Calculate My Footprint"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </button>
            {error && <span className="text-error text-[11px] mt-1">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedFootprintPage() {
  return (
    <ErrorBoundary fallbackName="Footprint Assessment">
      <FootprintPage />
    </ErrorBoundary>
  );
}
