"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getRoleLabel } from "@/lib/constants/roles";
import { LobbyWeaknesses } from "@/types";
import { cn } from "@/lib/utils";

const REVEAL_STEP_MS = 500;
const FADE_OUT_MS = 400;

type ChampionPoolRevealProps = {
  lobbyId: string;
  championPool: NonNullable<LobbyWeaknesses["championPool"]>;
  onComplete: () => void;
};

function getSeenKey(lobbyId: string, revealedAt: number) {
  return `champion-pool-reveal:${lobbyId}:${revealedAt}`;
}

export function hasSeenChampionPoolReveal(
  lobbyId: string,
  revealedAt: number
): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(getSeenKey(lobbyId, revealedAt)) === "1";
}

export function markChampionPoolRevealSeen(
  lobbyId: string,
  revealedAt: number
) {
  sessionStorage.setItem(getSeenKey(lobbyId, revealedAt), "1");
}

export function ChampionPoolReveal({
  lobbyId,
  championPool,
  onComplete,
}: ChampionPoolRevealProps) {
  const [fadingIds, setFadingIds] = useState<Set<string>>(() => new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [stepIndex, setStepIndex] = useState(0);

  const removalSteps = useMemo(
    () => championPool.removedChampionIds.map((id) => [id]),
    [championPool.removedChampionIds]
  );

  const isFinished =
    removalSteps.length === 0 || stepIndex >= removalSteps.length;

  useEffect(() => {
    if (isFinished) return;

    const fadeTimeouts: number[] = [];

    const timeout = window.setTimeout(() => {
      const idsToFade = removalSteps[stepIndex];

      setFadingIds((current) => {
        const next = new Set(current);
        for (const championId of idsToFade) {
          next.add(championId);
        }
        return next;
      });

      fadeTimeouts.push(
        window.setTimeout(() => {
          setHiddenIds((current) => {
            const next = new Set(current);
            for (const championId of idsToFade) {
              next.add(championId);
            }
            return next;
          });
          setFadingIds((current) => {
            const next = new Set(current);
            for (const championId of idsToFade) {
              next.delete(championId);
            }
            return next;
          });
        }, FADE_OUT_MS)
      );

      setStepIndex((current) => current + 1);
    }, REVEAL_STEP_MS);

    return () => {
      window.clearTimeout(timeout);
      for (const fadeTimeout of fadeTimeouts) {
        window.clearTimeout(fadeTimeout);
      }
    };
  }, [isFinished, removalSteps, stepIndex]);

  const handleClose = () => {
    markChampionPoolRevealSeen(lobbyId, championPool.revealedAt);
    onComplete();
  };

  const visibleChampions = championPool.startingPool.filter(
    (champion) => !hiddenIds.has(champion.id)
  );

  const poolSize = championPool.startingPool.length;
  const columnCount = Math.min(12, Math.max(6, Math.ceil(Math.sqrt(poolSize * 1.6))));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="flex max-h-[96vh] w-full max-w-7xl flex-col rounded-2xl border border-amber-500/40 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div className="shrink-0 text-center">
          <p className="text-lg font-semibold text-amber-300 sm:text-xl">
            Zawężona pula championów
          </p>
          <p className="text-sm text-slate-400">
            Rola Adriana: {getRoleLabel(championPool.role)}
          </p>
        </div>

        <div
          className="mt-4 grid gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {visibleChampions.map((champion) => {
            const isFading = fadingIds.has(champion.id);

            return (
              <div
                key={champion.id}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md border border-slate-700/70 bg-slate-900/60 p-1 transition-all duration-[400ms] ease-out sm:p-1.5",
                  isFading && "scale-90 opacity-0"
                )}
              >
                <img
                  src={champion.iconUrl}
                  alt={champion.name}
                  width={48}
                  height={48}
                  className={cn(
                    "h-9 w-9 rounded-md object-cover transition-opacity duration-[400ms] ease-out sm:h-11 sm:w-11",
                    isFading && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "line-clamp-1 w-full text-center text-[9px] leading-tight text-slate-200 transition-opacity duration-[400ms] ease-out sm:text-[10px]",
                    isFading && "opacity-0"
                  )}
                >
                  {champion.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex shrink-0 flex-col items-center gap-3">
          <p className="text-center text-xs text-slate-500">
            {isFinished
              ? "Losowanie zakończone"
              : `Pozostało do zniknięcia: ${removalSteps.length - stepIndex}`}
          </p>
          {isFinished && (
            <Button type="button" onClick={handleClose}>
              Zamknij
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
