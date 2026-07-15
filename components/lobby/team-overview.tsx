"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { Lobby } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface TeamOverviewProps {
  lobby: Lobby;
  votes?: Record<string, string>;
  compact?: boolean;
  currentUid?: string;
}

export function TeamOverview({
  lobby,
  votes,
  compact = false,
  currentUid,
}: TeamOverviewProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div
        className={cn(
          "grid min-w-0 items-center text-center",
          compact
            ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
            : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4"
        )}
      >
        <h3 className={cn("font-bold text-indigo-300", compact ? "text-sm" : "text-xl")}>
          Team 1
        </h3>
        <span aria-hidden="true" />
        <h3 className={cn("font-bold text-purple-300", compact ? "text-sm" : "text-xl")}>
          Team 2
        </h3>
      </div>

      {REVEAL_ROLE_ORDER.map((role) => {
        const p1 = lobby.team1.find((p) => p.role === role);
        const p2 = lobby.team2.find((p) => p.role === role);
        return (
          <div
            key={role}
            className={cn(
              "grid min-w-0 items-stretch",
              compact
                ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
                : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4"
            )}
          >
            <div className="min-w-0 overflow-hidden">
              <PlayerBanner
                player={p1}
                role={role}
                voted={p1 ? !!votes?.[p1.uid] : false}
                isCurrentUser={p1?.uid === currentUid}
                mirrored
                compact={compact}
                className="h-full"
              />
            </div>
            <div className="flex items-center justify-center">
              <span
                className={cn(
                  "text-center font-semibold text-slate-300",
                  compact ? "text-[10px] leading-tight" : "text-sm"
                )}
              >
                {getRoleLabel(role)}
              </span>
            </div>
            <div className="min-w-0 overflow-hidden">
              <PlayerBanner
                player={p2}
                role={role}
                voted={p2 ? !!votes?.[p2.uid] : false}
                isCurrentUser={p2?.uid === currentUid}
                compact={compact}
                className="h-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
