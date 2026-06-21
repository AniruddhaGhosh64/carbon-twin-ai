"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import logger from "@/lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalDashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error("Next.js dashboard segment caught an unhandled exception:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center bg-background text-on-background">
      <div className="flex flex-col items-center max-w-md p-8 rounded-2xl bg-glass border border-error/20 shadow-glow animate-fade-in">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error-container/20 border border-error/30 text-error mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <h1 className="text-title-lg font-bold text-on-surface mb-2">
          Dashboard Encountered an Error
        </h1>
        
        <p className="text-body-sm text-on-surface-variant mb-6">
          {error.message || "An unexpected rendering exception occurred. The global application sandbox successfully isolated the crash."}
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-all text-body-sm shadow-md cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Section
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-container border border-outline/20 text-on-surface hover:bg-surface-container-high transition-all text-body-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
