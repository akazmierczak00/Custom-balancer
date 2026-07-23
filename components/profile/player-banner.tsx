"use client";

import { ArrowLeftRight, Circle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRolePriorities, getRoleLabel } from "@/lib/constants/roles";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { getRankEmblemUrl, getRankLabel } from "@/lib/constants/ranks";
import { UserProfile, PlayerAssignment, LoLRole, LoLRank } from "@/types";

interface PlayerBannerProps {
  player?: PlayerAssignment | UserProfile;
  role?: LoLRole;
  voted?: boolean;
  isSelector?: boolean;
  isCurrentUser?: boolean;
  isPresent?: boolean;
  mirrored?: boolean;
  compact?: boolean;
  /** Jeszcze gęstszy wariant pod porównanie A/B/C — bez paska WR i historii. */
  dense?: boolean;
  showRolePriorities?: boolean;
  /** Ikona wybranego championa (np. w podsumowaniu rundy). */
  championIconUrl?: string | null;
  championName?: string | null;
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

function getWinRateTone(winRate: number | null) {
  if (winRate === null) {
    return "text-slate-400 border-slate-600 bg-slate-900/60";
  }
  if (winRate >= 60) return "text-emerald-300 border-emerald-500/40 bg-emerald-950/40";
  if (winRate <= 40) return "text-red-300 border-red-500/40 bg-red-950/40";
  return "text-slate-200 border-slate-600 bg-slate-900/60";
}

function RankBadge({
  url,
  label,
  compact,
  dense,
  className,
}: {
  url: string;
  label: string;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <img
        src={url}
        alt=""
        aria-hidden
        className={cn(
          "shrink-0 object-contain opacity-100",
          dense ? "h-6 w-6" : compact ? "h-6 w-6" : "h-7 w-7"
        )}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PlayerBanner({
  player,
  role,
  voted,
  isSelector,
  isCurrentUser = false,
  isPresent = false,
  mirrored = false,
  compact = false,
  dense = false,
  showRolePriorities = false,
  championIconUrl,
  championName,
  className,
}: PlayerBannerProps) {
  if (!player) {
    return (
      <div
        className={cn(
          "flex h-full min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-600 p-4",
          dense && "min-h-12 p-2",
          compact && !dense && "min-h-24",
          className
        )}
      >
        <p className="text-sm text-slate-500">Pusty slot</p>
      </div>
    );
  }

  const nick = "nick" in player ? player.nick : "";
  const rank = "rank" in player ? player.rank : "";
  const rankDivision =
    "rankDivision" in player ? player.rankDivision : undefined;
  const rankLp = "rankLp" in player ? player.rankLp : undefined;
  const matchHistory = "matchHistory" in player ? player.matchHistory : [];
  const rolePrioritiesLabel =
    "rolePrioritiesLabel" in player ? player.rolePrioritiesLabel : undefined;
  const legacyRolePriorities =
    "rolePriorities" in player ? player.rolePriorities : undefined;
  const isTestBot =
    ("isTestBot" in player && player.isTestBot) ||
    ("uid" in player && isTestBotUid(player.uid));

  const winRate = getWinRatePercent(player);

  const rankLabel = rank ? getRankLabel(rank as never, rankDivision, rankLp) : "Brak rangi";
  const rankEmblemUrl = getRankEmblemUrl((rank || "") as LoLRank | "");
  const rolePrioritiesLine =
    showRolePriorities && !compact && !dense
      ? rolePrioritiesLabel
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
          : null
      : null;

  if (dense) {
    return (
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md border border-slate-600/80 bg-slate-800/90 px-2.5 py-1.5",
          isCurrentUser && "bg-indigo-950/50 ring-1 ring-indigo-400/40",
          className
        )}
      >
        {championIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={championIconUrl}
            alt={championName ?? ""}
            title={championName ?? undefined}
            className="h-8 w-8 shrink-0 rounded object-cover ring-1 ring-slate-600"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-slate-50">
            {nick}
            {isTestBot && (
              <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300">
                BOT
              </span>
            )}
          </p>
          <p className="truncate text-[11px] leading-tight text-slate-300">
            {rankEmblemUrl ? (
              <RankBadge
                url={rankEmblemUrl}
                label={`${rankLabel}${` · ${winRate !== null ? `${winRate}% WR` : "WR TBD"}`}`}
                dense
              />
            ) : (
              <>
                {rankLabel}
                {` · ${winRate !== null ? `${winRate}% WR` : "WR TBD"}`}
              </>
            )}
          </p>
        </div>
        {(voted || isPresent || isSelector) && (
          <div className="flex shrink-0 gap-1">
            {isPresent && (
              <Circle
                className="h-3 w-3 fill-emerald-400 text-emerald-400"
                aria-label="Obecny w pokoju lobby"
              />
            )}
            {voted && <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" />}
            {isSelector && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-32 min-w-0 items-stretch gap-2 rounded-lg",
        compact && "min-h-24 gap-1",
        mirrored ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {championIconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={championIconUrl}
          alt={championName ?? ""}
          title={championName ?? undefined}
          className={cn(
            "shrink-0 self-center rounded object-cover ring-1 ring-slate-600",
            compact ? "h-12 w-12" : "h-14 w-14"
          )}
        />
      )}
      <div
        className={cn(
          "relative flex min-h-32 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800/80 p-4",
          compact && "min-h-24 p-2",
          isCurrentUser && "bg-indigo-950/40 ring-2 ring-indigo-400/45",
          isSelector && "ring-2 ring-amber-400"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-start justify-between gap-2",
            mirrored && "flex-row-reverse"
          )}
        >
          <div className={cn("min-w-0 flex-1", mirrored && "text-right")}>
            <p className="truncate font-semibold text-slate-100">
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
            <p
              className={cn(
                "truncate text-xs text-slate-400",
                compact && "text-[10px]",
                mirrored && "flex justify-end"
              )}
            >
              {rankEmblemUrl ? (
                <RankBadge
                  url={rankEmblemUrl}
                  label={rankLabel}
                  compact={compact}
                  className={!mirrored ? "flex-row-reverse" : undefined}
                />
              ) : (
                rankLabel
              )}
            </p>
            {rolePrioritiesLine && (
              <p className="mt-1 truncate text-xs text-indigo-300">{rolePrioritiesLine}</p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            {isPresent && (
              <Circle
                className={cn(
                  "h-3.5 w-3.5 fill-emerald-400 text-emerald-400",
                  compact && "h-3 w-3"
                )}
                aria-label="Obecny w pokoju lobby"
              />
            )}
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
            "text-sm font-bold leading-none tracking-tight",
            compact && "text-xs",
            winRate === null && "text-[10px] tracking-normal"
          )}
        >
          {winRate !== null ? `${winRate}%` : "TBD"}
        </span>
      </div>
    </div>
  );
}
