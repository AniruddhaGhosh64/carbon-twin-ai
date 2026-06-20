"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Bell, Search, Settings, Menu, X, User, Sliders, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/Switch";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings states
  const [settingsNotifications, setSettingsNotifications] = useState(true);
  const [settingsPrivacy, setSettingsPrivacy] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("carbon-green");

  const mockNotifications = [
    { id: 1, title: "Footprint baseline calculated successfully.", time: "2 hours ago" },
    { id: 2, title: "New high-impact commuter action recommended.", time: "5 hours ago" },
    { id: 3, title: "Streak Milestone reached! 42 Days consistent.", time: "1 day ago" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-glass bg-surface/40 px-6 backdrop-blur-md">
        {/* Search & Hamburger Menu */}
        <div className="flex flex-1 items-center gap-4">
          <button
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-glass bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors md:hidden"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search insights, metrics, actions..."
              className="h-10 w-full rounded-lg bg-[#121212] pl-11 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:border-primary/50 focus:shadow-[0_0_8px_rgba(149,212,179,0.15)] transition-all duration-300"
            />
          </div>
        </div>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-4 relative">
          
          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-glass bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <>
                {/* Backdrop to capture clicks outside */}
                <div onClick={() => setNotificationsOpen(false)} className="fixed inset-0 z-30" />
                <div className="absolute right-0 top-12 mt-2 w-80 z-40 rounded-lg bg-glass border border-glass p-4 shadow-lg text-left animate-fade-in">
                  <div className="flex items-center justify-between border-b border-glass pb-2.5 mb-3">
                    <span className="text-label-caps text-on-surface">Notifications</span>
                    <span className="text-[10px] font-semibold text-primary">3 New</span>
                  </div>
                  <div className="space-y-3">
                    {mockNotifications.map((notif) => (
                      <div key={notif.id} className="pb-2 border-b border-glass/40 last:border-b-0 last:pb-0">
                        <p className="text-body-sm text-on-surface leading-normal">{notif.title}</p>
                        <span className="text-[10px] text-on-surface-variant mt-1 block">{notif.time}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setNotificationsOpen(false)}
                    className="w-full text-center text-body-sm font-semibold text-primary hover:underline border-t border-glass pt-3 mt-3 block"
                  >
                    View All
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button 
            onClick={() => {
              setSettingsOpen(true);
              setNotificationsOpen(false);
              setProfileOpen(false);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-glass bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Vertical Divider */}
          <div className="h-6 w-[1px] bg-glass" />

          {/* User Profile Info & Dropdown Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-3 outline-none group text-left"
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-primary/20 bg-surface-container-high group-hover:border-primary/45 transition-colors">
                {session?.user?.image ? (
                  <img src={session.user.image} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary-container text-body-sm font-semibold text-on-primary-container">
                    {userInitials}
                  </div>
                )}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-body-sm font-medium text-on-surface group-hover:text-primary transition-colors">{userName}</span>
                <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Enterprise Plan</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <>
                {/* Backdrop to capture clicks outside */}
                <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-30" />
                <div className="absolute right-0 top-12 mt-2 w-60 z-40 rounded-lg bg-glass border border-glass p-2.5 shadow-lg text-left animate-fade-in">
                  
                  {/* Dropdown Header user details */}
                  <div className="px-3.5 py-3 border-b border-glass mb-2">
                    <span className="text-body-sm font-bold text-on-surface block truncate">{userName}</span>
                    <span className="text-[10px] text-on-surface-variant block truncate mt-0.5">{userEmail}</span>
                    <span className="inline-flex mt-1.5 items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                      Enterprise Plan
                    </span>
                  </div>

                  {/* Actions list */}
                  <div className="space-y-1">
                    <button 
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-md transition-all text-left"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button 
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-md transition-all text-left"
                    >
                      <Sliders className="h-4 w-4" />
                      Preferences
                    </button>
                    <div className="h-[1px] bg-glass my-1.5" />
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-body-sm text-error/85 hover:text-error hover:bg-error/10 rounded-md transition-all text-left cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Settings Modal Dialog */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          {/* Backdrop for click outside */}
          <div onClick={() => setSettingsOpen(false)} className="fixed inset-0 z-30" />
          
          {/* Modal Container */}
          <div className="bg-glass border border-glass rounded-lg shadow-lg p-6 max-w-md w-full relative z-40 text-left flex flex-col gap-6 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-glass pb-3.5">
              <div className="flex items-center gap-2 text-primary">
                <Settings className="h-5 w-5" />
                <span className="text-title-md font-bold text-on-surface">Settings</span>
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass text-on-surface-variant hover:text-on-surface transition-all"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Fields List */}
            <div className="space-y-5">
              
              {/* Field 1: Theme Selection */}
              <div className="space-y-2">
                <label className="text-label-caps text-on-surface-variant">Theme</label>
                <div className="relative">
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="h-11 w-full rounded-lg bg-[#121212] border border-glass px-4 text-body-sm text-on-surface outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="carbon-green">Carbon Green (Default)</option>
                    <option value="dark-slate" disabled>Dark Slate (Phase 2)</option>
                    <option value="midnight" disabled>Midnight (Phase 2)</option>
                  </select>
                  {/* Select arrow indicator */}
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-on-surface-variant">
                    ▼
                  </div>
                </div>
              </div>

              {/* Field 2: Notifications Toggle */}
              <div className="flex items-center justify-between border-t border-glass pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-sm font-semibold text-on-surface">Enable Notifications</span>
                  <span className="text-[11px] text-on-surface-variant">Receive alerts on carbon score updates</span>
                </div>
                <Switch 
                  checked={settingsNotifications} 
                  onCheckedChange={setSettingsNotifications} 
                />
              </div>

              {/* Field 3: Privacy Toggle */}
              <div className="flex items-center justify-between border-t border-glass pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-sm font-semibold text-on-surface">Data Privacy Mode</span>
                  <span className="text-[11px] text-on-surface-variant">Anonymize demographic analytics data</span>
                </div>
                <Switch 
                  checked={settingsPrivacy} 
                  onCheckedChange={setSettingsPrivacy} 
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="border-t border-glass pt-4 flex justify-end gap-3.5">
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2.5 rounded-md border border-glass text-body-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2.5 rounded-md bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                Save Settings
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
