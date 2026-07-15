"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { Lobby, LoLRole, PlayerAssignment, TeamProposal } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface RoleRevealProps {
  lobby: Lobby;
  proposal?: TeamProposal | null;
  dual?: boolean;
  currentUid?: string;
}

interface RoleRevealRowProps {
  role: LoLRole;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  highlighted?: boolean;
  compact?: boolean;
  currentUid?: string;
}

function RoleRevealRow({
  role,
  team1,
  team2,
  highlighted,
  compact,
  currentUid,
}: RoleRevealRowProps) {
  const p1 = team1.find((p) => p.role === role);
  const p2 = team2.find((p) => p.role === role);

  return (
    <div
      className={cn(
        "grid min-w-0 items-stretch",
        compact
          ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
          : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4",
        highlighted && "rounded-lg ring-2 ring-indigo-400/40"
      )}
    >
      <div className="min-w-0 overflow-hidden">
        <PlayerBanner
          player={p1}
          role={role}
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
          isCurrentUser={p2?.uid === currentUid}
          compact={compact}
          className="h-full"
        />
      </div>
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
  compact?: boolean;
  currentUid?: string;
}

function ProposalRevealColumn({
  label,
  labelClassName,
  borderClassName,
  team1,
  team2,
  revealedRoles,
  currentRole,
  compact = false,
  currentUid,
}: ProposalRevealColumnProps) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-3 overflow-hidden rounded-xl border p-3",
        compact && "p-2",
        borderClassName
      )}
    >
      <p className={cn("text-center font-semibold", labelClassName)}>{label}</p>
      <div className="space-y-2">
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            highlighted={role === currentRole}
            compact={compact}
            currentUid={currentUid}
          />
        ))}
      </div>
    </div>
  );
}

export function RoleReveal({
  lobby,
  proposal,
  dual = false,
  currentUid,
}: RoleRevealProps) {
  const roleIndex = lobby.revealRoleIndex;
  const currentRole = REVEAL_ROLE_ORDER[roleIndex];
  const revealedRoles = REVEAL_ROLE_ORDER.slice(0, roleIndex + 1);

  if (!currentRole) return null;

  if (dual && lobby.proposalA && lobby.proposalB) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <ProposalRevealColumn
            label="Propozycja A"
            labelClassName="text-indigo-300"
            borderClassName="border-indigo-500/30"
            team1={lobby.proposalA.team1}
            team2={lobby.proposalA.team2}
            revealedRoles={revealedRoles}
            currentRole={currentRole}
            compact
            currentUid={currentUid}
          />
        <ProposalRevealColumn
          label="Propozycja B"
          labelClassName="text-purple-300"
          borderClassName="border-purple-500/30"
          team1={lobby.proposalB.team1}
          team2={lobby.proposalB.team2}
          revealedRoles={revealedRoles}
          currentRole={currentRole}
          compact
          currentUid={currentUid}
        />
      </div>
    );
  }

  const team1 = proposal?.team1 ?? lobby.team1;
  const team2 = proposal?.team2 ?? lobby.team2;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] items-center gap-4 text-center">
        <h3 className="text-xl font-bold text-indigo-300">Team 1</h3>
        <span aria-hidden="true" />
        <h3 className="text-xl font-bold text-purple-300">Team 2</h3>
      </div>
      {revealedRoles.map((role) => (
        <RoleRevealRow
          key={role}
          role={role}
          team1={team1}
          team2={team2}
          highlighted={role === currentRole}
          currentUid={currentUid}
        />
      ))}
    </div>
  );
}
