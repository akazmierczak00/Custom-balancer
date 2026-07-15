"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { Lobby, LoLRole, PlayerAssignment, TeamProposal } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface RoleRevealProps {
  lobby: Lobby;
  proposal?: TeamProposal | null;
  dual?: boolean;
}

interface RoleRevealRowProps {
  role: LoLRole;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  highlighted?: boolean;
}

function RoleRevealRow({ role, team1, team2, highlighted }: RoleRevealRowProps) {
  const p1 = team1.find((p) => p.role === role);
  const p2 = team2.find((p) => p.role === role);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-stretch gap-4",
        highlighted && "rounded-lg ring-2 ring-indigo-400/40"
      )}
    >
      <PlayerBanner player={p1} role={role} mirrored className="h-full" />
      <div className="flex items-center justify-center">
        <span className="text-center text-sm font-semibold text-slate-300">
          {getRoleLabel(role)}
        </span>
      </div>
      <PlayerBanner player={p2} role={role} className="h-full" />
    </div>
  );
}

interface ProposalRevealColumnProps {
  label: string;
  labelClassName: string;
  borderClassName: string;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  revealedRoles: LoLRole[];
  currentRole: LoLRole;
}

function ProposalRevealColumn({
  label,
  labelClassName,
  borderClassName,
  team1,
  team2,
  revealedRoles,
  currentRole,
}: ProposalRevealColumnProps) {
  return (
    <div className={cn("space-y-3 rounded-xl border p-4", borderClassName)}>
      <p className={cn("text-center font-semibold", labelClassName)}>{label}</p>
      <div className="space-y-3">
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            highlighted={role === currentRole}
          />
        ))}
      </div>
    </div>
  );
}

export function RoleReveal({ lobby, proposal, dual = false }: RoleRevealProps) {
  const roleIndex = lobby.revealRoleIndex;
  const currentRole = REVEAL_ROLE_ORDER[roleIndex];
  const revealedRoles = REVEAL_ROLE_ORDER.slice(0, roleIndex + 1);
  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);

  if (!currentRole) return null;

  const roleHeader = (
    <div className="space-y-2 text-center">
      {remaining > 0 && (
        <p className="text-5xl font-bold text-indigo-400">{remaining}s</p>
      )}
      <h2 className="text-4xl font-bold text-indigo-300 md:text-5xl">
        {getRoleLabel(currentRole)}
      </h2>
    </div>
  );

  if (dual && lobby.proposalA && lobby.proposalB) {
    return (
      <div className="space-y-6">
        {roleHeader}
        <div className="grid gap-6 md:grid-cols-2">
          <ProposalRevealColumn
            label="Propozycja A"
            labelClassName="text-indigo-300"
            borderClassName="border-indigo-500/30"
            team1={lobby.proposalA.team1}
            team2={lobby.proposalA.team2}
            revealedRoles={revealedRoles}
            currentRole={currentRole}
          />
          <ProposalRevealColumn
            label="Propozycja B"
            labelClassName="text-purple-300"
            borderClassName="border-purple-500/30"
            team1={lobby.proposalB.team1}
            team2={lobby.proposalB.team2}
            revealedRoles={revealedRoles}
            currentRole={currentRole}
          />
        </div>
      </div>
    );
  }

  const team1 = proposal?.team1 ?? lobby.team1;
  const team2 = proposal?.team2 ?? lobby.team2;

  return (
    <div className="space-y-6">
      {roleHeader}
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-4 text-center">
          <h3 className="text-xl font-bold text-indigo-300">Team 1</h3>
          <span className="text-2xl font-bold text-slate-500">VS</span>
          <h3 className="text-xl font-bold text-purple-300">Team 2</h3>
        </div>
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            highlighted={role === currentRole}
          />
        ))}
      </div>
    </div>
  );
}
