"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { Lobby, TeamProposal } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface RoleRevealProps {
  lobby: Lobby;
  proposal?: TeamProposal | null;
  dual?: boolean;
}

export function RoleReveal({ lobby, proposal, dual = false }: RoleRevealProps) {
  const roleIndex = lobby.revealRoleIndex;
  const currentRole = REVEAL_ROLE_ORDER[roleIndex];

  if (!currentRole) return null;

  const getPlayerForRole = (team: TeamProposal["team1"], role: typeof currentRole) =>
    team.find((p) => p.role === role);

  if (dual && lobby.proposalA && lobby.proposalB) {
    const p1a = getPlayerForRole(lobby.proposalA.team1, currentRole);
    const p2a = getPlayerForRole(lobby.proposalA.team2, currentRole);
    const p1b = getPlayerForRole(lobby.proposalB.team1, currentRole);
    const p2b = getPlayerForRole(lobby.proposalB.team2, currentRole);

    return (
      <div className="space-y-6 text-center">
        <h2 className="text-4xl font-bold text-indigo-300">
          {getRoleLabel(currentRole)}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-indigo-500/30 p-4">
            <p className="font-semibold text-indigo-300">Propozycja A</p>
            <div className="grid gap-3 md:grid-cols-2">
              <PlayerBanner player={p1a} role={currentRole} />
              <span className="self-center text-2xl font-bold text-slate-500">VS</span>
              <PlayerBanner player={p2a} role={currentRole} />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-purple-500/30 p-4">
            <p className="font-semibold text-purple-300">Propozycja B</p>
            <div className="grid gap-3 md:grid-cols-2">
              <PlayerBanner player={p1b} role={currentRole} />
              <span className="self-center text-2xl font-bold text-slate-500">VS</span>
              <PlayerBanner player={p2b} role={currentRole} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const p1 = getPlayerForRole(lobby.team1, currentRole);
  const p2 = getPlayerForRole(lobby.team2, currentRole);

  return (
    <div className="space-y-8 text-center">
      <h2 className="text-5xl font-bold text-indigo-300">
        {getRoleLabel(currentRole)}
      </h2>
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <PlayerBanner player={p1} role={currentRole} />
        <span className="text-3xl font-bold text-slate-500">VS</span>
        <PlayerBanner player={p2} role={currentRole} />
      </div>
    </div>
  );
}
