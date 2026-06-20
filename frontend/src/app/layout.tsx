import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarbonTwin AI - Climate Intelligence Suite",
  description: "Personalized carbon footprints, predictive simulations, and active environmental planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${inter.variable} bg-canopy-radial bg-topo-pattern antialiased text-on-surface`}
        suppressHydrationWarning
        data-gptw=""
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

