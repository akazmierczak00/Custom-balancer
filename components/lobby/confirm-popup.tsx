"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { acceptLobby } from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface ConfirmPopupProps {
  lobby: Lobby;
  currentUid: string;
  open: boolean;
}

export function ConfirmPopup({ lobby, currentUid, open }: ConfirmPopupProps) {
  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);
  const acceptedCount = Object.values(lobby.acceptances).filter(Boolean).length;
  const hasAccepted = lobby.acceptances[currentUid];

  const handleAccept = async () => {
    try {
      await acceptLobby(lobby.id, currentUid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd akceptacji");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Lobby pełne — potwierdź udział</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-center">
          <p className="text-5xl font-bold text-indigo-400">{remaining}s</p>
          <p className="text-slate-300">
            Zaakceptowano: {acceptedCount}/10
          </p>
          <Button
            onClick={handleAccept}
            disabled={hasAccepted}
            className="w-full"
          >
            {hasAccepted ? "Zaakceptowano" : "Akceptuj"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
