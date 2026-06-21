"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { CarbonProvider } from "@/context/CarbonContext";
import CarbonCoachAssistant from "@/components/layout/CarbonCoachAssistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <CarbonProvider>
      <div className="min-h-screen bg-transparent">
        {/* Skip to Main Content Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Skip to main content
        </a>

        {/* Persistent left sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Page shell area */}
        <div className="flex flex-col min-h-screen md:pl-sidebar transition-all duration-300">
          {/* Top navbar */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Primary page viewport container */}
          <main id="main-content" tabIndex={-1} className="flex-1 p-6 md:p-margin-page max-w-container-max mx-auto w-full outline-none">
            {children}
          </main>
        </div>

        {/* Floating global Carbon Coach AI Assistant */}
        <CarbonCoachAssistant />
      </div>
    </CarbonProvider>
  );
}
