// app/layout.tsx
// Root layout for the Personal Stability Assistant (PSA)
// Purpose: App shell with left sidebar navigation and main content area.

import "@/styles/globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ThemeClient from "@/components/ThemeClient";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Personal Stability Assistant",
  description: "Rituals + chat for a single user",
};

// Ensure proper mobile scaling
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden antialiased bg-[var(--surface-0)] text-[var(--fg)]`}>
        <ThemeClient />
        <div className="h-screen flex flex-col md:flex-row">
          {/* Sidebar (collapsible at small widths, expanded on md+) */}
          <aside className="hidden md:block w-64 border-r border-[var(--border)] bg-[var(--surface-1)]">
            <Sidebar />
          </aside>

          {/* Top nav removed; embedded in chat panel instead */}

          {/* Main content */}
          <main className="flex-1 min-w-0 flex overflow-hidden relative">
            {/* Global transparent hamburger (mobile) */}
            <div className="md:hidden fixed top-[14px] right-[13px] z-30 bg-transparent">
              <Sidebar variant="top" />
            </div>
            <div className="mx-auto px-2 md:px-3 py-3 md:py-5 max-w-5xl flex-1 min-h-0 w-full flex flex-col">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}


