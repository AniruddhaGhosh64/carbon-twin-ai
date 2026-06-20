"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import { Home, Users, Sun, Plus, Trash2, Shield, Zap, Sparkles } from "lucide-react";

export interface ApplianceItem {
  id: string;
  name: string;
  type: "preset" | "custom";
  quantity: number;
  daily_usage_hours: number;
  power_watts: number;
}

export type SolarSetupTier = "none" | "small" | "medium" | "large";

interface HomeEnergyModuleProps {
  householdSize: number;
  setHouseholdSize: (val: number) => void;
  monthlyBillInr: number;
  setMonthlyBillInr: (val: number) => void;
  solarTier: SolarSetupTier;
  setSolarTier: (val: SolarSetupTier) => void;
  appliances: ApplianceItem[];
  setAppliances: React.Dispatch<React.SetStateAction<ApplianceItem[]>>;
}

export default function HomeEnergyModule({
  householdSize,
  setHouseholdSize,
  monthlyBillInr,
  setMonthlyBillInr,
  solarTier,
  setSolarTier,
  appliances,
  setAppliances,
}: HomeEnergyModuleProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "preset" | "custom">("profile");

  // Local state for custom appliance form
  const [customName, setCustomName] = useState("");
  const [customPower, setCustomPower] = useState(100);
  const [customQty, setCustomQty] = useState(1);
  const [customHours, setCustomHours] = useState(2);

  // Calculations for Live Summary
  const billKwh = monthlyBillInr / 8.0;

  const applianceKwh = appliances.reduce((sum, app) => {
    return sum + (app.power_watts / 1000.0) * app.quantity * app.daily_usage_hours * 30.0;
  }, 0);

  const solarCapacities = {
    none: 0,
    small: 2,
    medium: 5,
    large: 10,
  };
  const solarCap = solarCapacities[solarTier];
  const solarGenKwh = solarCap * 4.0 * 30.0; // 4 peak hours per day

  const totalGrossKwh = billKwh + applianceKwh;
  const netKwh = Math.max(0, totalGrossKwh - solarGenKwh);
  const annualCO2 = netKwh * 12 * 0.4;
  const individualCO2 = annualCO2 / Math.max(1, householdSize);

  const handleUpdateAppliance = (id: string, field: "quantity" | "daily_usage_hours", value: number) => {
    setAppliances((prev) =>
      prev.map((app) => (app.id === id ? { ...app, [field]: value } : app))
    );
  };

  const handleAddCustomAppliance = () => {
    if (!customName.trim()) return;
    const newItem: ApplianceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: customName.trim(),
      type: "custom",
      quantity: customQty,
      daily_usage_hours: customHours,
      power_watts: customPower,
    };
    setAppliances((prev) => [...prev, newItem]);
    setCustomName("");
    setCustomPower(100);
    setCustomQty(1);
    setCustomHours(2);
  };

  const handleRemoveAppliance = (id: string) => {
    setAppliances((prev) => prev.filter((app) => app.id !== id));
  };

  const solarTiersData = [
    { id: "none" as const, label: "No Solar", desc: "Standard grid reliance" },
    { id: "small" as const, label: "Small Setup", desc: "1-2 BHK apartments (~2 kW)" },
    { id: "medium" as const, label: "Medium Setup", desc: "3-4 BHK family homes (~5 kW)" },
    { id: "large" as const, label: "Large Setup", desc: "Bungalows & Villas (~10 kW)" },
  ];

  return (
    <div className="space-y-10">
      <Card className="border border-glass">
        <CardHeader className="flex flex-row items-center gap-4 p-8 md:p-10 pb-8 border-b border-glass">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Home className="h-6 w-6" />
          </div>
          <div className="text-left">
            <CardTitle className="text-lg font-bold">Home Energy Profile</CardTitle>
            <CardDescription className="text-xs">Estimate your home carbon footprint based on bills and appliance inventory.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-8 space-y-8">
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-glass pb-4">
            <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-md transition-all",
                  activeTab === "profile"
                    ? "bg-primary text-on-primary shadow-glow font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                1. Home Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-md transition-all",
                  activeTab === "preset"
                    ? "bg-primary text-on-primary shadow-glow font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                2. Preset Appliances
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-md transition-all",
                  activeTab === "custom"
                    ? "bg-primary text-on-primary shadow-glow font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                3. Custom Inventory
              </button>
            </div>
          </div>

          {/* Tab Content 1: Home Profile */}
          {activeTab === "profile" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Household Size */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    <span className="text-sm font-semibold text-on-surface">Household Size</span>
                  </div>
                  <span className="text-sm font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                    {householdSize} {householdSize === 1 ? "Member" : "Members"}
                  </span>
                </div>
                <div className="pt-2">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={householdSize}
                    onValueChange={(val) => setHouseholdSize(val)}
                  />
                </div>
              </div>

              {/* Monthly Electricity Bill in INR */}
              <div className="space-y-4 border-t border-glass pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-4.5 w-4.5 text-primary" />
                    <span className="text-sm font-semibold text-on-surface">Monthly Electricity Bill (INR)</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-on-surface-variant font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={monthlyBillInr || ""}
                      onChange={(e) => setMonthlyBillInr(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="pl-7 pr-3 py-1.5 w-32 text-right bg-surface border border-glass rounded-xl text-sm font-bold text-on-surface focus:border-primary outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Slider
                    min={0}
                    max={25000}
                    step={100}
                    value={monthlyBillInr}
                    onValueChange={(val) => setMonthlyBillInr(val)}
                  />
                  <div className="flex justify-between text-[10px] text-on-surface-variant mt-1.5">
                    <span>₹0</span>
                    <span>₹12,500</span>
                    <span>₹25,000+</span>
                  </div>
                </div>
              </div>

              {/* Simplified Solar Setup */}
              <div className="space-y-4 border-t border-glass pt-6">
                <div className="flex items-center gap-2.5">
                  <Sun className="h-4.5 w-4.5 text-primary" />
                  <span className="text-sm font-semibold text-on-surface">Solar Setup Size</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {solarTiersData.map((tier) => {
                    const isActive = solarTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSolarTier(tier.id)}
                        className={cn(
                          "flex flex-col p-4 rounded-xl border text-left transition-all",
                          isActive
                            ? "bg-primary/10 border-primary shadow-glow-sm"
                            : "border-glass hover:bg-surface-container/50 text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        <span className={cn("text-xs font-black", isActive ? "text-primary" : "text-on-surface")}>
                          {tier.label}
                        </span>
                        <span className="text-[10px] text-on-surface-variant mt-1 leading-normal">
                          {tier.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Preset Appliances */}
          {activeTab === "preset" && (
            <div className="space-y-6 animate-fade-in text-left">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Manage Appliance Inventory Quantity & Hours
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {appliances
                  .filter((app) => app.type === "preset")
                  .map((app) => (
                    <div
                      key={app.id}
                      className="bg-surface-container/30 border border-glass rounded-2xl p-5 space-y-4 transition-all hover:border-primary/20"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-on-surface block">{app.name}</span>
                          <span className="text-[10px] text-on-surface-variant block mt-0.5">
                            Power rating: {app.power_watts} W
                          </span>
                        </div>
                        {/* Quantity Counter */}
                        <div className="flex items-center gap-3 bg-surface border border-glass rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateAppliance(app.id, "quantity", Math.max(0, app.quantity - 1))}
                            className="h-7 w-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-6 text-center">{app.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateAppliance(app.id, "quantity", app.quantity + 1)}
                            className="h-7 w-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {app.quantity > 0 && (
                        <div className="space-y-2.5 border-t border-glass/40 pt-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-on-surface-variant font-medium">Daily Usage Hours:</span>
                            <span className="text-primary font-bold">{app.daily_usage_hours} hrs/day</span>
                          </div>
                          <Slider
                            min={0}
                            max={24}
                            step={0.5}
                            value={app.daily_usage_hours}
                            onValueChange={(val) => handleUpdateAppliance(app.id, "daily_usage_hours", val)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Tab Content 3: Custom Inventory */}
          {activeTab === "custom" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Form to add custom appliance */}
              <div className="bg-surface-container/20 border border-glass p-6 rounded-2xl space-y-5">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Add Custom Appliance
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Appliance Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Electric Kettle"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Power (Watts)</label>
                    <input
                      type="number"
                      min="1"
                      value={customPower || ""}
                      onChange={(e) => setCustomPower(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="100"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={customQty || ""}
                      onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="1"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Usage (Hrs/Day)</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={customHours || ""}
                      onChange={(e) => setCustomHours(Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)))}
                      placeholder="2"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomAppliance}
                  disabled={!customName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Custom Appliance
                </button>
              </div>

              {/* Custom Appliances List */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Logged Custom Inventory
                </span>
                {appliances.filter((app) => app.type === "custom").length > 0 ? (
                  <div className="grid gap-3">
                    {appliances
                      .filter((app) => app.type === "custom")
                      .map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between bg-glass border border-glass rounded-xl p-4 hover:bg-surface-container/30 transition-all"
                        >
                          <div>
                            <span className="text-xs font-bold text-on-surface block">{app.name}</span>
                            <span className="text-[10px] text-on-surface-variant block mt-0.5">
                              {app.power_watts}W | Qty: {app.quantity} | {app.daily_usage_hours} hrs/day
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAppliance(app.id)}
                            className="text-error/70 hover:text-error p-1.5 hover:bg-error/10 border border-transparent hover:border-error/20 rounded-lg transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center italic text-xs text-on-surface-variant py-4 bg-glass border border-dashed border-glass rounded-xl">
                    No custom appliances added yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Energy Summary Card */}
      <Card className="border border-glass bg-glass-panel backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="flex flex-row items-center gap-3 p-8 md:p-10 pb-6 border-b border-glass">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Zap className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Energy Estimation Summary</CardTitle>
            <CardDescription className="text-xs">Real-time monthly home energy consumption and offsets</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Gross Consumption
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {totalGrossKwh.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">kWh/mo</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Bill {billKwh.toFixed(0)} + Appliances {applianceKwh.toFixed(0)} kWh
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Solar Generated
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {solarGenKwh.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">kWh/mo</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Tier: {solarTier} ({solarCap} kW capacity)
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Net Grid Draw
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {netKwh.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">kWh/mo</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Used from electrical grid
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left hover:border-primary/40 shadow-glow-sm">
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                  Individual Energy Footprint
                </span>
                <span className="text-2xl font-black text-primary mt-2 block">
                  {(individualCO2 / 1000.0).toFixed(2)} <span className="text-xs font-normal text-primary/70">Tons/yr</span>
                </span>
              </div>
              <div className="text-[10px] text-primary/70 font-medium">
                Shared among {householdSize} {householdSize === 1 ? "member" : "members"} (Total { (annualCO2 / 1000.0).toFixed(2) } T)
              </div>
            </div>
          </div>

          {/* Simple breakdown bar visual */}
          {totalGrossKwh > 0 && (
            <div className="mt-8 space-y-2 text-left">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Household Power Profile (Gross)
              </span>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-surface-container">
                <div
                  style={{ width: `${(billKwh / totalGrossKwh) * 100}%` }}
                  className="bg-primary transition-all duration-300"
                  title={`Base Grid Load: ${((billKwh / totalGrossKwh) * 100).toFixed(0)}%`}
                />
                <div
                  style={{ width: `${(applianceKwh / totalGrossKwh) * 100}%` }}
                  className="bg-secondary transition-all duration-300"
                  title={`Appliances Inventory: ${((applianceKwh / totalGrossKwh) * 100).toFixed(0)}%`}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-on-surface-variant font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Base Bill ({((billKwh / totalGrossKwh) * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-secondary" />
                  <span>Appliances ({((applianceKwh / totalGrossKwh) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
