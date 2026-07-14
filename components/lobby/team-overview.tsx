"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { Lobby } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface TeamOverviewProps {
  lobby: Lobby;
  votes?: Record<string, string>;
}

export function TeamOverview({ lobby, votes }: TeamOverviewProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-4 text-center">
        <h3 className="text-xl font-bold text-indigo-300">Team 1</h3>
        <span className="text-2xl font-bold text-slate-500">VS</span>
        <h3 className="text-xl font-bold text-purple-300">Team 2</h3>
      </div>

      {REVEAL_ROLE_ORDER.map((role) => {
        const p1 = lobby.team1.find((p) => p.role === role);
        const p2 = lobby.team2.find((p) => p.role === role);
        return (
          <div
            key={role}
            className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-stretch gap-4"
          >
            <PlayerBanner
              player={p1}
              role={role}
              voted={p1 ? !!votes?.[p1.uid] : false}
              mirrored
              className="h-full"
            />
            <div className="flex items-center justify-center">
              <span className="text-center text-sm font-semibold text-slate-300">
                {getRoleLabel(role)}
              </span>
            </div>
            <PlayerBanner
              player={p2}
              role={role}
              voted={p2 ? !!votes?.[p2.uid] : false}
              className="h-full"
            />
          </div>
        );
      })}
    </div>
  );
}
