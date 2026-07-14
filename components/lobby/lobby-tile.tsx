"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayerBanner } from "@/components/profile/player-banner";
import { joinLobby, leaveLobby } from "@/lib/lobby/service";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lobby #{lobby.id.slice(0, 6)}</CardTitle>
          <p className="text-sm text-slate-400">
            Status: {lobby.status} · {filled}/10
          </p>
        </div>
        <div className="flex gap-2">
          {lobby.status === "open" && !isJoined && (
            <Button size="sm" onClick={handleJoin} disabled={loading}>
              Zapisz się
            </Button>
          )}
          {lobby.status === "open" && isJoined && (
            <Button size="sm" variant="outline" onClick={handleLeave} disabled={loading}>
              Wypisz się
            </Button>
          )}
          {(isJoined || isAdmin) && lobby.status !== "open" && (
            <Button size="sm" variant="secondary" asChild>
              <a href={`/lobby/${lobby.id}`}>Wejdź</a>
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
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {lobby.slots.map((uid, i) => (
            <PlayerBanner
              key={i}
              player={uid ? users[uid] : undefined}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
