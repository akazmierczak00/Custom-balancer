"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { getRevealIntensity } from "@/lib/algorithms/drawWeaknesses";
import { LobbyWeaknesses } from "@/types";

interface WeaknessGridProps {
  weaknesses: LobbyWeaknesses;
  onRevealComplete?: () => void;
  selectable?: boolean;
  onSelect?: (row: number, col: number) => void;
  currentUid?: string;
}

export function WeaknessGrid({
  weaknesses,
  onRevealComplete,
  selectable,
  onSelect,
  currentUid,
}: WeaknessGridProps) {
  const isSelector = weaknesses.selectorUid === currentUid;
  const canSelect = selectable && isSelector && !weaknesses.confirmed;

  useEffect(() => {
    if (
      weaknesses.revealIndex >= 9 &&
      weaknesses.drawn.length > 0 &&
      onRevealComplete
    ) {
      onRevealComplete();
    }
  }, [weaknesses.revealIndex, weaknesses.drawn.length, onRevealComplete]);

  if (weaknesses.confirmed) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-amber-300">Wybrane osłabienia Adriana</h3>
        {weaknesses.selected.map((s) => (
          <p key={`${s.weaknessId}-${s.tier}`} className="text-slate-200">
            Tier {s.tier}: <strong>{s.name}</strong> — {s.text}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-amber-300">Osłabienia Adriana</h3>
        {canSelect && (
          <p className="text-sm text-slate-400">
            Punkty: {weaknesses.pointsSpent}/{weaknesses.pointsTotal}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {weaknesses.drawn.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <button
              key={`${rowIdx}-${colIdx}`}
              type="button"
              disabled={!canSelect || !cell.revealed}
              onClick={() => onSelect?.(rowIdx, colIdx)}
              className={cn(
                "min-h-24 rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-left transition-all",
                !cell.revealed && "opacity-30",
                cell.revealed && getRevealIntensity(cell.rarity),
                canSelect && cell.revealed && "hover:border-amber-400"
              )}
            >
              {cell.revealed ? (
                <>
                  <p className="text-xs text-amber-400">Tier {cell.tier}</p>
                  <p className="font-semibold">{cell.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{cell.text}</p>
                </>
              ) : (
                <p className="text-center text-slate-500">?</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
