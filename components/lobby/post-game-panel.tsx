"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  endLobbySession,
  setWinner,
  startNextRound,
} from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface PostGamePanelProps {
  lobby: Lobby;
  isAdmin: boolean;
}

export function PostGamePanel({ lobby, isAdmin }: PostGamePanelProps) {
  const [loading, setLoading] = useState(false);

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
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleStartNextRound} disabled={loading}>
            Zacznij kolejną rundę
          </Button>
          <Button variant="secondary" onClick={handleEndSession} disabled={loading}>
            Zakończ sesję
          </Button>
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
        <CardContent>
          <p className="text-sm text-slate-400">
            Admin przygotowuje kolejną rundę lub kończy sesję.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
