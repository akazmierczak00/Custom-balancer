"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { acceptLobby, acceptLobbyTestBots } from "@/lib/lobby/service";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { Lobby } from "@/types";

interface ConfirmPopupProps {
  lobby: Lobby;
  currentUid: string;
  isAdmin?: boolean;
  open: boolean;
}

export function ConfirmPopup({
  lobby,
  currentUid,
  isAdmin = false,
  open,
}: ConfirmPopupProps) {
  const [loading, setLoading] = useState(false);
  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);
  const acceptedCount = Object.values(lobby.acceptances).filter(Boolean).length;
  const isJoined = lobby.slots.includes(currentUid);
  const hasAccepted = !!lobby.acceptances[currentUid];
  const pendingBots = lobby.slots.filter(
    (uid) => uid && isTestBotUid(uid) && !lobby.acceptances[uid]
  ).length;

  const handleAccept = async () => {
    if (!isJoined) {
      alert("Musisz być zapisany do lobby, aby zaakceptować.");
      return;
    }
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
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        showClose={false}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Lobby pełne — potwierdź udział</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <p className="text-5xl font-bold text-indigo-400">{remaining}s</p>
          <p className="text-slate-300">
            Zaakceptowano: {acceptedCount}/10
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAccept}
              disabled={loading || !isJoined || hasAccepted}
              className="w-full"
            >
              {!isJoined
                ? "Zapisz się, aby akceptować"
                : hasAccepted
                  ? "Zaakceptowano"
                  : "Akceptuj"}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={handleAcceptBots}
                disabled={loading || pendingBots === 0}
                className="w-full"
              >
                Potwierdź boty ({pendingBots})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
