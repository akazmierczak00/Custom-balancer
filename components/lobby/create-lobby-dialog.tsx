"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BALANCE_MODES } from "@/lib/constants/balance-modes";
import { cn } from "@/lib/utils";
import { BalanceMode } from "@/types";

interface CreateLobbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onConfirm: (mode: BalanceMode) => void;
}

export function CreateLobbyDialog({
  open,
  onOpenChange,
  creating,
  onConfirm,
}: CreateLobbyDialogProps) {
  const [mode, setMode] = useState<BalanceMode>("classic");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Utwórz lobby</DialogTitle>
          <DialogDescription className="text-slate-400">
            Wybierz tryb losowania składów. Zostanie użyty przy draftcie i reshuffle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {BALANCE_MODES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setMode(entry.value)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                mode === entry.value
                  ? "border-indigo-500/60 bg-indigo-950/40"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              )}
            >
              <div className="font-medium text-slate-100">{entry.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{entry.description}</div>
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(mode)}
            disabled={creating}
          >
            {creating ? "Tworzenie..." : "Utwórz lobby"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
