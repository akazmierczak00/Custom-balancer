"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  endLobbySession,
  setWinner,
  startNextRound,
  uploadRoundScreenshot,
} from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface PostGamePanelProps {
  lobby: Lobby;
  isAdmin: boolean;
}

export function PostGamePanel({ lobby, isAdmin }: PostGamePanelProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleScreenshot = async (file: File) => {
    if (!roundNumber) return;
    setUploading(true);
    try {
      await uploadRoundScreenshot(lobby.id, roundNumber, file);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wgrywania screenshota");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Screenshot z wynikami gry</p>
            {currentRound?.screenshotUrl ? (
              <a
                href={currentRound.screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-slate-700"
              >
                <Image
                  src={currentRound.screenshotUrl}
                  alt={`Screenshot rundy ${roundNumber}`}
                  width={800}
                  height={450}
                  className="h-auto max-h-64 w-full object-contain bg-slate-950"
                  unoptimized
                />
              </a>
            ) : (
              <p className="text-sm text-slate-500">Brak screenshota — możesz dodać przed kolejną rundą.</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleScreenshot(file);
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading || !roundNumber}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? "Wgrywanie..."
                : currentRound?.screenshotUrl
                  ? "Zmień screenshot"
                  : "Wgraj screenshot"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleStartNextRound} disabled={loading}>
              Zacznij kolejną rundę
            </Button>
            <Button variant="secondary" onClick={handleEndSession} disabled={loading}>
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
        <CardContent>
          {currentRound?.screenshotUrl && (
            <a
              href={currentRound.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-slate-700"
            >
              <Image
                src={currentRound.screenshotUrl}
                alt={`Screenshot rundy ${roundNumber}`}
                width={800}
                height={450}
                className="h-auto max-h-64 w-full object-contain bg-slate-950"
                unoptimized
              />
            </a>
          )}
          <p className="mt-3 text-sm text-slate-400">
            Admin przygotowuje kolejną rundę lub kończy sesję.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
