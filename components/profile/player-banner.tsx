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
  className?: string;
}

export function PlayerBanner({
  player,
  role,
  voted,
  isSelector,
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
  const rolePriorities =
    "rolePriorities" in player ? player.rolePriorities : undefined;
  const isTestBot =
    ("isTestBot" in player && player.isTestBot) ||
    ("uid" in player && isTestBotUid(player.uid));

  return (
    <div
      className={cn(
        "relative flex h-full min-h-32 flex-col rounded-lg border border-slate-700 bg-slate-800/80 p-4",
        isSelector && "ring-2 ring-amber-400",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100">
            {nick}
            {isTestBot && (
              <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                BOT
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400">
            {rank ? getRankLabel(rank as never) : "Brak rangi"}
            {role ? ` · ${getRoleLabel(role)}` : ""}
          </p>
          {rolePriorities && (
            <p className="mt-1 text-xs text-indigo-300">
              {formatRolePriorities(rolePriorities)}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {voted && <ArrowLeftRight className="h-4 w-4 text-emerald-400" />}
          {isSelector && <Sparkles className="h-4 w-4 text-amber-400" />}
        </div>
      </div>
      <div className="mt-auto flex gap-1 pt-3">
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
    </div>
  );
}
