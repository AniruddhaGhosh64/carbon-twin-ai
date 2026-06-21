"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Train, 
  Leaf, 
  Car, 
  Bike, 
  Home, 
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Plus,
  Award,
  Info,
  X,
  Sparkles,
  CheckSquare,
  Activity
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import api from "@/lib/api/client";
import logger from "@/lib/logger";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { EcoMission, MissionsResponse } from "@/types/carbon";

const sourceBadges: Record<string, { label: string, style: string }> = {
  dashboard: { label: "Dashboard", style: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  coach: { label: "Carbon Coach", style: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  twin: { label: "Carbon Twin", style: "bg-teal-500/10 text-teal-400 border border-teal-500/20" },
  simulator: { label: "Simulator", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  manual: { label: "Manual", style: "bg-gray-500/10 text-gray-400 border border-gray-500/20" },
};

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  use_metro: Train,
  transit: Train,
  carpool: Car,
  cycle_weekly: Bike,
  reduce_meat: Leaf,
  diet_shift: Leaf,
  reduce_electricity: Zap,
  optimize_energy: Zap,
  switch_renewables: Home,
  solar: Home,
  reduce_delivery: Activity
};

function EcoActionsPage() {
  const [missions, setMissions] = useState<{ suggested: EcoMission[], active: EcoMission[], completed: EcoMission[] }>({
    suggested: [],
    active: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [adoptingMission, setAdoptingMission] = useState<EcoMission | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Configuration Modal Form Fields
  const [frequency, setFrequency] = useState("3 days/week");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  // Custom Mission Form Fields
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCarbon, setCustomCarbon] = useState<number>(150);
  const [customMoney, setCustomMoney] = useState<number>(30);
  const [customEffort, setCustomEffort] = useState<"low" | "moderate" | "high" | "transformational">("moderate");

  const adoptModalRef = useRef<HTMLDivElement | null>(null);
  const customModalRef = useRef<HTMLDivElement | null>(null);
  const limitModalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Escape key handler to close active modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (adoptingMission) {
          setAdoptingMission(null);
        } else if (showCustomModal) {
          setShowCustomModal(false);
        } else if (showLimitModal) {
          setShowLimitModal(false);
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [adoptingMission, showCustomModal, showLimitModal]);

  // Focus trap / restoration effects
  useEffect(() => {
    if (adoptingMission) {
      const activeEl = document.activeElement as HTMLElement;
      lastFocusedElementRef.current = activeEl;
      const timer = setTimeout(() => {
        if (adoptModalRef.current) {
          const focusable = adoptModalRef.current.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
          }
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        lastFocusedElementRef.current?.focus();
      };
    }
  }, [adoptingMission]);

  useEffect(() => {
    if (showCustomModal) {
      const activeEl = document.activeElement as HTMLElement;
      lastFocusedElementRef.current = activeEl;
      const timer = setTimeout(() => {
        if (customModalRef.current) {
          const focusable = customModalRef.current.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
          }
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        lastFocusedElementRef.current?.focus();
      };
    }
  }, [showCustomModal]);

  useEffect(() => {
    if (showLimitModal) {
      const activeEl = document.activeElement as HTMLElement;
      lastFocusedElementRef.current = activeEl;
      const timer = setTimeout(() => {
        if (limitModalRef.current) {
          const focusable = limitModalRef.current.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
          }
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        lastFocusedElementRef.current?.focus();
      };
    }
  }, [showLimitModal]);

  const handleModalKeyDown = (ref: React.RefObject<HTMLDivElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && ref.current) {
      const focusable = ref.current.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  };

  const handleAdoptModalKeyDown = handleModalKeyDown(adoptModalRef);
  const handleCustomModalKeyDown = handleModalKeyDown(customModalRef);
  const handleLimitModalKeyDown = handleModalKeyDown(limitModalRef);

  const fetchMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<MissionsResponse>("/api/v1/eco-actions/missions");
      setMissions({
        suggested: data.suggested || [],
        active: data.active || [],
        completed: data.completed || []
      });
    } catch (err) {
      logger.error("Failed to load eco actions data", err);
      setError(err instanceof Error ? err.message : "Failed to load eco missions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const handleOpenAdopt = (mission: EcoMission) => {
    if (missions.active.length >= 10) {
      setShowLimitModal(true);
      return;
    }
    setAdoptingMission(mission);
    setFrequency("3 days/week");
    setStartDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    setEndDate(d.toISOString().split("T")[0]);
    setNotes("");
  };

  const handleAdoptSubmit = async () => {
    if (!adoptingMission) return;
    try {
      await api.post("/api/v1/eco-actions/commit", {
        action_id: adoptingMission.action_id,
        source: adoptingMission.source,
        config: {
          target_frequency: frequency,
          start_date: startDate,
          end_date: endDate,
          notes: notes || undefined
        }
      });

      setAdoptingMission(null);
      await fetchMissions();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to commit to action.";
      if (errMsg === "ACTIVE_LIMIT_EXCEEDED") {
        setShowLimitModal(true);
        setAdoptingMission(null);
        return;
      }
      alert(errMsg);
      logger.error("Commit to action failed", err);
    }
  };

  const handleCustomSubmit = async () => {
    if (missions.active.length >= 10) {
      setShowLimitModal(true);
      setShowCustomModal(false);
      return;
    }
    try {
      await api.post("/api/v1/eco-actions/custom", {
        title: customTitle,
        description: customDesc,
        carbon_reduction_kg: customCarbon,
        money_saved_usd: customMoney,
        effort_level: customEffort,
        config: {
          target_frequency: frequency,
          start_date: startDate,
          end_date: endDate,
          notes: notes || undefined
        }
      });

      setShowCustomModal(false);
      // Reset custom form
      setCustomTitle("");
      setCustomDesc("");
      setCustomCarbon(150);
      setCustomMoney(30);
      setCustomEffort("moderate");
      
      await fetchMissions();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create custom mission.";
      if (errMsg === "ACTIVE_LIMIT_EXCEEDED") {
        setShowLimitModal(true);
        setShowCustomModal(false);
        return;
      }
      alert(errMsg);
      logger.error("Failed to create custom mission", err);
    }
  };

  const handleCancelMission = async (missionId: string) => {
    if (!confirm("Are you sure you want to cancel this mission?")) return;
    try {
      await api.post(`/api/v1/eco-actions/cancel/${missionId}`);
      await fetchMissions();
    } catch (err) {
      logger.error("Cancel mission failed", err);
    }
  };

  const handleCompleteMission = async (missionId: string) => {
    try {
      await api.post(`/api/v1/eco-actions/complete/${missionId}`);
      await fetchMissions();
    } catch (err) {
      logger.error("Complete mission failed", err);
    }
  };

  const handleCheckIn = async (mission: EcoMission, verifiedAuto = false) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const checkInObj = {
        date: todayStr,
        status: "completed",
        verified_auto: verifiedAuto
      };

      await api.post(`/api/v1/eco-actions/check-in/${mission.id}`, checkInObj);
      await fetchMissions();
    } catch (err) {
      logger.error("Check in failed", err);
    }
  };

  const effortStyles = (level: string) => {
    switch (level) {
      case "low":
        return "border border-green-500/30 text-green-400 bg-green-500/5";
      case "moderate":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "high":
        return "border-2 border-emerald-500 text-emerald-300 bg-emerald-950/20";
      case "transformational":
        return "border border-primary bg-primary/10 text-primary shadow-glow animate-pulse";
      default:
        return "border border-glass text-on-surface-variant";
    }
  };

  // Header stats
  const activeCount = missions.active.length;
  const totalCommittedCO2 = missions.active.reduce((acc, m) => acc + m.carbon_reduction_kg, 0) + 
                            missions.completed.reduce((acc, m) => acc + m.carbon_reduction_kg, 0);
  const totalCommittedUSD = missions.active.reduce((acc, m) => acc + m.money_saved_usd, 0) + 
                            missions.completed.reduce((acc, m) => acc + m.money_saved_usd, 0);

  if (loading && missions.suggested.length === 0 && missions.active.length === 0) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center text-body-md text-on-surface-variant gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Synchronizing your Eco Mission Control Board...
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg animate-fade-in text-left">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300" role="alert">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm flex-1">{error}</p>
          <button
            onClick={() => { setError(null); fetchMissions(); }}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Eco Mission Control</h1>
          <p className="text-body-sm text-on-surface-variant">Adopt commitments, log manual progress, and verify real reduction targets.</p>
        </div>
        <button
          onClick={() => {
            if (missions.active.length >= 10) {
              setShowLimitModal(true);
            } else {
              setShowCustomModal(true);
            }
          }}
          className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2.5 rounded-lg text-body-sm font-semibold flex items-center gap-2 shadow-glow transition-all"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Custom Mission
        </button>
      </div>

      {/* Horizontal Stats Bar */}
      <div className="grid gap-gutter grid-cols-1 sm:grid-cols-3">
        <Card className="border border-glass bg-glass p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Total Offset Commitment</span>
              <p className="text-headline-sm font-bold text-on-surface">{Math.round(totalCommittedCO2)} kg CO2e</p>
            </div>
          </div>
        </Card>
        <Card className="border border-glass bg-glass p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Total Est. Annual Savings</span>
              <p className="text-headline-sm font-bold text-on-surface">${Math.round(totalCommittedUSD)} USD</p>
            </div>
          </div>
        </Card>
        <Card className="border border-glass bg-glass p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Active Commitments Limit</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-surface-container-highest rounded-full h-2 w-28 overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", activeCount >= 10 ? "bg-error" : "bg-primary")}
                    style={{ width: `${(activeCount / 10) * 100}%` }}
                  />
                </div>
                <span className="text-body-xs font-mono font-bold text-on-surface">{activeCount}/10</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid gap-gutter lg:grid-cols-3 items-start">
        
        {/* Column 1: Suggested Marketplace */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-glass pb-2 px-1">
            <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              Suggested Marketplace
            </h2>
            <span className="rounded-full bg-surface-container-highest text-on-surface px-2 py-0.5 text-body-xs font-bold font-mono">
              {missions.suggested.length}
            </span>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {missions.suggested.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-glass rounded-xl text-on-surface-variant">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-55" />
                <p className="text-body-xs font-semibold">No recommendations found.</p>
                <p className="text-[10px] opacity-75 px-4 mt-1">Fill out your footprint or run simulator scenarios to discover missions.</p>
              </div>
            ) : (
              missions.suggested.map((m) => {
                const IconComponent = actionIcons[m.action_id] || Leaf;
                const badge = sourceBadges[m.source] || sourceBadges.manual;

                return (
                  <Card key={m.id} className="border border-glass bg-glass p-4 space-y-3 hover:border-primary/20 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", badge.style)}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-secondary" />
                          {m.success_probability}% Success
                        </span>
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <div className="h-9 w-9 rounded-lg bg-surface-container-highest border border-glass flex items-center justify-center shrink-0 text-on-surface-variant">
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-body-sm font-bold text-on-surface leading-tight">{m.title}</h3>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">{m.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-glass/40 flex flex-col gap-2.5">
                      <div className="flex flex-wrap gap-2 items-center justify-between text-body-xs font-semibold">
                        <span className="text-primary font-bold">-{m.carbon_reduction_kg} kg/yr</span>
                        {m.money_saved_usd > 0 && <span className="text-secondary font-bold">+${m.money_saved_usd}/yr</span>}
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold capitalize", effortStyles(m.effort_level))}>
                          {m.effort_level}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenAdopt(m)}
                        className="w-full bg-primary/10 border border-primary/25 hover:bg-primary/20 text-primary py-2 rounded-md text-body-xs font-bold transition-all"
                        aria-label={`Adopt mission: ${m.title}`}
                      >
                        Adopt Mission
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Active Commitments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-glass pb-2 px-1">
            <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-secondary" />
              Active Commitments
            </h2>
            <span className={cn("rounded-full px-2 py-0.5 text-body-xs font-bold font-mono", activeCount >= 10 ? "bg-error/20 text-error-variant" : "bg-surface-container-highest text-on-surface")}>
              {activeCount}/10
            </span>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {missions.active.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-glass rounded-xl text-on-surface-variant">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-55" />
                <p className="text-body-xs font-semibold">No active missions.</p>
                <p className="text-[10px] opacity-75 px-4 mt-1">Adopt a suggested mission to start tracking your targets.</p>
              </div>
            ) : (
              missions.active.map((m) => {
                const IconComponent = actionIcons[m.action_id] || Leaf;
                const isAutoVerified = m.check_ins.some(ck => ck.verified_auto);

                return (
                  <Card key={m.id} className="border border-glass bg-glass p-4 space-y-3 border-l-4 border-l-secondary relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full capitalize", effortStyles(m.effort_level))}>
                          {m.effort_level}
                        </span>
                        
                        {isAutoVerified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Verified Auto
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <div className="h-9 w-9 rounded-lg bg-surface-container-highest border border-glass flex items-center justify-center shrink-0 text-on-surface-variant">
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-body-sm font-bold text-on-surface leading-tight pr-6">{m.title}</h3>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">{m.description}</p>
                          {m.config && (
                            <div className="text-[10px] text-on-surface-variant/75 font-mono pt-1 space-y-0.5">
                              <div>Freq: {m.config.target_frequency}</div>
                              <div>Ends: {m.config.end_date}</div>
                              {m.config.notes && <div className="italic text-on-surface-variant pr-2">&quot;{m.config.notes}&quot;</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-glass/40 space-y-2">
                      <div className="flex justify-between items-center text-body-xs font-semibold">
                        <span className="text-primary font-bold">-{m.carbon_reduction_kg} kg</span>
                        <span className="text-secondary font-bold">+${m.money_saved_usd}</span>
                      </div>

                      {/* Interactive Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleCheckIn(m, false)}
                          className={cn(
                            "flex-1 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 border transition-all",
                            m.check_ins.length > 0 
                              ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20" 
                              : "bg-surface-container-highest border-glass text-on-surface-variant hover:bg-surface-container-highest/80"
                          )}
                          aria-label={`Check in for mission: ${m.title}`}
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {m.check_ins.length > 0 ? "Checked In" : "Check-in"}
                        </button>
                        
                        <button
                          onClick={() => handleCompleteMission(m.id)}
                          className="bg-secondary text-on-secondary hover:bg-secondary/90 px-3 py-1.5 rounded text-[11px] font-bold"
                          aria-label={`Complete mission: ${m.title}`}
                        >
                          Complete
                        </button>

                        <button
                          onClick={() => handleCancelMission(m.id)}
                          className="border border-error/20 bg-error/5 text-error-variant hover:bg-error/15 px-2 py-1.5 rounded"
                          title="Cancel Commitment"
                          aria-label={`Cancel mission: ${m.title}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Completed Wall of Fame */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-glass pb-2 px-1">
            <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" />
              Completed Missions
            </h2>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 text-body-xs font-bold font-mono">
              {missions.completed.length}
            </span>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {missions.completed.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-glass rounded-xl text-on-surface-variant">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-55" />
                <p className="text-body-xs font-semibold">No completed achievements yet.</p>
                <p className="text-[10px] opacity-75 px-4 mt-1">Complete your active missions to fill your Wall of Fame!</p>
              </div>
            ) : (
              missions.completed.map((m) => {
                const IconComponent = actionIcons[m.action_id] || Leaf;

                return (
                  <Card key={m.id} className="border border-glass bg-[#01110b]/30 p-4 space-y-3 border-l-4 border-l-primary relative">
                    <span className="absolute top-3 right-3 text-primary bg-primary/10 border border-primary/20 p-1 rounded-full">
                      <Award className="h-4.5 w-4.5" />
                    </span>
                    
                    <div className="flex gap-3">
                      <div className="h-9 w-9 rounded-lg bg-surface-container-highest border border-glass flex items-center justify-center shrink-0 text-primary">
                        <IconComponent className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-body-sm font-bold text-on-surface-variant line-through leading-tight pr-6">{m.title}</h3>
                        <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pr-6">{m.description}</p>
                        <div className="text-[9px] text-primary/75 font-mono pt-1">
                          Completed on {new Date(m.config?.end_date || new Date()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-glass/40 flex justify-between items-center text-body-xs font-bold">
                      <span className="text-primary">-{m.carbon_reduction_kg} kg CO2e saved</span>
                      {m.money_saved_usd > 0 && <span className="text-secondary">+${m.money_saved_usd} saved</span>}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ADOPT CONFIGURATION MODAL */}
      {adoptingMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div 
            ref={adoptModalRef}
            onKeyDown={handleAdoptModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adoptModalTitle"
            className="bg-surface-container border border-glass rounded-xl shadow-glow w-full max-w-md overflow-hidden relative text-left"
          >
            <button 
              onClick={() => setAdoptingMission(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
              aria-label="Close configuration modal"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 id="adoptModalTitle" className="text-title-lg font-bold text-on-surface">Configure Eco Mission</h3>
                <p className="text-body-xs text-on-surface-variant">Set your milestones for <span className="font-bold text-primary">{adoptingMission.title}</span>.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="adopt-frequency" className="text-body-xs font-bold text-on-surface-variant">Target Frequency</label>
                  <input 
                    id="adopt-frequency"
                    type="text" 
                    value={frequency} 
                    onChange={(e) => setFrequency(e.target.value)} 
                    placeholder="e.g. 3 days/week, daily"
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="adopt-start-date" className="text-body-xs font-bold text-on-surface-variant">Start Date</label>
                    <input 
                      id="adopt-start-date"
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="adopt-end-date" className="text-body-xs font-bold text-on-surface-variant">End Date</label>
                    <input 
                      id="adopt-end-date"
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="adopt-notes" className="text-body-xs font-bold text-on-surface-variant">Custom Action Notes</label>
                  <textarea 
                    id="adopt-notes"
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Add reminders, guidelines, or custom notes..."
                    rows={3}
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-glass flex gap-3">
                <button 
                  onClick={() => setAdoptingMission(null)}
                  className="flex-1 bg-surface-container-highest text-on-surface hover:bg-surface-container-highest/85 py-2.5 rounded font-bold text-body-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdoptSubmit}
                  className="flex-1 bg-primary text-on-primary hover:bg-primary/95 py-2.5 rounded font-bold text-body-sm shadow-glow transition-all"
                >
                  Commit Mission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM MISSION MODAL */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div 
            ref={customModalRef}
            onKeyDown={handleCustomModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customMissionTitle"
            className="bg-surface-container border border-glass rounded-xl shadow-glow w-full max-w-md overflow-hidden relative text-left"
          >
            <button 
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
              aria-label="Close custom mission modal"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 id="customMissionTitle" className="text-title-lg font-bold text-on-surface flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Create Custom Mission
                </h3>
                <p className="text-body-xs text-on-surface-variant">Design your own manual commitment and configuration settings.</p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label htmlFor="custom-title" className="text-body-xs font-bold text-on-surface-variant">Mission Title</label>
                  <input 
                    id="custom-title"
                    type="text" 
                    value={customTitle} 
                    onChange={(e) => setCustomTitle(e.target.value)} 
                    placeholder="e.g. Water lawn less, Eat poultry only"
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="custom-desc" className="text-body-xs font-bold text-on-surface-variant">Description</label>
                  <input 
                    id="custom-desc"
                    type="text" 
                    value={customDesc} 
                    onChange={(e) => setCustomDesc(e.target.value)} 
                    placeholder="Brief outline of the commitment..."
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-carbon" className="text-body-xs font-bold text-on-surface-variant">Carbon Reduction (kg/yr)</label>
                    <input 
                      id="custom-carbon"
                      type="number" 
                      value={customCarbon} 
                      onChange={(e) => setCustomCarbon(Number(e.target.value))} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-money" className="text-body-xs font-bold text-on-surface-variant">Money Saved (USD/yr)</label>
                    <input 
                      id="custom-money"
                      type="number" 
                      value={customMoney} 
                      onChange={(e) => setCustomMoney(Number(e.target.value))} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="custom-effort" className="text-body-xs font-bold text-on-surface-variant">Effort Level</label>
                  <select 
                    id="custom-effort"
                    value={customEffort} 
                    onChange={(e) => setCustomEffort(e.target.value as "low" | "moderate" | "high" | "transformational")}
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="low">Low Effort</option>
                    <option value="moderate">Moderate Effort</option>
                    <option value="high">High Effort</option>
                    <option value="transformational">Transformational</option>
                  </select>
                </div>

                <div className="border-t border-glass/40 my-2 pt-2" />

                <div className="flex flex-col gap-1">
                  <label htmlFor="custom-frequency" className="text-body-xs font-bold text-on-surface-variant">Frequency & Timeline Configuration</label>
                  <input 
                    id="custom-frequency"
                    type="text" 
                    value={frequency} 
                    onChange={(e) => setFrequency(e.target.value)} 
                    placeholder="e.g. Daily, 3 times/week"
                    className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-start-date" className="text-body-xs font-bold text-on-surface-variant">Start Date</label>
                    <input 
                      id="custom-start-date"
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="custom-end-date" className="text-body-xs font-bold text-on-surface-variant">End Date</label>
                    <input 
                      id="custom-end-date"
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="bg-surface-container-low border border-glass rounded px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-glass flex gap-3">
                <button 
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 bg-surface-container-highest text-on-surface hover:bg-surface-container-highest/85 py-2.5 rounded font-bold text-body-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCustomSubmit}
                  className="flex-1 bg-primary text-on-primary hover:bg-primary/95 py-2.5 rounded font-bold text-body-sm shadow-glow transition-all"
                >
                  Create & Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE COMMITMENT LIMIT OVERFLOW WARNING MODAL */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div 
            ref={limitModalRef}
            onKeyDown={handleLimitModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="limitModalTitle"
            className="bg-surface-container border-2 border-error/30 rounded-xl shadow-glow w-full max-w-sm overflow-hidden relative text-left"
          >
            <button 
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface"
              aria-label="Close warning modal"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-6 space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-error/10 text-error-variant flex items-center justify-center mx-auto border border-error/20">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 id="limitModalTitle" className="text-title-md font-bold text-on-surface">Active Mission Limit Exceeded</h3>
                <p className="text-body-xs text-on-surface-variant leading-relaxed">
                  You have reached the maximum of <strong>10 active missions</strong>. Complete or cancel an existing mission before adopting a new one.
                </p>
              </div>

              <button 
                onClick={() => setShowLimitModal(false)}
                className="w-full bg-error/15 hover:bg-error/20 border border-error/30 text-error-variant py-2.5 rounded font-bold text-body-sm transition-all"
              >
                Close Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WrappedEcoActionsPage() {
  return (
    <ErrorBoundary fallbackName="Eco Actions Sandbox">
      <EcoActionsPage />
    </ErrorBoundary>
  );
}
