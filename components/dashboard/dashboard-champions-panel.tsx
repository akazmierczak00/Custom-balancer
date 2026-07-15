"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants/roles";
import { ChampionCatalogEntry, ChampionLaneFilter } from "@/lib/champions/types";
import { cn } from "@/lib/utils";

const FILTERS: { value: ChampionLaneFilter; label: string }[] = [
  ...ROLES,
  { value: "all", label: "All" },
];

type ChampionsResponse = {
  patch: string;
  champions: ChampionCatalogEntry[];
};

export function DashboardChampionsPanel() {
  const [filter, setFilter] = useState<ChampionLaneFilter>("all");
  const [catalog, setCatalog] = useState<ChampionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/champions");
        const data = (await response.json()) as ChampionsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Nie udało się załadować championów.");
        }
        if (!cancelled) {
          setCatalog(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Nie udało się załadować championów."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredChampions = useMemo(() => {
    if (!catalog) return [];
    if (filter === "all") return catalog.champions;
    return catalog.champions.filter((champion) => champion.lanes.includes(filter));
  }, [catalog, filter]);

  return (
    <div className="dashboard-panel space-y-4 overflow-hidden rounded-xl border border-slate-700 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="dashboard-section-title text-lg font-semibold">Champions</h2>
          {catalog && (
            <p className="text-sm text-slate-400">
              Patch {catalog.patch} · {filteredChampions.length} championów
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <Button
            key={entry.value}
            type="button"
            size="sm"
            variant={filter === entry.value ? "default" : "outline"}
            onClick={() => setFilter(entry.value)}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {loading && <p className="text-slate-400">Ładowanie championów...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {filteredChampions.map((champion) => (
            <div
              key={champion.id}
              className={cn(
                "dashboard-user-row flex flex-col items-center gap-2 rounded-lg border border-slate-700 p-2 text-center",
                champion.lanes.length === 0 && "opacity-60"
              )}
              title={
                champion.lanes.length > 0
                  ? champion.lanes.join(", ")
                  : "Brak przypisanych ról z run"
              }
            >
              <img
                src={champion.iconUrl}
                alt={champion.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-md object-cover"
                loading="lazy"
              />
              <span className="text-xs font-medium leading-tight text-slate-100">
                {champion.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filteredChampions.length === 0 && (
        <p className="text-sm text-slate-400">Brak championów dla wybranej roli.</p>
      )}
    </div>
  );
}
