"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import api from "@/lib/api/client";
import { ArrowRight, Leaf, Mail, Lock, User, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function LandingPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Auth Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);
  const originBtnRef = useRef<HTMLElement | null>(null);

  // Escape key close handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
        originBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isModalOpen]);

  // Focus modal input when opened
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }
  }, [isModalOpen]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])'
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

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setErrorMessage(null);
  };

  const openAuth = (tab: "login" | "signup") => {
    originBtnRef.current = document.activeElement as HTMLElement;
    setAuthTab(tab);
    resetForm();
    setIsModalOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        // Handle next-auth error messages
        if (result.error.includes("CredentialsSignin")) {
          setErrorMessage("Invalid email or password.");
        } else {
          setErrorMessage(result.error);
        }
      } else {
        setIsModalOpen(false);
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/api/v1/auth/register", { email, password, name });

      // Auto login after successful registration
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setErrorMessage(result.error);
      } else {
        setIsModalOpen(false);
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Registration failed. Try a different email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canopy-radial bg-topo-pattern p-6 sm:p-margin-page">
      {/* Top Navigation */}
      <header className="flex items-center justify-between max-w-container-max w-full mx-auto pb-6 border-b border-glass">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-glass border border-primary/20 shadow-glow">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary"
            >
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
          <span className="font-geist text-title-md font-bold tracking-tight text-on-surface">
            CarbonTwin AI
          </span>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              Enter Dashboard
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuth("login")}
                className="text-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="rounded-md bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12">
        {/* Release Pill Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-primary uppercase animate-pulse">
          <Leaf className="h-3.5 w-3.5" />
          Platform Version 2.0 now live
        </div>

        {/* Headline */}
        <h1 className="text-display-lg text-on-surface mb-6 leading-tight max-w-2xl font-bold">
          Meet Your Future <span className="text-primary">Sustainable Self.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-body-lg text-on-surface-variant mb-10 max-w-xl mx-auto">
          Track your carbon footprint, discover personalized recommendations, and simulate how small changes generate long-term environmental impact.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-body-lg font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-[0_4px_12px_rgba(149,212,179,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] group"
            >
              Enter Dashboard
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuth("signup")}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-body-lg font-semibold text-on-primary hover:bg-primary/95 transition-all shadow-[0_4px_12px_rgba(149,212,179,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] group cursor-pointer"
              >
                Get Started
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => openAuth("login")}
                className="rounded-lg border border-glass bg-surface-container-low px-6 py-3.5 text-body-lg font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                Access Dashboard
              </button>
            </>
          )}
        </div>

        {/* Demo Widget Mockup */}
        <div className="w-full max-w-2xl">
          <Card hoverable className="border border-primary/10">
            <CardHeader className="text-left">
              <CardDescription className="text-label-caps text-primary">Carbon Twin Projection</CardDescription>
              <CardTitle className="text-title-md">Annual CO2e Emissions Sandbox</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center bg-[#01110b]/50 border border-glass border-dashed rounded-md m-stack-lg mt-0">
              <p className="text-body-sm text-on-surface-variant">Interactive Visual Model Sandbox</p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer Section */}
      <footer className="max-w-container-max w-full mx-auto pt-6 border-t border-glass text-center text-body-sm text-on-surface-variant">
        &copy; {new Date().getFullYear()} CarbonTwin AI. All rights reserved.
      </footer>

      {/* Authentication Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          {/* Backdrop for click outside */}
          <div onClick={() => !isLoading && setIsModalOpen(false)} className="fixed inset-0 z-30" />

          {/* Modal Container */}
          <div 
            ref={modalRef}
            onKeyDown={handleModalKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="authModalTitle"
            className="bg-glass border border-glass rounded-xl shadow-lg p-6 max-w-md w-full relative z-40 text-left flex flex-col gap-5 animate-scale-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-glass pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Leaf className="h-5 w-5" />
                <span id="authModalTitle" className="text-title-md font-bold text-on-surface">
                  {authTab === "login" ? "Welcome Back" : "Join CarbonTwin AI"}
                </span>
              </div>
              <button
                onClick={() => !isLoading && setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-glass text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex w-full rounded-lg bg-surface-container-low p-1 border border-glass">
              <button
                onClick={() => { setAuthTab("login"); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-center text-body-sm font-semibold rounded-md transition-all cursor-pointer ${
                  authTab === "login"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                disabled={isLoading}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setErrorMessage(null); }}
                className={`flex-1 py-1.5 text-center text-body-sm font-semibold rounded-md transition-all cursor-pointer ${
                  authTab === "signup"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                disabled={isLoading}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-error-container/30 border border-error-container text-error text-body-sm p-3 rounded-lg leading-normal">
                {errorMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={authTab === "login" ? handleLogin : handleRegister} className="flex flex-col gap-4">
              {authTab === "signup" && (
                <div className="space-y-1">
                  <label htmlFor="fullName" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 w-full rounded-lg bg-[#121212] pl-10 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:border-primary/50 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="email" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg bg-[#121212] pl-10 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:border-primary/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-lg bg-[#121212] pl-10 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:border-primary/50 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {authTab === "signup" && (
                <div className="space-y-1">
                  <label htmlFor="confirmPassword" className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 w-full rounded-lg bg-[#121212] pl-10 pr-4 text-body-sm text-on-surface placeholder:text-on-surface-variant outline-none border border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] focus:border-primary/50 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary/95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] mt-2 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : authTab === "login" ? (
                  "Log In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* OAuth Separator */}
            <div className="flex items-center gap-3 my-1">
              <div className="h-[1px] flex-1 bg-glass" />
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Or continue with</span>
              <div className="h-[1px] flex-1 bg-glass" />
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3.5 h-10 rounded-lg border border-glass bg-surface-container-low text-body-sm font-semibold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Google account
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
