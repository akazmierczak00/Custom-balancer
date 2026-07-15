"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Y2kBackgroundStickers } from "@/components/providers/y2k-background-stickers";

const STORAGE_KEY = "custom-balancer-theme";

export type AppTheme = "default" | "y2k";

const ThemeContext = createContext<{ theme: AppTheme; ready: boolean }>({
  theme: "y2k",
  ready: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  if (theme === "y2k") {
    root.setAttribute("data-theme", "y2k");
  } else {
    root.removeAttribute("data-theme");
  }
}

function persistTheme(theme: AppTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  const maxAge = "31536000";
  document.cookie = `${STORAGE_KEY}=${theme};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>("y2k");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved === "default" ? "default" : "y2k";
    applyTheme(initial);
    persistTheme(initial);
    setTheme(initial);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const next: AppTheme = theme === "y2k" ? "default" : "y2k";
    applyTheme(next);
    persistTheme(next);
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, ready }}>
      {theme === "y2k" && ready && <Y2kBackgroundStickers />}
      <div className="relative z-10">{children}</div>
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
    </ThemeContext.Provider>
  );
}
