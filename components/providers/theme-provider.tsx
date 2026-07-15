"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "custom-balancer-theme";

export type AppTheme = "default" | "y2k";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "y2k") {
    root.setAttribute("data-theme", "y2k");
  } else {
    root.removeAttribute("data-theme");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>("default");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved === "y2k" ? "y2k" : "default";
    applyTheme(initial);
    setTheme(initial);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const next: AppTheme = theme === "y2k" ? "default" : "y2k";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return (
    <>
      {children}
      {ready && (
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "y2k" ? "Przywróć domyślny motyw" : "Włącz motyw Y2K"}
          aria-label={theme === "y2k" ? "Przywróć domyślny motyw" : "Włącz motyw Y2K"}
          className={cn(
            "fixed bottom-3 right-3 z-[100] flex h-9 w-9 items-center justify-center rounded-full border transition-all",
            "opacity-25 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2",
            theme === "y2k"
              ? "border-pink-300/50 bg-pink-500/25 text-pink-100 focus-visible:ring-pink-300/60"
              : "border-slate-600/50 bg-slate-900/60 text-slate-300 focus-visible:ring-indigo-400/50"
          )}
        >
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
