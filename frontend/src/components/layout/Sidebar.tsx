"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/lib/navigation";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-sidebar flex-col border-r border-glass bg-surface-container-low px-6 py-6 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header/Logo */}
        <div className="flex items-center justify-between pb-6 border-b border-glass">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            {/* Inline SVG Brand Logo: Leaf + Chemical Ring */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-glass border border-primary/20 shadow-glow transition-all duration-300 group-hover:border-primary/40">
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
              >
                {/* Left Side: Leaf */}
                <path
                  d="M48 20 C24 20, 20 44, 20 64 C20 76, 28 80, 48 80 C48 64, 48 40, 48 20 Z"
                  fill="currentColor"
                  fillOpacity="0.85"
                />
                <path
                  d="M26 66 L44 44"
                  stroke="#003824"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Right Side: Molecule Ring */}
                <path
                  d="M48 20 L76 34 L76 66 L48 80"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="76" cy="34" r="7" fill="#bfc9c1" />
                <circle cx="76" cy="66" r="7" fill="#bfc9c1" />
                <circle cx="48" cy="80" r="7" fill="#bfc9c1" />
                <circle cx="48" cy="20" r="7" fill="#bfc9c1" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-geist text-title-md font-bold tracking-tight text-on-surface transition-colors group-hover:text-primary">
                CarbonTwin
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest -mt-0.5">
                AI Intelligence
              </span>
            </div>
          </Link>

          {/* Close button for Mobile */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass text-on-surface-variant hover:text-on-surface md:hidden"
            aria-label="Close Sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 space-y-2 py-8 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3.5 px-4 py-3 text-body-sm font-medium rounded-lg transition-all duration-200 border border-transparent",
                  isActive
                    ? "bg-primary-container/20 text-primary border-primary/20 shadow-glow"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer CTA: Upgrade to Pro */}
        <div className="pt-6 border-t border-glass">
          <div className="relative overflow-hidden rounded-lg bg-glass p-4 border border-primary/10 shadow-glow group">
            {/* Soft decorative background glow */}
            <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-primary/10 blur-xl group-hover:bg-primary/20 transition-colors" />
            
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-label-caps text-primary">Upgrade to Pro</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mb-4 leading-normal">
              Unlock predictive simulation models & local asset monitoring.
            </p>
            <div className="relative group/btn w-full">
              <button 
                disabled
                className="w-full py-2 px-3 rounded-md bg-primary text-on-primary text-body-sm font-semibold opacity-50 cursor-not-allowed shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                Go Premium
              </button>
              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-container border border-glass px-2.5 py-1.5 text-[10px] text-on-surface opacity-0 transition-opacity pointer-events-none group-hover/btn:opacity-100 z-50">
                Premium features coming soon
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
