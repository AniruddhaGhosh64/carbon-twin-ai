"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import { Cookie, Plus, Trash2, Sparkles, Loader2, Check, AlertTriangle, ArrowRight } from "lucide-react";

export interface FoodItem {
  id: string;
  name: string;
  portion_g: number;
  category: "beef" | "poultry" | "fish" | "dairy" | "plant_protein" | "vegetables" | "grains" | "other";
}

export type MealType = "breakfast" | "lunch" | "dinner" | "custom_meals" | "snacks";

export interface MealRecord {
  id: string;
  meal_type: MealType;
  items: FoodItem[];
}

interface FoodTrackingModuleProps {
  meals: MealRecord[];
  setMeals: React.Dispatch<React.SetStateAction<MealRecord[]>>;
}

const CATEGORIES = [
  { id: "beef" as const, label: "Beef", factor: 0.060, protein: 0.26 },
  { id: "poultry" as const, label: "Poultry / Chicken", factor: 0.006, protein: 0.27 },
  { id: "fish" as const, label: "Fish / Seafood", factor: 0.005, protein: 0.22 },
  { id: "dairy" as const, label: "Dairy & Eggs", factor: 0.021, protein: 0.13 },
  { id: "plant_protein" as const, label: "Plant Protein (Beans/Tofu)", factor: 0.002, protein: 0.08 },
  { id: "vegetables" as const, label: "Vegetables & Fruits", factor: 0.001, protein: 0.02 },
  { id: "grains" as const, label: "Grains & Breads", factor: 0.0015, protein: 0.07 },
  { id: "other" as const, label: "Other / Misc", factor: 0.003, protein: 0.03 },
];

export default function FoodTrackingModule({ meals, setMeals }: FoodTrackingModuleProps) {
  const [activeMealType, setActiveMealType] = useState<MealType>("breakfast");

  // Gemini Extraction Form
  const [promptText, setPromptText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [extractedDraftItems, setExtractedDraftItems] = useState<(FoodItem & { checked: boolean; confidence?: number })[]>([]);

  // Manual Food Item Entry Form
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState<FoodItem["category"]>("grains");
  const [manualPortion, setManualPortion] = useState(100);

  // Live Summary Calculations
  const activeMealRecords = meals.find((m) => m.meal_type === activeMealType)?.items || [];

  const totalDailyMass = meals.reduce((sum, meal) => {
    return sum + meal.items.reduce((mSum, item) => mSum + item.portion_g, 0);
  }, 0);

  const totalDailyProtein = meals.reduce((sum, meal) => {
    return sum + meal.items.reduce((pSum, item) => {
      const catInfo = CATEGORIES.find((c) => c.id === item.category);
      const proteinFactor = catInfo ? catInfo.protein : 0.03;
      return pSum + item.portion_g * proteinFactor;
    }, 0);
  }, 0);

  const totalDailyCO2 = meals.reduce((sum, meal) => {
    return sum + meal.items.reduce((cSum, item) => {
      const catInfo = CATEGORIES.find((c) => c.id === item.category);
      const factor = catInfo ? catInfo.factor : 0.003;
      return cSum + item.portion_g * factor;
    }, 0);
  }, 0);

  // Get Diet Rating badge based on total CO2 (kg/day)
  // Low: <= 2.5 kg, Moderate: <= 5.5 kg, High: > 5.5 kg
  const getDietRating = (co2: number) => {
    if (co2 === 0) return { label: "No meals logged", color: "text-on-surface-variant bg-surface-container" };
    if (co2 <= 2.5) return { label: "Low Carbon (Eco Friendly)", color: "text-primary bg-primary/10 border-primary/20" };
    if (co2 <= 5.5) return { label: "Moderate Carbon", color: "text-secondary bg-secondary/10 border-secondary/20" };
    return { label: "High Carbon Impact", color: "text-error bg-error/10 border-error/20" };
  };

  const dietRating = getDietRating(totalDailyCO2);

  const handleAddManualItem = () => {
    if (!manualName.trim()) return;
    const newItem: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: manualName.trim(),
      portion_g: manualPortion,
      category: manualCategory,
    };

    setMeals((prev: MealRecord[]) =>
      prev.map((meal) =>
        meal.meal_type === activeMealType
          ? { ...meal, items: [...meal.items, newItem] }
          : meal
      )
    );

    setManualName("");
    setManualPortion(100);
  };

  const handleRemoveItem = (mealType: MealType, itemId: string) => {
    setMeals((prev: MealRecord[]) =>
      prev.map((meal) =>
        meal.meal_type === mealType
          ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) }
          : meal
      )
    );
  };

  // Gemini extraction handler
  const handleAnalyzeMeal = async () => {
    if (!promptText.trim()) return;
    setIsExtracting(true);

    try {
      const response = await fetch(getApiUrl("/api/v1/footprint/food/extract"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "default_user",
        },
        body: JSON.stringify({ text: promptText }),
      });

      if (!response.ok) throw new Error("API extraction failed");

      const result = await response.json();
      if (result.success && result.data && result.data.items) {
        const parsedItems = result.data.items.map((item: { name: string; category: FoodItem["category"]; confidence?: number }) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: item.name,
          portion_g: 100, // Portions default to 100g and are NOT estimated by Gemini
          category: item.category as FoodItem["category"],
          checked: true,
          confidence: item.confidence,
        }));
        setExtractedDraftItems(parsedItems);
        setShowConfirmModal(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to analyze meal. Please check your network or try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmExtraction = () => {
    const approvedItems: FoodItem[] = extractedDraftItems
      .filter((item) => item.checked)
      .map((item) => ({
        id: item.id,
        name: item.name,
        portion_g: item.portion_g,
        category: item.category,
      }));

    if (approvedItems.length > 0) {
      setMeals((prev: MealRecord[]) =>
        prev.map((meal) =>
          meal.meal_type === activeMealType
            ? { ...meal, items: [...meal.items, ...approvedItems] }
            : meal
        )
      );
    }

    setShowConfirmModal(false);
    setPromptText("");
    setExtractedDraftItems([]);
  };

  const handleDraftItemChange = (id: string, field: string, value: string | number | boolean) => {
    setExtractedDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const mealTabs: { id: MealType; label: string }[] = [
    { id: "breakfast", label: "Breakfast" },
    { id: "lunch", label: "Lunch" },
    { id: "dinner", label: "Dinner" },
    { id: "snacks", label: "Snacks" },
    { id: "custom_meals", label: "Custom Meals" },
  ];

  return (
    <div className="space-y-10 relative">
      <Card className="border border-glass">
        <CardHeader className="flex flex-row items-center gap-4 p-8 md:p-10 pb-8 border-b border-glass">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Cookie className="h-6 w-6" />
          </div>
          <div className="text-left">
            <CardTitle className="text-lg font-bold">Food Tracking Redesign</CardTitle>
            <CardDescription className="text-xs">Log daily meals and calculate dietary carbon footprint with AI assistance.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-8 space-y-8">
          {/* AI Text Extractor Prompt Card */}
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-4 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              <span className="text-xs font-black text-primary uppercase tracking-wider">Gemini Text Assistant</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Type what you ate (e.g. &ldquo;I had two scrambled eggs with spinach and a bowl of oatmeal&rdquo;) to automatically parse and categorize foods.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe your meal..."
                className="flex-1 bg-surface border border-glass rounded-xl p-3 text-xs text-on-surface outline-none focus:border-primary placeholder-on-surface-variant/50 font-medium"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnalyzeMeal();
                }}
              />
              <button
                type="button"
                onClick={handleAnalyzeMeal}
                disabled={isExtracting || !promptText.trim()}
                className="flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs disabled:opacity-50 shrink-0"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Meal
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Meals Tab Navigator */}
          <div className="flex border-b border-glass pb-4 overflow-x-auto gap-2">
            <div className="flex bg-surface-container/60 p-0.5 rounded-lg border border-glass w-fit shrink-0">
              {mealTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveMealType(tab.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                    activeMealType === tab.id
                      ? "bg-primary text-on-primary shadow-glow font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Entry Form and Meal Items */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            {/* Manual Entry Column */}
            <div className="lg:col-span-1 bg-surface-container/20 border border-glass p-6 rounded-2xl space-y-4">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Add Food Manually
              </span>
              <div className="space-y-4.5">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Food Item Name</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Scrambled Eggs"
                    className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-[10px] font-semibold text-on-surface-variant uppercase">Category</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as FoodItem["category"])}
                    className="bg-surface border border-glass rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold text-on-surface-variant uppercase">Portion Size</span>
                    <span className="text-primary font-bold">{manualPortion} g</span>
                  </div>
                  <Slider
                    min={10}
                    max={1000}
                    step={10}
                    value={manualPortion}
                    onValueChange={(val) => setManualPortion(val)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddManualItem}
                  disabled={!manualName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl font-bold hover:bg-primary/95 transition-all text-xs disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Food Item
                </button>
              </div>
            </div>

            {/* Logged Items Column */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
                Logged under {mealTabs.find((t) => t.id === activeMealType)?.label}
              </span>

              {activeMealRecords.length > 0 ? (
                <div className="grid gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {activeMealRecords.map((item) => {
                    const catInfo = CATEGORIES.find((c) => c.id === item.category);
                    const itemCO2 = item.portion_g * (catInfo ? catInfo.factor : 0.003);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-glass border border-glass rounded-xl p-4 hover:bg-surface-container/30 transition-all"
                      >
                        <div>
                          <span className="text-xs font-bold text-on-surface block">{item.name}</span>
                          <span className="text-[10px] text-on-surface-variant block mt-0.5 capitalize">
                            Category: {catInfo?.label} | Portion: {item.portion_g} g
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-on-surface-variant block uppercase font-medium">Footprint</span>
                            <span className="text-xs font-black text-secondary">{itemCO2.toFixed(1)} kg CO₂e</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(activeMealType, item.id)}
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
                <div className="text-center italic text-xs text-on-surface-variant py-10 bg-glass border border-dashed border-glass rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <Cookie className="h-8 w-8 text-on-surface-variant/40 animate-pulse" />
                  <span>No foods logged for this meal segment yet. Use the Gemini text assistant above to easily log your meal.</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog Overlay Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <Card className="border border-glass max-w-2xl w-full bg-glass-panel shadow-2xl overflow-hidden animate-scale-in">
            <CardHeader className="p-6 border-b border-glass text-left">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Confirm Extracted Foods</CardTitle>
                  <CardDescription className="text-xs">Verify AI-detected items and specify portion sizes.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 max-h-[400px] overflow-y-auto text-left">
              <div className="space-y-4">
                {extractedDraftItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface-container/30 border border-glass rounded-xl p-4 gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => handleDraftItemChange(item.id, "checked", e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-glass text-primary focus:ring-primary bg-surface outline-none"
                      />
                      <div>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleDraftItemChange(item.id, "name", e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-primary text-xs font-bold text-on-surface w-44 outline-none focus:outline-none"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={item.category}
                            onChange={(e) => handleDraftItemChange(item.id, "category", e.target.value)}
                            className="bg-transparent text-[10px] text-on-surface-variant outline-none border-none p-0 cursor-pointer font-semibold capitalize"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                          {item.confidence !== undefined && (
                            <span className="text-[9px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-full font-bold">
                              {Math.round(item.confidence * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.checked && (
                      <div className="w-full sm:w-48 space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-on-surface-variant font-medium">Portion Weight:</span>
                          <span className="text-primary font-bold">{item.portion_g} g</span>
                        </div>
                        <Slider
                          min={10}
                          max={500}
                          step={10}
                          value={item.portion_g}
                          onValueChange={(val) => handleDraftItemChange(item.id, "portion_g", val)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t border-glass bg-surface-container/20 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-glass hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtraction}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                Add Confirmed Items
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Live Food Summary Card */}
      <Card className="border border-glass bg-glass-panel backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <CardHeader className="flex flex-row items-center gap-3 p-8 md:p-10 pb-6 border-b border-glass">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Cookie className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="text-left">
            <CardTitle className="text-base font-bold">Food Footprint Summary</CardTitle>
            <CardDescription className="text-xs">Real-time daily food intake mass, protein, and emissions</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Total Food Mass
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {totalDailyMass} <span className="text-xs font-normal text-on-surface-variant">grams/day</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Total logged food weight
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Est. Protein Intake
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {totalDailyProtein.toFixed(0)} <span className="text-xs font-normal text-on-surface-variant">grams/day</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Aggregated protein content
              </div>
            </div>

            <div className="bg-surface-container/30 border border-glass rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left">
              <div>
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                  Daily Emissions
                </span>
                <span className="text-2xl font-black text-on-surface mt-2 block">
                  {totalDailyCO2.toFixed(1)} <span className="text-xs font-normal text-on-surface-variant">kg CO₂e</span>
                </span>
              </div>
              <div className="text-[10px] text-on-surface-variant font-medium">
                Food footprint for today
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left hover:border-primary/40 shadow-glow-sm">
              <div>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                  Annualized Diet Footprint
                </span>
                <span className="text-2xl font-black text-primary mt-2 block">
                  {((totalDailyCO2 * 365.0) / 1000.0).toFixed(2)} <span className="text-xs font-normal text-primary/70">Tons/yr</span>
                </span>
              </div>
              <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit leading-none mt-1", dietRating.color)}>
                {dietRating.label}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
