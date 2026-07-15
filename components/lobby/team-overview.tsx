"use client";

import { useEffect, useMemo, useState } from "react";
import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { subscribeToUsers } from "@/lib/firebase/firestore";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { cn } from "@/lib/utils";
import { Lobby, PlayerAssignment, UserProfile } from "@/types";
import { TeamColumnLabel } from "@/components/lobby/team-column-label";
import { PlayerBanner } from "@/components/profile/player-banner";

interface TeamOverviewProps {
  lobby: Lobby;
  team1?: PlayerAssignment[];
  team2?: PlayerAssignment[];
  votes?: Record<string, string>;
  compact?: boolean;
  currentUid?: string;
  winnerTeam?: 1 | 2;
  useLiveStats?: boolean;
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
  currentUid,
  winnerTeam,
  useLiveStats = true,
}: TeamOverviewProps) {
  const team1 = team1Override ?? lobby.team1;
  const team2 = team2Override ?? lobby.team2;

  const lobbyUsers = useLobbyUsers();
  const [liveUsers, setLiveUsers] = useState<Record<string, UserProfile>>({});

  const playerUids = useMemo(
    () => [...new Set([...team1, ...team2].map((player) => player.uid))],
    [team1, team2]
  );

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
    <div className="min-w-0 space-y-3">
      <div
        className={cn(
          "grid min-w-0 items-center text-center",
          compact
            ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
            : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4"
        )}
      >
        <TeamColumnLabel team={1} winnerTeam={winnerTeam} compact={compact} />
        <span aria-hidden="true" />
        <TeamColumnLabel team={2} winnerTeam={winnerTeam} compact={compact} />
      </div>

      {REVEAL_ROLE_ORDER.map((role) => {
        const p1 = resolvePlayer(team1.find((player) => player.role === role));
        const p2 = resolvePlayer(team2.find((player) => player.role === role));
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
