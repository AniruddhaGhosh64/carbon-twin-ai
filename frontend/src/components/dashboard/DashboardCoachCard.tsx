"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface DashboardCoachCardProps {
  explanation?: string;
  biggestCategory: string;
}

export function DashboardCoachCard({ explanation, biggestCategory }: DashboardCoachCardProps) {
  return (
    <Card className="lg:col-span-1 border border-glass relative overflow-hidden group">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-300" />

      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-primary" />
          <span className="text-label-caps text-primary">Carbon Coach AI</span>
        </div>
        <CardTitle className="pt-2 text-left text-base">Personalized Improvement</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between h-full pt-0 text-left min-h-[170px]">
        <p className="text-xs text-on-surface-variant leading-relaxed mb-6 italic">
          &ldquo;{explanation || `Focus on optimizing your ${biggestCategory} lifestyle habits to lower your total emissions.`}&rdquo;
        </p>
        <Link
          href="/simulator"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-primary/15 border border-primary/20 py-2.5 text-xs font-semibold text-primary hover:bg-primary/25 transition-all"
        >
          Simulate Impact
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
