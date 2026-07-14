"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerBanner } from "@/components/profile/player-banner";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { acceptLobby } from "@/lib/lobby/service";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { Lobby, UserProfile } from "@/types";

interface LobbyParticipantsProps {
  lobby: Lobby;
  currentUid: string;
  showConfirmActions?: boolean;
}

export function LobbyParticipants({
  lobby,
  currentUid,
  showConfirmActions = false,
}: LobbyParticipantsProps) {
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const slotUids = useMemo(
    () => lobby.slots.filter(Boolean) as string[],
    [lobby.slots]
  );

  useEffect(() => {
    return subscribeToUsers(slotUids, setUsers);
  }, [slotUids]);

  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);
  const acceptedCount = Object.values(lobby.acceptances).filter(Boolean).length;
  const isJoined = lobby.slots.includes(currentUid);
  const hasAccepted = lobby.acceptances[currentUid];

  const handleAccept = async () => {
    try {
      await acceptLobby(lobby.id, currentUid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd akceptacji");
    }
  };

  return (
    <div className="space-y-4">
      {showConfirmActions && (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-6 text-center">
          <h2 className="text-xl font-bold text-indigo-300">
            Lobby pełne — potwierdź udział
          </h2>
          <p className="mt-2 text-4xl font-bold text-indigo-400">{remaining}s</p>
          <p className="mt-2 text-slate-300">
            Zaakceptowano: {acceptedCount}/10
          </p>
          {isJoined ? (
            <Button
              className="mt-4"
              onClick={handleAccept}
              disabled={hasAccepted}
            >
              {hasAccepted ? "Zaakceptowano" : "Akceptuj"}
            </Button>
          ) : (
            <p className="mt-4 text-sm text-amber-300">
              Zapisz się do lobby na dashboardzie, aby móc zaakceptować.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lobby.slots.map((uid, index) => (
          <PlayerBanner
            key={`${index}-${uid ?? "empty"}`}
            player={uid ? users[uid] : undefined}
          />
        ))}
      </div>
    </div>
  );
}
