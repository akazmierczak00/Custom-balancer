"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { ROLES, getRoleLabel } from "@/lib/constants/roles";
import {
  adminStartConfirmPhase,
  setFeaturedMatchup,
} from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { FeaturedMatchup, Lobby, LoLRole, UserProfile } from "@/types";

interface FeaturedMatchupPanelProps {
  lobby: Lobby;
  playersInRoom: number;
}

export function FeaturedMatchupPanel({
  lobby,
  playersInRoom,
}: FeaturedMatchupPanelProps) {
  const lobbyUsers = useLobbyUsers();
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [role, setRole] = useState<LoLRole>(
    lobby.featuredMatchup?.role ?? "mid"
  );
  const [uidA, setUidA] = useState(lobby.featuredMatchup?.uidA ?? "");
  const [uidB, setUidB] = useState(lobby.featuredMatchup?.uidB ?? "");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const slotUids = useMemo(
    () => lobby.slots.filter(Boolean) as string[],
    [lobby.slots]
  );
  const isFull = slotUids.length === 10;
  const allInRoom = isFull && playersInRoom === 10;

  useEffect(() => {
    if (lobbyUsers) return;
    return subscribeToUsers(slotUids, setUsers);
  }, [lobbyUsers, slotUids]);

  useEffect(() => {
    setRole(lobby.featuredMatchup?.role ?? "mid");
    setUidA(lobby.featuredMatchup?.uidA ?? "");
    setUidB(lobby.featuredMatchup?.uidB ?? "");
  }, [lobby.featuredMatchup]);

  const resolvedUsers = lobbyUsers ?? users;

  const nick = (uid: string) => resolvedUsers[uid]?.nick || uid.slice(0, 6);

  const activeMatchup: FeaturedMatchup | null = lobby.featuredMatchup ?? null;

  const handleSave = async () => {
    if (!uidA || !uidB) {
      alert("Wybierz dwóch graczy");
      return;
    }
    if (uidA === uidB) {
      alert("Wybierz dwóch różnych graczy");
      return;
    }

    setSaving(true);
    try {
      await setFeaturedMatchup(lobby.id, { role, uidA, uidB });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd zapisu matchupu");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await setFeaturedMatchup(lobby.id, null);
      setUidA("");
      setUidB("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd czyszczenia");
    } finally {
      setSaving(false);
    }
  };

  const handleStartConfirm = async () => {
    setStarting(true);
    try {
      await adminStartConfirmPhase(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd startu akceptacji");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Featured Matchup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-500">
          Opcjonalnie zablokuj dwóch graczy na jednej linii przeciwko sobie.
          Reszta składu losuje się normalnie. Potem uruchom timer akceptacji.
        </p>

        {activeMatchup && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
            Aktywne: {nick(activeMatchup.uidA)} vs {nick(activeMatchup.uidB)} ·{" "}
            {getRoleLabel(activeMatchup.role)}
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">Linia</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setRole(entry.value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm",
                  role === entry.value
                    ? "border-indigo-500/60 bg-indigo-950/40 text-slate-100"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-slate-400">Gracz A</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              value={uidA}
              onChange={(e) => setUidA(e.target.value)}
            >
              <option value="">— wybierz —</option>
              {slotUids.map((uid) => (
                <option key={uid} value={uid} disabled={uid === uidB}>
                  {nick(uid)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-slate-400">Gracz B</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
              value={uidB}
              onChange={(e) => setUidB(e.target.value)}
            >
              <option value="">— wybierz —</option>
              {slotUids.map((uid) => (
                <option key={uid} value={uid} disabled={uid === uidA}>
                  {nick(uid)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSave}
            disabled={saving || !uidA || !uidB}
          >
            {saving ? "Zapisywanie..." : "Zapisz matchup"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={saving || !activeMatchup}
          >
            Wyczyść
          </Button>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleStartConfirm}
            disabled={!allInRoom || starting}
          >
            {starting
              ? "Uruchamianie..."
              : "Wszyscy dołączyli — rozpocznij timer akceptacji"}
          </Button>
          {!isFull && (
            <p className="mt-2 text-xs text-slate-500">
              Lobby: {slotUids.length}/10 — uzupełnij skład.
            </p>
          )}
          {isFull && !allInRoom && (
            <p className="mt-2 text-xs text-slate-500">
              W pokoju: {playersInRoom}/10 — poczekaj, aż wszyscy wejdą do
              lobby.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
