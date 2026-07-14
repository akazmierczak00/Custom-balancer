"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setWinner, startCooldown } from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface PostGamePanelProps {
  lobby: Lobby;
  isAdmin: boolean;
  remaining: number;
  onCooldownEnd?: () => void;
}

export function PostGamePanel({
  lobby,
  isAdmin,
  remaining,
  onCooldownEnd,
}: PostGamePanelProps) {
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(false);

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

  const startTimer = async () => {
    setLoading(true);
    try {
      await startCooldown(lobby.id, minutes);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  if (lobby.status === "playing" && isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wybierz zwycięzcę</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
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
          <CardTitle>Timer przed kolejną rundą</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-sm text-slate-400">Minuty</label>
            <Input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
          <Button onClick={startTimer} disabled={loading}>
            Uruchom timer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (lobby.status === "cooldown") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Następna runda za</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-5xl font-bold text-indigo-400">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </p>
          {remaining === 0 && isAdmin && onCooldownEnd && (
            <Button className="mt-4" onClick={onCooldownEnd}>
              Rozpocznij kolejną rundę
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
