"use client";

import { getRoleLabel, REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { getProposalLabel } from "@/lib/constants/proposals";
import { cn } from "@/lib/utils";
import { Lobby, LoLRole, PlayerAssignment, TeamProposal } from "@/types";
import { PlayerBanner } from "@/components/profile/player-banner";

interface RoleRevealProps {
  lobby: Lobby;
  proposal?: TeamProposal | null;
  dual?: boolean;
  currentUid?: string;
  showRolePriorities?: boolean;
}

interface RoleRevealRowProps {
  role: LoLRole;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  featured?: boolean;
  /** Pełny banner (zwykły reveal). */
  dense?: boolean;
  currentUid?: string;
  showRolePriorities?: boolean;
}

function RoleRevealRow({
  role,
  team1,
  team2,
  featured,
  dense = false,
  currentUid,
  showRolePriorities = false,
}: RoleRevealRowProps) {
  const p1 = team1.find((p) => p.role === role);
  const p2 = team2.find((p) => p.role === role);

  return (
    <div
      className={cn(
        "relative grid min-w-0 items-stretch animate-role-reveal-in",
        dense
          ? "grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-1.5"
          : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4",
        featured &&
          "rounded-lg bg-amber-500/10 ring-2 ring-amber-400/70 shadow-[0_0_20px_-8px_rgba(251,191,36,0.5)]",
        featured && dense && "px-0.5 py-0.5"
      )}
    >
      {featured && !dense && (
        <div className="pointer-events-none absolute left-1/2 z-10 -top-2 -translate-x-1/2">
          <span className="rounded-full border border-amber-400/50 bg-amber-950/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Featured
          </span>
        </div>
      )}
      <div className="min-w-0">
        <PlayerBanner
          player={p1}
          role={role}
          isCurrentUser={p1?.uid === currentUid}
          mirrored={!dense}
          dense={dense}
          showRolePriorities={showRolePriorities && !dense}
          className="h-full"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn(
            "text-center font-semibold",
            featured ? "text-amber-200" : dense ? "text-slate-200" : "text-slate-300",
            dense ? "text-[11px] leading-tight" : "text-sm"
          )}
        >
          {getRoleLabel(role)}
        </span>
        {featured && (
          <span
            className={cn(
              "font-bold uppercase tracking-wider text-amber-400/90",
              dense ? "text-[8px]" : "text-[10px]"
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
          isCurrentUser={p2?.uid === currentUid}
          dense={dense}
          showRolePriorities={showRolePriorities && !dense}
          className="h-full"
        />
      </div>
    </div>
  );
}

function isFeaturedRole(
  role: LoLRole,
  team1: PlayerAssignment[],
  team2: PlayerAssignment[],
  lobby: Lobby
): boolean {
  const matchup = lobby.featuredMatchup;
  if (!matchup || matchup.role !== role) return false;

  const p1 = team1.find((p) => p.role === role);
  const p2 = team2.find((p) => p.role === role);
  if (!p1 || !p2) return false;

  const uids = new Set([p1.uid, p2.uid]);
  return uids.has(matchup.uidA) && uids.has(matchup.uidB);
}

interface ProposalRevealColumnProps {
  label: string;
  labelClassName: string;
  borderClassName: string;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  revealedRoles: LoLRole[];
  lobby: Lobby;
  currentUid?: string;
}

function ProposalRevealColumn({
  label,
  labelClassName,
  borderClassName,
  team1,
  team2,
  revealedRoles,
  lobby,
  currentUid,
}: ProposalRevealColumnProps) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-2.5 rounded-xl border bg-slate-950/30 p-3 sm:p-4",
        borderClassName
      )}
    >
      <p className={cn("text-center text-sm font-semibold sm:text-base", labelClassName)}>
        {label}
      </p>
      <div className="space-y-2 pt-1">
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            featured={isFeaturedRole(role, team1, team2, lobby)}
            dense
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
  showRolePriorities = false,
}: RoleRevealProps) {
  const roleIndex = lobby.revealRoleIndex;
  const currentRole = REVEAL_ROLE_ORDER[roleIndex];
  const revealedRoles = REVEAL_ROLE_ORDER.slice(0, roleIndex + 1);

  if (!currentRole) return null;

  if (dual && lobby.proposalA && lobby.proposalB) {
    const hasC = !!lobby.proposalC;
    return (
      <div
        className={cn(
          "grid gap-4",
          hasC ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 md:gap-6"
        )}
      >
        <ProposalRevealColumn
          label={`Propozycja ${getProposalLabel("A")}`}
          labelClassName="text-sky-300"
          borderClassName="border-sky-500/40"
          team1={lobby.proposalA.team1}
          team2={lobby.proposalA.team2}
          revealedRoles={revealedRoles}
          lobby={lobby}
          currentUid={currentUid}
        />
        <ProposalRevealColumn
          label={`Propozycja ${getProposalLabel("B")}`}
          labelClassName="text-teal-300"
          borderClassName="border-teal-500/40"
          team1={lobby.proposalB.team1}
          team2={lobby.proposalB.team2}
          revealedRoles={revealedRoles}
          lobby={lobby}
          currentUid={currentUid}
        />
        {lobby.proposalC && (
          <ProposalRevealColumn
            label={`Propozycja ${getProposalLabel("C")}`}
            labelClassName="text-violet-300"
            borderClassName="border-violet-500/40"
            team1={lobby.proposalC.team1}
            team2={lobby.proposalC.team2}
            revealedRoles={revealedRoles}
            lobby={lobby}
            currentUid={currentUid}
          />
        )}
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
      <div className="space-y-3 pt-1">
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            featured={isFeaturedRole(role, team1, team2, lobby)}
            currentUid={currentUid}
            showRolePriorities={showRolePriorities}
          />
        ))}
      </div>
    </div>
  );
}
