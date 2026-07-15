"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChampionListCollapsible } from "@/components/lobby/champion-list-collapsible";
import { getRevealIntensity, WEAKNESS_GRID_COLS } from "@/lib/algorithms/drawWeaknesses";
import { isNarrowChampionPoolWeakness } from "@/lib/champions/narrow-pool";
import { cn } from "@/lib/utils";
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
  const pointsSpent = weaknesses.pointsSpent;
  const pointsTotal = weaknesses.pointsTotal;
  const pointsProgress =
    pointsTotal > 0 ? Math.min(100, (pointsSpent / pointsTotal) * 100) : 0;

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
    const hasNarrowChampionPool = weaknesses.selected.some((item) =>
      isNarrowChampionPoolWeakness(item.name)
    );

    return (
      <Card className="overflow-hidden border-amber-500/25 bg-slate-900/60">
        <CardHeader className="border-b border-amber-500/15 pb-4">
          <CardTitle className="text-xl text-amber-300">
            Wybrane osłabienia Adriana
          </CardTitle>
          <p className="text-sm text-slate-400">
            Finalny zestaw osłabień na tę rundę
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {weaknesses.selected.map((s) => (
            <div
              key={`${s.weaknessId}-${s.tier}`}
              className="rounded-xl border border-amber-500/20 bg-amber-950/15 px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Tier {s.tier}
                </span>
                <p className="font-semibold text-slate-100">{s.name}</p>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-slate-400">{s.text}</p>
            </div>
          ))}
          {hasNarrowChampionPool && weaknesses.championPool && (
            <div className="border-t border-slate-800 pt-3">
              <ChampionListCollapsible championPool={weaknesses.championPool} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-amber-500/25 bg-slate-900/60">
      <CardHeader className="border-b border-amber-500/15 pb-4">
        <CardTitle className="text-xl text-amber-300">Osłabienia Adriana</CardTitle>
        <p className="text-sm text-slate-400">
          {selectable
            ? canSelect
              ? "Wybierz osłabienia, wydając wszystkie punkty"
              : "Trwa wybór osłabień przez selektora"
            : "Losowanie kart osłabień"}
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {selectable && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/15 px-4 py-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400/80">
                  Punkty do wydania
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-amber-200">
                  {pointsRemaining}
                  <span className="ml-1 text-base font-medium text-amber-400/60">
                    / {pointsTotal}
                  </span>
                </p>
              </div>
              <p className="pb-1 text-sm tabular-nums text-slate-400">
                Wydano {pointsSpent}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="h-full rounded-full bg-amber-400/70 transition-all duration-500"
                style={{ width: `${pointsProgress}%` }}
              />
            </div>
          </div>
        )}

        {pointsError && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-center text-sm font-semibold text-red-300">
            Za mało punktów do wydania
          </div>
        )}

        <div className="space-y-4">
          {Array.from({ length: WEAKNESS_GRID_COLS }, (_, rowIdx) => (
            <div key={rowIdx} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                  Tier {rowIdx + 1}
                </span>
                <span className="text-[11px] text-slate-500">{rowIdx + 1} pkt</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: WEAKNESS_GRID_COLS }, (_, colIdx) => {
                  const cell =
                    weaknesses.drawn[rowIdx * WEAKNESS_GRID_COLS + colIdx];
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
                        "min-h-[5rem] rounded-xl border border-slate-700/70 bg-slate-800/50 p-3 text-left transition-all",
                        !cell.revealed &&
                          "flex items-center justify-center border-dashed opacity-40",
                        cell.revealed &&
                          !isFlashing &&
                          getRevealIntensity(cell.rarity),
                        isFlashing &&
                          "border-red-500/50 bg-red-950/40 ring-1 ring-red-500/40",
                        selected &&
                          !isFlashing &&
                          "border-amber-500/45 bg-amber-500/10 ring-1 ring-amber-400/30",
                        canSelect &&
                          cell.revealed &&
                          !isFlashing &&
                          (selected
                            ? "hover:border-slate-500/60 hover:bg-slate-800/70"
                            : "hover:border-amber-500/35 hover:bg-amber-500/5")
                      )}
                    >
                      {cell.revealed ? (
                        <>
                          <p className="text-sm font-semibold leading-tight text-slate-100">
                            {cell.name}
                          </p>
                          <p className="mt-1.5 text-xs leading-snug text-slate-400">
                            {cell.text}
                          </p>
                          {selected && (
                            <p className="mt-2 text-[11px] font-semibold text-amber-400/90">
                              Wybrane · {cell.tier} pkt
                              {canSelect && " · kliknij, aby odznaczyć"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-lg font-semibold text-slate-500">?</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
