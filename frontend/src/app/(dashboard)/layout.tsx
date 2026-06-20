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
        {/* Persistent left sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Page shell area */}
        <div className="flex flex-col min-h-screen md:pl-sidebar transition-all duration-300">
          {/* Top navbar */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Primary page viewport container */}
          <main className="flex-1 p-6 md:p-margin-page max-w-container-max mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Floating global Carbon Coach AI Assistant */}
        <CarbonCoachAssistant />
      </div>
    </CarbonProvider>
  );
}
