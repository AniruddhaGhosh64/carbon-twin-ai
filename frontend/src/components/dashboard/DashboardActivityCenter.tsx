"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Cookie, Plane, ShoppingBag, Zap } from "lucide-react";

interface FlightRecord {
  source_airport: string;
  destination_airport: string;
  trip_type: string;
  date: string;
  distance_km: number;
  carbon_emissions_kg: number;
}

interface FoodItem {
  id: string;
  name: string;
  portion_g: number;
  category: string;
  meal_type: string;
}

interface ApplianceItem {
  name: string;
  power_watts: number;
  quantity: number;
  daily_usage_hours: number;
}

interface LargePurchaseItem {
  id: string;
  item_name: string;
  purchase_date: string;
  category: string;
  cost_usd: number;
}

interface DashboardActivityCenterProps {
  recentFlights: FlightRecord[];
  recentFoodItems: FoodItem[];
  activeAppliances: ApplianceItem[];
  largePurchases: LargePurchaseItem[];
  clothingCount: number;
  electronicsCount: number;
  foodDeliveriesVal: number;
  packageDeliveriesVal: number;
}

export function DashboardActivityCenter({
  recentFlights,
  recentFoodItems,
  activeAppliances,
  largePurchases,
  clothingCount,
  electronicsCount,
  foodDeliveriesVal,
  packageDeliveriesVal,
}: DashboardActivityCenterProps) {
  return (
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
                    <span className="text-[10px] text-on-surface-variant block">
                      Distance: {Math.round(flight.distance_km)} km
                    </span>
                    <span className="text-xs font-black text-secondary">
                      {Math.round(flight.carbon_emissions_kg)} kg CO₂e
                    </span>
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
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Shipment Deliveries
              </span>
              <span className="text-lg font-black text-on-surface mt-1 block">
                {foodDeliveriesVal + packageDeliveriesVal} <span className="text-xs font-normal text-on-surface-variant">/week</span>
              </span>
              <span className="text-[9px] text-on-surface-variant block mt-0.5">
                Food: {foodDeliveriesVal} | Parcel: {packageDeliveriesVal}
              </span>
            </div>

            <div className="p-3.5 bg-surface-container/30 border border-glass/40 rounded-xl text-left">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Retail Items
              </span>
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
            <span className="text-xs font-semibold text-on-surface-variant block text-left">
              Recorded Major Purchases
            </span>
            {largePurchases.length > 0 ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {largePurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low border border-glass/20 text-xs"
                  >
                    <div className="text-left">
                      <span className="font-bold text-on-surface block">{purchase.item_name}</span>
                      <span className="text-[10px] text-on-surface-variant mt-0.5 block capitalize">
                        {purchase.purchase_date} | {purchase.category}
                      </span>
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
    </div>
  );
}
