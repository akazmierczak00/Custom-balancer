"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (removalSteps.length === 0) {
      const timeout = window.setTimeout(onComplete, 800);
      return () => window.clearTimeout(timeout);
    }

    if (stepIndex >= removalSteps.length) {
      const timeout = window.setTimeout(() => {
        markChampionPoolRevealSeen(lobbyId, championPool.revealedAt);
        onComplete();
      }, FADE_OUT_MS + 400);
      return () => window.clearTimeout(timeout);
    }

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
  }, [
    championPool.revealedAt,
    lobbyId,
    onComplete,
    removalSteps,
    stepIndex,
  ]);

  const visibleChampions = championPool.startingPool.filter(
    (champion) => !hiddenIds.has(champion.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="aspect-square w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-950 p-4 shadow-2xl">
        <div className="flex h-full flex-col gap-3">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-300">
              Zawężona pula championów
            </p>
            <p className="text-sm text-slate-400">
              Rola Adriana: {getRoleLabel(championPool.role)}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {visibleChampions.map((champion) => {
                const isFading = fadingIds.has(champion.id);

                return (
                  <div
                    key={champion.id}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border border-slate-700/70 bg-slate-900/60 p-1.5 transition-all duration-[400ms] ease-out",
                      isFading && "scale-90 opacity-0"
                    )}
                  >
                    <img
                      src={champion.iconUrl}
                      alt={champion.name}
                      width={48}
                      height={48}
                      className={cn(
                        "h-12 w-12 rounded-md object-cover transition-opacity duration-[400ms] ease-out",
                        isFading && "opacity-0"
                      )}
                    />
                    <span
                      className={cn(
                        "text-center text-[10px] leading-tight text-slate-200 transition-opacity duration-[400ms] ease-out",
                        isFading && "opacity-0"
                      )}
                    >
                      {champion.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">Trwa losowanie...</p>
        </div>
      </div>
    </div>
  );
}
