"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ShoppingBag, Plus, Trash2, Package, Truck } from "lucide-react";

export interface LargePurchase {
  id: string;
  item_name: string;
  cost_usd: number;
  purchase_date: string;
  category: "furniture" | "appliances" | "ev_vehicle" | "gas_vehicle" | "other";
}

interface ShoppingData {
  clothing_items_per_month: {
    shirts: number;
    pants: number;
    outerwear: number;
    shoes: number;
  };
  electronics_items_per_year: {
    phones: number;
    laptops: number;
    tvs: number;
    accessories: number;
  };
  food_deliveries_per_week: number;
  package_deliveries_per_week: number;
  large_purchases: LargePurchase[];
}

interface ShoppingTrackingModuleProps {
  clothing: ShoppingData["clothing_items_per_month"];
  setClothing: React.Dispatch<React.SetStateAction<ShoppingData["clothing_items_per_month"]>>;
  electronics: ShoppingData["electronics_items_per_year"];
  setElectronics: React.Dispatch<React.SetStateAction<ShoppingData["electronics_items_per_year"]>>;
  foodDeliveries: number;
  setFoodDeliveries: (val: number) => void;
  packageDeliveries: number;
  setPackageDeliveries: (val: number) => void;
  largePurchases: LargePurchase[];
  setLargePurchases: React.Dispatch<React.SetStateAction<LargePurchase[]>>;
}

const CLOTHING_FACTORS = { shirts: 8, pants: 15, outerwear: 30, shoes: 20 };
const ELECTRONICS_FACTORS = { phones: 60, laptops: 250, tvs: 350, accessories: 10 };
const LARGE_FACTORS = {
  furniture: 300,
  appliances: 500,
  ev_vehicle: 6000,
  gas_vehicle: 12000,
  other: 150,
};

export default function ShoppingTrackingModule({
  clothing,
  setClothing,
  electronics,
  setElectronics,
  foodDeliveries,
  setFoodDeliveries,
  packageDeliveries,
  setPackageDeliveries,
  largePurchases,
  setLargePurchases,
}: ShoppingTrackingModuleProps) {
  const [activeCategory, setActiveCategory] = useState<"clothing" | "electronics" | "deliveries" | "large">("clothing");

  // Large Purchase entry form
  const [largeName, setLargeName] = useState("");
  const [largeCost, setLargeCost] = useState(0);
  const [largeCategory, setLargeCategory] = useState<LargePurchase["category"]>("appliances");
  const [largeDate, setLargeDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Calculations for Live Summary
  const clothingEmissions = (
    clothing.shirts * CLOTHING_FACTORS.shirts +
    clothing.pants * CLOTHING_FACTORS.pants +
    clothing.outerwear * CLOTHING_FACTORS.outerwear +
    clothing.shoes * CLOTHING_FACTORS.shoes
  ) * 12.0;

  const electronicsEmissions = (
    electronics.phones * ELECTRONICS_FACTORS.phones +
    electronics.laptops * ELECTRONICS_FACTORS.laptops +
    electronics.tvs * ELECTRONICS_FACTORS.tvs +
    electronics.accessories * ELECTRONICS_FACTORS.accessories
  );

  const deliveryEmissions = (
    foodDeliveries * 1.5 + 
    packageDeliveries * 2.2
  ) * 52.0;

  const largeEmissions = largePurchases.reduce((sum, item) => {
    const base = LARGE_FACTORS[item.category] || 150;
    return sum + base + (item.cost_usd * 0.1);
  }, 0);

  const totalAnnualCO2 = clothingEmissions + electronicsEmissions + deliveryEmissions + largeEmissions;

  // Extrapolate spend to monthly for summary display
  const clothingSpend = (clothing.shirts * 30 + clothing.pants * 50 + clothing.outerwear * 100 + clothing.shoes * 80);
  const electronicsSpend = (electronics.phones * 800 + electronics.laptops * 1200 + electronics.tvs * 600 + electronics.accessories * 50) / 12.0;
  const deliveriesSpend = (foodDeliveries * 20 + packageDeliveries * 40) * 4.33;
  const largeSpend = largePurchases.reduce((sum, p) => sum + p.cost_usd, 0) / 12.0;
  const totalMonthlySpend = clothingSpend + electronicsSpend + deliveriesSpend + largeSpend;

  const handleUpdateClothing = (field: keyof typeof CLOTHING_FACTORS, value: number) => {
    setClothing((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateElectronics = (field: keyof typeof ELECTRONICS_FACTORS, value: number) => {
    setElectronics((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddLargePurchase = () => {
    if (!largeName.trim() || largeCost <= 0) return;
    const newItem: LargePurchase = {
      id: Math.random().toString(36).substr(2, 9),
      item_name: largeName.trim(),
      cost_usd: largeCost,
      purchase_date: largeDate,
      category: largeCategory,
    };
    setLargePurchases((prev) => [...prev, newItem]);
    setLargeName("");
    setLargeCost(0);
    setLargeDate(new Date().toISOString().split("T")[0]);
  };

  const handleRemoveLargePurchase = (id: string) => {
    setLargePurchases((prev) => prev.filter((p) => p.id !== id));
  };

  const menuTabs = [
    { id: "clothing" as const, label: "Clothing" },
    { id: "electronics" as const, label: "Electronics" },
    { id: "deliveries" as const, label: "Logistics & Deliveries" },
    { id: "large" as const, label: "Large Purchases" },
  ];

  return (
    <div className="space-y-10">
      <Card className="border border-glass">
        <CardHeader className="flex flex-row items-center gap-4 p-8 md:p-10 pb-8 border-b border-glass">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="text-left">
            <CardTitle className="text-lg font-bold">Shopping & Consumption</CardTitle>
            <CardDescription className="text-xs">Configure category-based discretionary spending and product purchases.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-8 space-y-8">
          {/* Sub Navigation tabs */}
          <div className="flex border-b border-glass pb-4 overflow-x-auto gap-2">
            <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass w-fit shrink-0">
              {menuTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                    activeCategory === tab.id
                      ? "bg-primary text-on-primary shadow-glow font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab 1: Clothing */}
          {activeCategory === "clothing" && (
            <div className="space-y-6 animate-fade-in text-left">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Estimated clothing items bought per month
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(Object.keys(CLOTHING_FACTORS) as Array<keyof typeof CLOTHING_FACTORS>).map((key) => {
                  const val = clothing[key];
                  return (
                    <div
                      key={key}
                      className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <span className="text-xs font-bold text-on-surface capitalize block">{key}</span>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">
                          Factor: {CLOTHING_FACTORS[key]} kg CO₂e / item
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-surface border border-glass rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateClothing(key, Math.max(0, val - 1))}
                          className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{val}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateClothing(key, val + 1)}
                          className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Electronics */}
          {activeCategory === "electronics" && (
            <div className="space-y-6 animate-fade-in text-left">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Estimated electronics devices bought per year
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(Object.keys(ELECTRONICS_FACTORS) as Array<keyof typeof ELECTRONICS_FACTORS>).map((key) => {
                  const val = electronics[key];
                  return (
                    <div
                      key={key}
                      className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <span className="text-xs font-bold text-on-surface capitalize block">{key}</span>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">
                          Factor: {ELECTRONICS_FACTORS[key]} kg CO₂e / item
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-surface border border-glass rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateElectronics(key, Math.max(0, val - 1))}
                          className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{val}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateElectronics(key, val + 1)}
                          className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Deliveries */}
          {activeCategory === "deliveries" && (
            <div className="space-y-6 animate-fade-in text-left">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Takeout & Parcel deliveries per week
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Food Deliveries */}
                <div className="bg-surface-container/30 border border-glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-on-surface block">Food Delivery Orders</span>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">
                        Takeout packaging + transit (1.5 kg CO₂e / order)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-surface border border-glass rounded-lg p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setFoodDeliveries(Math.max(0, foodDeliveries - 1))}
                      className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{foodDeliveries}</span>
                    <button
                      type="button"
                      onClick={() => setFoodDeliveries(foodDeliveries + 1)}
                      className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Package Deliveries */}
                <div className="bg-surface-container/30 border border-glass rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-on-surface block">E-commerce Parcel Shipments</span>
                      <span className="text-[10px] text-on-surface-variant block mt-0.5">
                        Box logistics & delivery courier (2.2 kg CO₂e / package)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-surface border border-glass rounded-lg p-0.5 w-fit">
                    <button
                      type="button"
                      onClick={() => setPackageDeliveries(Math.max(0, packageDeliveries - 1))}
                      className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                      aria-label="Decrease package deliveries quantity"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{packageDeliveries}</span>
                    <button
                      type="button"
                      onClick={() => setPackageDeliveries(packageDeliveries + 1)}
                      className="h-8 w-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded"
                      aria-label="Increase package deliveries quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Large Purchases */}
          {activeCategory === "large" && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Add form */}
              <div className="bg-surface-container/20 border border-glass p-6 rounded-2xl space-y-5">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Record Major Asset Purchase
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="largeName" className="text-[10px] font-semibold text-on-surface-variant uppercase">Asset Item Name</label>
                    <input
                      id="largeName"
                      type="text"
                      value={largeName}
                      onChange={(e) => setLargeName(e.target.value)}
                      placeholder="e.g. Leather Sofa"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="largeCategory" className="text-[10px] font-semibold text-on-surface-variant uppercase">Asset Category</label>
                    <select
                      id="largeCategory"
                      value={largeCategory}
                      onChange={(e) => setLargeCategory(e.target.value as LargePurchase["category"])}
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-medium"
                    >
                      <option value="furniture">Furniture</option>
                      <option value="appliances">Appliance (AC/Fridge)</option>
                      <option value="ev_vehicle">Electric Vehicle (EV)</option>
                      <option value="gas_vehicle">Gasoline/Diesel Vehicle</option>
                      <option value="other">Other / Misc</option>
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="largeCost" className="text-[10px] font-semibold text-on-surface-variant uppercase">Cost (USD)</label>
                    <input
                      id="largeCost"
                      type="number"
                      min="1"
                      value={largeCost || ""}
                      onChange={(e) => setLargeCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="500"
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="largeDate" className="text-[10px] font-semibold text-on-surface-variant uppercase">Purchase Date</label>
                    <input
                      id="largeDate"
                      type="date"
                      value={largeDate}
                      onChange={(e) => setLargeDate(e.target.value)}
                      className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddLargePurchase}
                  disabled={!largeName.trim() || largeCost <= 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs disabled:opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  <Plus className="h-4 w-4" />
                  Add Large Purchase
                </button>
              </div>

              {/* Logged List */}
              <div className="space-y-4">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Logged Major Purchases
                </span>
                {largePurchases.length > 0 ? (
                  <div className="grid gap-3">
                    {largePurchases.map((purchase) => {
                      const base = LARGE_FACTORS[purchase.category] || 150;
                      const calculatedItemCO2 = base + purchase.cost_usd * 0.1;
                      return (
                        <div
                          key={purchase.id}
                          className="flex items-center justify-between bg-glass border border-glass rounded-xl p-4 hover:bg-surface-container/30 transition-all"
                        >
                          <div>
                            <span className="text-xs font-bold text-on-surface block">{purchase.item_name}</span>
                            <span className="text-[10px] text-on-surface-variant block mt-0.5 capitalize">
                              Category: {purchase.category} | Cost: ${purchase.cost_usd} | Date: {purchase.purchase_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[10px] text-on-surface-variant block uppercase font-medium">Impact</span>
                              <span className="text-xs font-black text-secondary">{Math.round(calculatedItemCO2)} kg CO₂e</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveLargePurchase(purchase.id)}
                              className="text-error/70 hover:text-error p-1.5 hover:bg-error/10 border border-transparent hover:border-error/20 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center italic text-xs text-on-surface-variant py-4 bg-glass border border-dashed border-glass rounded-xl">
                    No major purchases recorded.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Shopping Summary Card */}
      <Card className="border border-glass bg-glass-panel backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="flex flex-row items-center gap-3 p-8 md:p-10 pb-6 border-b border-glass">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <ShoppingBag className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Shopping Emissions Summary</CardTitle>
            <CardDescription className="text-xs">Real-time estimations of retail goods, delivery logistics, and asset footprint</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Est. Monthly Spend
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  ${totalMonthlySpend.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">USD/mo</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Annualized average spend share
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Weekly Deliveries
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {foodDeliveries + packageDeliveries} <span className="text-xs font-normal text-on-surface-variant">deliveries/wk</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Food {foodDeliveries} + Parcels {packageDeliveries}
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Logistics Emissions
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {deliveryEmissions.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">kg CO₂e/yr</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Delivery transport carbon
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left hover:border-primary/40 shadow-glow-sm">
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                  Total Shopping Footprint
                </span>
                <span className="text-2xl font-black text-primary mt-2 block">
                  {(totalAnnualCO2 / 1000.0).toFixed(2)} <span className="text-xs font-normal text-primary/70">Tons/yr</span>
                </span>
              </div>
              <div className="text-[10px] text-primary/70 font-medium">
                Clothing {(clothingEmissions/1000.0).toFixed(1)}T + Electronics {(electronicsEmissions/1000.0).toFixed(1)}T + Major {(largeEmissions/1000.0).toFixed(1)}T
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
