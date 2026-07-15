"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerBanner } from "@/components/profile/player-banner";
import { joinLobby, leaveLobby, fillLobbyWithTestBots, deleteLobby } from "@/lib/lobby/service";
import { Lobby, UserProfile } from "@/types";

interface LobbyTileProps {
  lobby: Lobby;
  currentUser: UserProfile;
  users: Record<string, UserProfile>;
}

export function LobbyTile({ lobby, currentUser, users }: LobbyTileProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const filled = lobby.slots.filter(Boolean).length;
  const isJoined = lobby.slots.includes(currentUser.uid);
  const isAdmin = currentUser.role === "admin";

  const handleJoin = async () => {
    setLoading(true);
    try {
      await joinLobby(lobby.id, currentUser.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    try {
      await leaveLobby(lobby.id, currentUser.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleFillTestBots = async () => {
    setLoading(true);
    try {
      await fillLobbyWithTestBots(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wypełniania");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLobby = async () => {
    if (!confirm("Na pewno usunąć to lobby? Tej operacji nie można cofnąć.")) {
      return;
    }
    setLoading(true);
    try {
      await deleteLobby(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd usuwania lobby");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lobby #{lobby.id.slice(0, 6)}</CardTitle>
          <p className="text-sm text-slate-400">
            Status: {lobby.status} · {filled}/10
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lobby.status === "open" && isAdmin && filled < 10 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFillTestBots}
              disabled={loading}
            >
              Wypełnij botami (test)
            </Button>
          )}
          {lobby.status === "open" && !isJoined && (
            <Button size="sm" onClick={handleJoin} disabled={loading}>
              Zapisz się
            </Button>
          )}
          {isJoined && (
            <Button size="sm" variant="secondary" asChild>
              <a href={`/lobby/${lobby.id}`}>Wejdź</a>
            </Button>
          )}
          {lobby.status === "open" && isJoined && (
            <Button size="sm" variant="outline" onClick={handleLeave} disabled={loading}>
              Wypisz się
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteLobby}
              disabled={loading}
            >
              Usuń lobby
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {lobby.slots.map((uid, i) => (
              <PlayerBanner
                key={i}
                player={uid ? users[uid] : undefined}
                isCurrentUser={uid === currentUser.uid}
              />
            ))}
          </div>

          {lobby.roundHistory?.length > 0 && (
            <div className="space-y-3 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Historia rund ({lobby.roundHistory.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {lobby.roundHistory.map((round) => (
                  <div
                    key={round.roundNumber}
                    className="rounded-lg border border-slate-700 bg-slate-900/40 p-3"
                  >
                    <p className="text-sm font-medium">
                      Runda {round.roundNumber} — Team {round.winnerTeam} wygrywa
                    </p>
                    {round.screenshotUrl ? (
                      <a
                        href={round.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block overflow-hidden rounded border border-slate-700"
                      >
                        <Image
                          src={round.screenshotUrl}
                          alt={`Screenshot rundy ${round.roundNumber}`}
                          width={320}
                          height={180}
                          className="h-24 w-full object-cover"
                          unoptimized
                        />
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">Brak screenshota</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
