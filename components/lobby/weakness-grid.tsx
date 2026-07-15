"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getRevealIntensity, WEAKNESS_GRID_COLS } from "@/lib/algorithms/drawWeaknesses";
import { LobbyWeaknesses } from "@/types";

interface WeaknessGridProps {
  weaknesses: LobbyWeaknesses;
  onRevealComplete?: () => void;
  selectable?: boolean;
  onSelect?: (row: number, col: number) => Promise<void>;
  currentUid?: string;
  actAsSelector?: boolean;
}

export function WeaknessGrid({
  weaknesses,
  onRevealComplete,
  selectable,
  onSelect,
  currentUid,
  actAsSelector = false,
}: WeaknessGridProps) {
  const [flashCell, setFlashCell] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState(false);

  const isSelector =
    !!weaknesses.selectorUid &&
    (weaknesses.selectorUid === currentUid || actAsSelector);
  const canSelect = selectable && isSelector && !weaknesses.confirmed;
  const pointsRemaining = weaknesses.pointsTotal - weaknesses.pointsSpent;

  const isCellSelected = (cell: (typeof weaknesses.drawn)[number]) =>
    weaknesses.selected.some(
      (selected) =>
        selected.weaknessId === cell.weaknessId && selected.tier === cell.tier
    );

  useEffect(() => {
    if (
      weaknesses.revealIndex >= 9 &&
      weaknesses.drawn.length > 0 &&
      onRevealComplete
    ) {
      onRevealComplete();
    }
  }, [weaknesses.revealIndex, weaknesses.drawn.length, onRevealComplete]);

  const handleCellClick = async (rowIdx: number, colIdx: number) => {
    if (!onSelect || !canSelect) return;

    const cellKey = `${rowIdx}-${colIdx}`;

    try {
      await onSelect(rowIdx, colIdx);
      setPointsError(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("Za mało punktów")) {
        setFlashCell(cellKey);
        setPointsError(true);
        window.setTimeout(() => setFlashCell(null), 500);
        window.setTimeout(() => setPointsError(false), 2500);
        return;
      }
      alert(message || "Błąd wyboru");
    }
  };

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
        {selectable && (
          <p className="text-sm font-medium text-amber-200">
            Punkty do wydania: {pointsRemaining}
          </p>
        )}
      </div>
      {pointsError && (
        <p className="text-center text-sm font-semibold text-red-400">
          Za mało punktów do wydania
        </p>
      )}
      <div className="space-y-3">
        {Array.from({ length: WEAKNESS_GRID_COLS }, (_, rowIdx) => (
          <div key={rowIdx} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tier {rowIdx + 1}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: WEAKNESS_GRID_COLS }, (_, colIdx) => {
                const cell = weaknesses.drawn[rowIdx * WEAKNESS_GRID_COLS + colIdx];
                if (!cell) return null;

                const selected = isCellSelected(cell);
                const cellKey = `${rowIdx}-${colIdx}`;
                const isFlashing = flashCell === cellKey;

                return (
                  <button
                    key={cellKey}
                    type="button"
                    disabled={!canSelect || !cell.revealed}
                    onClick={() => void handleCellClick(rowIdx, colIdx)}
                    className={cn(
                      "min-h-24 rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-left transition-all",
                      !cell.revealed && "opacity-30",
                      cell.revealed && !isFlashing && getRevealIntensity(cell.rarity),
                      isFlashing &&
                        "border-red-500 bg-red-950/60 ring-2 ring-red-500/70",
                      selected &&
                        !isFlashing &&
                        "border-amber-400/70 bg-amber-500/15 ring-2 ring-amber-400/50",
                      canSelect &&
                        cell.revealed &&
                        !isFlashing &&
                        (selected
                          ? "hover:border-slate-400 hover:bg-slate-700/80"
                          : "hover:border-amber-400 hover:bg-amber-500/10")
                    )}
                  >
                    {cell.revealed ? (
                      <>
                        <p className="font-semibold">{cell.name}</p>
                        <p className="mt-1 text-sm text-slate-300">{cell.text}</p>
                        {selected && (
                          <p className="mt-2 text-xs font-semibold text-amber-300">
                            Wybrane · {cell.tier} pkt
                            {canSelect && " · kliknij, aby odznaczyć"}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-center text-slate-500">?</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
