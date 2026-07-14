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
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
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
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-4"
          >
            <PlayerBanner
              player={p1}
              role={role}
              voted={p1 ? !!votes?.[p1.uid] : false}
            />
            <span className="text-center font-semibold text-slate-300">
              {getRoleLabel(role)}
            </span>
            <PlayerBanner
              player={p2}
              role={role}
              voted={p2 ? !!votes?.[p2.uid] : false}
            />
          </div>
        );
      })}
    </div>
  );
}
