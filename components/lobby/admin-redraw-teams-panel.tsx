"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BALANCE_MODES,
  normalizeBalanceMode,
} from "@/lib/constants/balance-modes";
import { adminRedrawOverviewTeams } from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { BalanceMode, Lobby } from "@/types";

interface AdminRedrawTeamsPanelProps {
  lobby: Lobby;
}

export function AdminRedrawTeamsPanel({ lobby }: AdminRedrawTeamsPanelProps) {
  const [mode, setMode] = useState<BalanceMode>(() =>
    normalizeBalanceMode(lobby.balanceMode)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(normalizeBalanceMode(lobby.balanceMode));
  }, [lobby.balanceMode]);

  const handleRedraw = async () => {
    setLoading(true);
    try {
      await adminRedrawOverviewTeams(lobby.id, mode);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd przelosowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Przelosuj składy (test)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Nowe losowanie z revealem ról od początku. Bez głosowania i
          statystyk. Wybrany tryb zapisze się w lobby.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BALANCE_MODES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setMode(entry.value)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                mode === entry.value
                  ? "border-indigo-500/60 bg-indigo-950/40"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              )}
            >
              <div className="font-medium text-slate-100">{entry.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                {entry.description}
              </div>
            </button>
          ))}
        </div>
        <Button onClick={handleRedraw} disabled={loading}>
          {loading ? "Losowanie..." : "Przelosuj składy"}
        </Button>
      </CardContent>
    </Card>
  );
}
