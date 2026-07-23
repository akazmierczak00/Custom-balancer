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
  showRolePriorities?: boolean;
}

interface RoleRevealRowProps {
  role: LoLRole;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  highlighted?: boolean;
  featured?: boolean;
  compact?: boolean;
  currentUid?: string;
  showRolePriorities?: boolean;
}

function RoleRevealRow({
  role,
  team1,
  team2,
  highlighted,
  featured,
  compact,
  currentUid,
  showRolePriorities = false,
}: RoleRevealRowProps) {
  const p1 = team1.find((p) => p.role === role);
  const p2 = team2.find((p) => p.role === role);

  return (
    <div
      className={cn(
        "relative grid min-w-0 items-stretch animate-role-reveal-in",
        compact
          ? "grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)] gap-1"
          : "grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] gap-4",
        highlighted && !featured && "rounded-lg ring-2 ring-indigo-400/40",
        featured &&
          "rounded-xl bg-amber-500/10 ring-2 ring-amber-400/70 shadow-[0_0_24px_-8px_rgba(251,191,36,0.55)]"
      )}
    >
      {featured && (
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2",
            compact ? "-top-2" : "-top-2.5"
          )}
        >
          <span
            className={cn(
              "rounded-full border border-amber-400/50 bg-amber-950/90 font-semibold uppercase tracking-wide text-amber-200",
              compact ? "px-1.5 py-0.5 text-[8px]" : "px-2.5 py-0.5 text-[10px]"
            )}
          >
            Featured Matchup
          </span>
        </div>
      )}
      <div className="min-w-0 overflow-hidden">
        <PlayerBanner
          player={p1}
          role={role}
          isCurrentUser={p1?.uid === currentUid}
          mirrored
          compact={compact}
          showRolePriorities={showRolePriorities}
          className={cn("h-full", featured && "ring-1 ring-amber-400/30")}
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn(
            "text-center font-semibold",
            featured ? "text-amber-200" : "text-slate-300",
            compact ? "text-[10px] leading-tight" : "text-sm"
          )}
        >
          {getRoleLabel(role)}
        </span>
        {featured && (
          <span
            className={cn(
              "font-bold uppercase tracking-wider text-amber-400/90",
              compact ? "text-[8px]" : "text-[10px]"
            )}
          >
            vs
          </span>
        )}
      </div>
      <div className="min-w-0 overflow-hidden">
        <PlayerBanner
          player={p2}
          role={role}
          isCurrentUser={p2?.uid === currentUid}
          compact={compact}
          showRolePriorities={showRolePriorities}
          className={cn("h-full", featured && "ring-1 ring-amber-400/30")}
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
  currentRole: LoLRole;
  lobby: Lobby;
  compact?: boolean;
  currentUid?: string;
  showRolePriorities?: boolean;
}

function ProposalRevealColumn({
  label,
  labelClassName,
  borderClassName,
  team1,
  team2,
  revealedRoles,
  currentRole,
  lobby,
  compact = false,
  currentUid,
  showRolePriorities = false,
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
      <div className={cn("space-y-2", compact ? "pt-1" : "pt-2")}>
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            highlighted={role === currentRole}
            featured={isFeaturedRole(role, team1, team2, lobby)}
            compact={compact}
            currentUid={currentUid}
            showRolePriorities={showRolePriorities}
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
    return (
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <ProposalRevealColumn
          label="Propozycja A"
          labelClassName="text-indigo-300"
          borderClassName="border-indigo-500/30"
          team1={lobby.proposalA.team1}
          team2={lobby.proposalA.team2}
          revealedRoles={revealedRoles}
          currentRole={currentRole}
          lobby={lobby}
          compact
          currentUid={currentUid}
          showRolePriorities={showRolePriorities}
        />
        <ProposalRevealColumn
          label="Propozycja B"
          labelClassName="text-purple-300"
          borderClassName="border-purple-500/30"
          team1={lobby.proposalB.team1}
          team2={lobby.proposalB.team2}
          revealedRoles={revealedRoles}
          currentRole={currentRole}
          lobby={lobby}
          compact
          currentUid={currentUid}
          showRolePriorities={showRolePriorities}
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
      <div className="space-y-3 pt-1">
        {revealedRoles.map((role) => (
          <RoleRevealRow
            key={role}
            role={role}
            team1={team1}
            team2={team2}
            highlighted={role === currentRole}
            featured={isFeaturedRole(role, team1, team2, lobby)}
            currentUid={currentUid}
            showRolePriorities={showRolePriorities}
          />
        ))}
      </div>
    </div>
  );
}
