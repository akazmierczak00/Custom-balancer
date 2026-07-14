"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerBanner } from "@/components/profile/player-banner";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { acceptLobby, acceptLobbyTestBots } from "@/lib/lobby/service";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { Lobby, UserProfile } from "@/types";

interface LobbyParticipantsProps {
  lobby: Lobby;
  currentUid: string;
  isAdmin?: boolean;
  showConfirmActions?: boolean;
}

export function LobbyParticipants({
  lobby,
  currentUid,
  isAdmin = false,
  showConfirmActions = false,
}: LobbyParticipantsProps) {
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(false);
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
  const pendingBots = lobby.slots.filter(
    (uid) => uid && isTestBotUid(uid) && !lobby.acceptances[uid]
  ).length;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptLobby(lobby.id, currentUid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd akceptacji");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBots = async () => {
    setLoading(true);
    try {
      await acceptLobbyTestBots(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd potwierdzania botów");
    } finally {
      setLoading(false);
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
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {isJoined && (
              <Button onClick={handleAccept} disabled={loading || hasAccepted}>
                {hasAccepted ? "Zaakceptowano" : "Akceptuj (ja)"}
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={handleAcceptBots}
                disabled={loading || pendingBots === 0}
              >
                Potwierdź boty ({pendingBots})
              </Button>
            )}
          </div>
          {!isJoined && (
            <p className="mt-4 text-sm text-amber-300">
              Zapisz się do lobby na dashboardzie, aby móc zaakceptować własny udział.
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
