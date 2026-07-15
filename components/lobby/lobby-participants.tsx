"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerBanner } from "@/components/profile/player-banner";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { acceptLobby, acceptLobbyTestBots } from "@/lib/lobby/service";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { Lobby, UserProfile } from "@/types";

interface LobbyParticipantsProps {
  lobby: Lobby;
  currentUid: string;
  isAdmin?: boolean;
  showConfirmActions?: boolean;
  playersInRoom?: number;
}

export function LobbyParticipants({
  lobby,
  currentUid,
  isAdmin = false,
  showConfirmActions = false,
  playersInRoom = 0,
}: LobbyParticipantsProps) {
  const lobbyUsers = useLobbyUsers();
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const slotUids = useMemo(
    () => lobby.slots.filter(Boolean) as string[],
    [lobby.slots]
  );

  useEffect(() => {
    if (lobbyUsers) return;
    return subscribeToUsers(slotUids, setUsers);
  }, [lobbyUsers, slotUids]);

  const resolvedUsers = lobbyUsers ?? users;

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

  const filledSlots = lobby.slots.filter(Boolean).length;
  const isLobbyFull = filledSlots === 10;

  return (
    <div className="space-y-4">
      {lobby.status === "open" && isLobbyFull && playersInRoom < 10 && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 text-center">
          <p className="font-semibold text-indigo-300">Lobby pełne — czekamy na graczy</p>
          <p className="mt-2 text-slate-300">
            W pokoju lobby: {playersInRoom}/10
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Potwierdzenie udziału wystartuje, gdy wszyscy zapisani gracze wejdą do lobby.
          </p>
        </div>
      )}

      {lobby.status === "open" && isLobbyFull && playersInRoom === 10 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
          <p className="font-semibold text-emerald-300">Wszyscy w pokoju — uruchamiamy potwierdzenie...</p>
        </div>
      )}

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
                {hasAccepted ? "Zaakceptowano" : "Akceptuj"}
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
        {lobby.slots.map((uid, index) => {
          const isPresent = !!uid && (!!lobby.presentUids?.[uid] || isTestBotUid(uid));

          return (
            <PlayerBanner
              key={`${index}-${uid ?? "empty"}`}
              player={uid ? resolvedUsers[uid] : undefined}
              isCurrentUser={uid === currentUid}
              isPresent={isPresent}
            />
          );
        })}
      </div>
    </div>
  );
}
