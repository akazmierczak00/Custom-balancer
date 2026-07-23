"use client";

import { useEffect, useMemo, useState } from "react";
import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { getTeamPointsFromAssignments } from "@/lib/algorithms/balanceTeams";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { cn } from "@/lib/utils";
import { Lobby, LoLRole, PlayerAssignment, UserProfile, ChampionPickRef } from "@/types";
import { TeamColumnLabel } from "@/components/lobby/team-column-label";
import { PlayerBanner } from "@/components/profile/player-banner";
import { isChampionPickRef } from "@/lib/lobby/champion-select";

interface TeamOverviewProps {
  lobby: Lobby;
  team1?: PlayerAssignment[];
  team2?: PlayerAssignment[];
  votes?: Record<string, string>;
  compact?: boolean;
  /** Czytelny wariant pod porównanie A/B/C (bez mirroringu i zbędnych pasków). */
  dense?: boolean;
  currentUid?: string;
  winnerTeam?: 1 | 2;
  useLiveStats?: boolean;
  showRolePriorities?: boolean;
  showTeamPoints?: boolean;
  picks?: {
    team1: Record<LoLRole, ChampionPickRef | null>;
    team2: Record<LoLRole, ChampionPickRef | null>;
  } | null;
}

function enrichPlayer(
  player: PlayerAssignment | undefined,
  liveUsers: Record<string, UserProfile>
): PlayerAssignment | undefined {
  if (!player) return undefined;
  const live = liveUsers[player.uid];
  if (!live) return player;
  return {
    ...player,
    wins: live.wins,
    losses: live.losses,
    matchHistory: live.matchHistory,
  };
}

export function TeamOverview({
  lobby,
  team1: team1Override,
  team2: team2Override,
  votes,
  compact = false,
  dense = false,
  currentUid,
  winnerTeam,
  useLiveStats = true,
  showRolePriorities = false,
  showTeamPoints = false,
  picks = null,
}: TeamOverviewProps) {
  const team1 = team1Override ?? lobby.team1;
  const team2 = team2Override ?? lobby.team2;

  const lobbyUsers = useLobbyUsers();
  const [liveUsers, setLiveUsers] = useState<Record<string, UserProfile>>({});

  const playerUids = useMemo(
    () => [...new Set([...team1, ...team2].map((player) => player.uid))],
    [team1, team2]
  );

  const team1Points = useMemo(
    () => (team1.length ? getTeamPointsFromAssignments(team1) : 0),
    [team1]
  );
  const team2Points = useMemo(
    () => (team2.length ? getTeamPointsFromAssignments(team2) : 0),
    [team2]
  );
  const pointsDiff = Math.abs(team1Points - team2Points);

  useEffect(() => {
    if (!useLiveStats || lobbyUsers) {
      if (!lobbyUsers) {
        setLiveUsers({});
      }
      return;
    }
    return subscribeToUsers(playerUids, setLiveUsers);
  }, [playerUids, useLiveStats, lobbyUsers]);

  const resolvedLiveUsers = lobbyUsers ?? liveUsers;

  const resolvePlayer = (player: PlayerAssignment | undefined) =>
    useLiveStats ? enrichPlayer(player, resolvedLiveUsers) : player;

  return (
    <div className={cn("min-w-0", dense ? "space-y-2" : "space-y-3")}>
      {showTeamPoints && team1.length > 0 && team2.length > 0 && (
        <p
          className={cn(
            "text-center font-medium",
            dense ? "text-xs text-slate-300" : "text-xs text-slate-400"
          )}
        >
          Punkty: Team 1{" "}
          <span className="font-semibold text-slate-100">{team1Points}</span>
          {" · "}
          Team 2{" "}
          <span className="font-semibold text-slate-100">{team2Points}</span>
          {" · "}
          różnica{" "}
          <span className="font-semibold text-indigo-300">{pointsDiff}</span>
        </p>
      )}
      <div
        className={cn(
          "grid min-w-0 items-center text-center",
          dense
            ? "grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] gap-2"
            : compact
              ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
              : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4"
        )}
      >
        <TeamColumnLabel team={1} winnerTeam={winnerTeam} compact={compact || dense} />
        <span aria-hidden="true" />
        <TeamColumnLabel team={2} winnerTeam={winnerTeam} compact={compact || dense} />
      </div>

      {REVEAL_ROLE_ORDER.map((role) => {
        const p1 = resolvePlayer(team1.find((player) => player.role === role));
        const p2 = resolvePlayer(team2.find((player) => player.role === role));
        const pick1 = picks?.team1?.[role];
        const pick2 = picks?.team2?.[role];
        const matchup = lobby.featuredMatchup;
        const featured =
          !!matchup &&
          matchup.role === role &&
          !!p1 &&
          !!p2 &&
          new Set([p1.uid, p2.uid]).has(matchup.uidA) &&
          new Set([p1.uid, p2.uid]).has(matchup.uidB);

        return (
          <div
            key={role}
            className={cn(
              "relative grid min-w-0 items-stretch",
              dense
                ? "grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] gap-2"
                : compact
                  ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
                  : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4",
              featured &&
                "rounded-xl bg-amber-500/10 ring-2 ring-amber-400/70 shadow-[0_0_24px_-8px_rgba(251,191,36,0.55)]",
              featured && dense && "px-1 py-1"
            )}
          >
            {featured && !dense && !compact && (
              <div className="pointer-events-none absolute left-1/2 z-10 -top-2.5 -translate-x-1/2">
                <span className="rounded-full border border-amber-400/50 bg-amber-950/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  Featured Matchup
                </span>
              </div>
            )}
            <div className="min-w-0">
              <PlayerBanner
                player={p1}
                role={role}
                voted={p1 ? !!votes?.[p1.uid] : false}
                isCurrentUser={p1?.uid === currentUid}
                mirrored={!dense}
                compact={compact && !dense}
                dense={dense}
                showRolePriorities={showRolePriorities}
                championIconUrl={
                  isChampionPickRef(pick1) ? pick1.iconUrl : null
                }
                championName={isChampionPickRef(pick1) ? pick1.name : null}
                className={cn("h-full", featured && !dense && "ring-1 ring-amber-400/30")}
              />
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5">
              <span
                className={cn(
                  "text-center font-semibold",
                  featured ? "text-amber-200" : dense ? "text-slate-200" : "text-slate-300",
                  dense
                    ? "text-[11px] leading-tight"
                    : compact
                      ? "text-[10px] leading-tight"
                      : "text-sm"
                )}
              >
                {getRoleLabel(role)}
              </span>
              {featured && (
                <span
                  className={cn(
                    "font-bold uppercase tracking-wider text-amber-400/90",
                    dense || compact ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  vs
                </span>
              )}
            </div>
            <div className="min-w-0">
              <PlayerBanner
                player={p2}
                role={role}
                voted={p2 ? !!votes?.[p2.uid] : false}
                isCurrentUser={p2?.uid === currentUid}
                compact={compact && !dense}
                dense={dense}
                showRolePriorities={showRolePriorities}
                championIconUrl={
                  isChampionPickRef(pick2) ? pick2.iconUrl : null
                }
                championName={isChampionPickRef(pick2) ? pick2.name : null}
                className={cn("h-full", featured && !dense && "ring-1 ring-amber-400/30")}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
