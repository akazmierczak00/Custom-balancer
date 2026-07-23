"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import {
  adminKickFromLobby,
  adminSetLobbyPhase,
  endLobbySession,
  setWinner,
  startNextRound,
} from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { Lobby, UserProfile } from "@/types";

interface PostGamePanelProps {
  lobby: Lobby;
  isAdmin: boolean;
}

export function PostGamePanel({ lobby, isAdmin }: PostGamePanelProps) {
  const [loading, setLoading] = useState(false);
  const [kickingUid, setKickingUid] = useState<string | null>(null);
  const lobbyUsers = useLobbyUsers();
  const [users, setUsers] = useState<Record<string, UserProfile>>({});

  const slotUids = useMemo(
    () => lobby.slots.filter(Boolean) as string[],
    [lobby.slots]
  );
  const filled = slotUids.length;
  const isFull = filled === 10;

  useEffect(() => {
    if (lobbyUsers || lobby.status !== "post_game") return;
    return subscribeToUsers(slotUids, setUsers);
  }, [lobbyUsers, lobby.status, slotUids]);

  const resolvedUsers = lobbyUsers ?? users;

  const currentRound = lobby.roundHistory?.[lobby.roundHistory.length - 1];
  const roundNumber = currentRound?.roundNumber;

  const pickWinner = async (team: 1 | 2) => {
    setLoading(true);
    try {
      await setWinner(lobby.id, team);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const skipToPostGame = async () => {
    setLoading(true);
    try {
      await adminSetLobbyPhase(lobby.id, "post_game");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleStartNextRound = async () => {
    setLoading(true);
    try {
      await startNextRound(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm("Zakończyć sesję i przejść do podsumowania?")) return;
    setLoading(true);
    try {
      await endLobbySession(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async (uid: string, nick: string) => {
    if (
      !confirm(
        `Wyrzucić „${nick}” z lobby? Slot zwolni się dla nowej osoby.`
      )
    ) {
      return;
    }

    setKickingUid(uid);
    try {
      await adminKickFromLobby(lobby.id, uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Nie udało się wyrzucić gracza");
    } finally {
      setKickingUid(null);
    }
  };

  if ((lobby.status === "final" || lobby.status === "playing") && isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wybierz zwycięzcę</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => pickWinner(1)} disabled={loading}>
            Team 1 wygrywa
          </Button>
          <Button variant="secondary" onClick={() => pickWinner(2)} disabled={loading}>
            Team 2 wygrywa
          </Button>
          <Button variant="outline" onClick={skipToPostGame} disabled={loading}>
            Pomiń wynik (bez statystyk)
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (lobby.status === "post_game" && isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Runda {roundNumber ?? "?"} —{" "}
            {lobby.winnerTeam ? `Team ${lobby.winnerTeam} wygrywa` : "wynik zapisany"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">
              Skład sesji · {filled}/10
            </p>
            <p className="text-xs text-slate-500">
              Możesz wyrzucić gracza między rundami — nowa osoba dołączy z
              dashboardu, gdy zwolni się slot.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {lobby.slots.map((uid, index) => {
                const nick = uid
                  ? resolvedUsers[uid]?.nick || "…"
                  : "Pusty slot";
                return (
                  <li
                    key={`${index}-${uid ?? "empty"}`}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm",
                      uid ? "text-slate-200" : "text-slate-500"
                    )}
                  >
                    <span className="truncate">{nick}</span>
                    {uid && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={loading || kickingUid === uid}
                        onClick={() => handleKick(uid, nick)}
                      >
                        {kickingUid === uid ? "..." : "Wyrzuć"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {!isFull && (
            <p className="text-sm text-amber-300/90">
              Uzupełnij skład ({filled}/10), zanim zaczniesz kolejną rundę.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleStartNextRound}
              disabled={loading || !isFull}
            >
              Zacznij kolejną rundę
            </Button>
            <Button
              variant="secondary"
              onClick={handleEndSession}
              disabled={loading}
            >
              Zakończ sesję
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lobby.status === "post_game" && !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Runda zakończona — Team {lobby.winnerTeam} wygrywa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-400">
            Admin przygotowuje kolejną rundę lub kończy sesję.
          </p>
          <p className="text-sm text-slate-500">
            Skład sesji: {filled}/10
            {!isFull
              ? " — jest wolne miejsce; znajomi mogą dołączyć z dashboardu."
              : "."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
