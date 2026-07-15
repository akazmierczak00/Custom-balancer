"use client";

import { ArrowLeftRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRolePriorities, getRoleLabel } from "@/lib/constants/roles";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { getRankLabel } from "@/lib/constants/ranks";
import { UserProfile, PlayerAssignment, LoLRole } from "@/types";

interface PlayerBannerProps {
  player?: PlayerAssignment | UserProfile;
  role?: LoLRole;
  voted?: boolean;
  isSelector?: boolean;
  isCurrentUser?: boolean;
  mirrored?: boolean;
  compact?: boolean;
  className?: string;
}

function getWinRatePercent(player: PlayerAssignment | UserProfile): number | null {
  const wins =
    "wins" in player && player.wins !== undefined
      ? player.wins
      : player.matchHistory.filter((result) => result === "W").length;
  const losses =
    "losses" in player && player.losses !== undefined
      ? player.losses
      : player.matchHistory.filter((result) => result === "L").length;
  const total = wins + losses;

  if (total === 0) return null;

  return Math.round((wins / total) * 100);
}

function getWinRateTone(winRate: number) {
  if (winRate >= 60) return "text-emerald-300 border-emerald-500/40 bg-emerald-950/40";
  if (winRate <= 40) return "text-red-300 border-red-500/40 bg-red-950/40";
  return "text-slate-200 border-slate-600 bg-slate-900/60";
}

export function PlayerBanner({
  player,
  role,
  voted,
  isSelector,
  isCurrentUser = false,
  mirrored = false,
  compact = false,
  className,
}: PlayerBannerProps) {
  if (!player) {
    return (
      <div
        className={cn(
          "flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-600 p-4",
          className
        )}
      >
        <p className="text-sm text-slate-500">Pusty slot</p>
      </div>
    );
  }

  const nick = "nick" in player ? player.nick : "";
  const rank = "rank" in player ? player.rank : "";
  const matchHistory = "matchHistory" in player ? player.matchHistory : [];
  const rolePrioritiesLabel =
    "rolePrioritiesLabel" in player ? player.rolePrioritiesLabel : undefined;
  const legacyRolePriorities =
    "rolePriorities" in player ? player.rolePriorities : undefined;
  const isTestBot =
    ("isTestBot" in player && player.isTestBot) ||
    ("uid" in player && isTestBotUid(player.uid));

  const winRate = getWinRatePercent(player);

  const rankLabel = rank ? getRankLabel(rank as never) : "Brak rangi";
  const rolePrioritiesLine = rolePrioritiesLabel
    ? mirrored
      ? rolePrioritiesLabel.split(" > ").reverse().join(" < ")
      : rolePrioritiesLabel
    : legacyRolePriorities
      ? mirrored
        ? [...legacyRolePriorities]
            .sort((a, b) => b.priority - a.priority)
            .map((group) =>
              group.roles.map((r) => getRoleLabel(r).toUpperCase()).join(" = ")
            )
            .join(" < ")
        : formatRolePriorities(legacyRolePriorities)
      : null;

  return (
    <div
      className={cn(
        "flex h-full min-h-32 min-w-0 items-stretch gap-2",
        compact && "min-h-24 gap-1",
        mirrored ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <div
        className={cn(
          "relative flex min-h-32 min-w-0 flex-1 flex-col rounded-lg border border-slate-700 bg-slate-800/80 p-4",
          compact && "min-h-24 p-2",
          isCurrentUser && "bg-indigo-950/40 ring-2 ring-indigo-400/45",
          isSelector && "ring-2 ring-amber-400"
        )}
      >
      <div
        className={cn(
          "flex items-start justify-between gap-2",
          mirrored && "flex-row-reverse"
        )}
      >
        <div className={cn(mirrored && "text-right")}>
          <p className="font-semibold text-slate-100">
            {nick}
            {isTestBot && (
              <span
                className={cn(
                  "ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300",
                  compact && "ml-1 px-1 py-0 text-[9px]"
                )}
              >
                BOT
              </span>
            )}
          </p>
          <p className={cn("text-xs text-slate-400", compact && "text-[10px]")}>
            {rankLabel}
          </p>
          {rolePrioritiesLine && !compact && (
            <p className="mt-1 text-xs text-indigo-300">{rolePrioritiesLine}</p>
          )}
        </div>
        <div className="flex gap-1">
          {voted && <ArrowLeftRight className="h-4 w-4 text-emerald-400" />}
          {isSelector && <Sparkles className="h-4 w-4 text-amber-400" />}
        </div>
      </div>
      {!compact ? (
        <div
          className={cn(
            "mt-auto flex gap-1 pt-3",
            mirrored ? "flex-row-reverse justify-start" : "justify-start"
          )}
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const result = matchHistory[i];
            return (
              <span
                key={i}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded text-xs font-bold",
                  result === "W" && "bg-emerald-600/30 text-emerald-300",
                  result === "L" && "bg-red-600/30 text-red-300",
                  !result && "bg-slate-700/50 text-slate-600"
                )}
              >
                {result ?? "-"}
              </span>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            "mt-auto flex gap-0.5 pt-1",
            mirrored ? "flex-row-reverse justify-start" : "justify-start"
          )}
        >
          {Array.from({ length: 10 }).map((_, i) => {
            const result = matchHistory[i];
            return (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-2.5 rounded-[2px]",
                  result === "W" && "bg-emerald-600",
                  result === "L" && "bg-red-600",
                  !result && "bg-slate-700/70"
                )}
                title={result === "W" ? "Wygrana" : result === "L" ? "Przegrana" : "Brak"}
              />
            );
          })}
        </div>
      )}
      </div>
      {winRate !== null && (
        <div
          className={cn(
            "flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border px-1 py-3 text-center",
            compact && "w-9 px-0.5 py-2",
            getWinRateTone(winRate)
          )}
        >
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide opacity-80",
              compact && "text-[8px]"
            )}
          >
            WR
          </span>
          <span
            className={cn(
              "text-lg font-bold leading-none",
              compact && "text-sm"
            )}
          >
            {winRate}%
          </span>
        </div>
      )}
    </div>
  );
}
