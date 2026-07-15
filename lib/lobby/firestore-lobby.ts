import { normalizeDrawnWeaknesses } from "@/lib/algorithms/drawWeaknesses";
import { formatRolePriorities } from "@/lib/constants/roles";
import {
  Lobby,
  LobbyWeaknesses,
  PlayerAssignment,
  RolePriorityGroup,
  TeamProposal,
} from "@/types";

type LegacyPlayerAssignment = PlayerAssignment & {
  rolePriorities?: RolePriorityGroup[];
};

export function toFirestorePlayerAssignment(
  player: LegacyPlayerAssignment
): PlayerAssignment {
  const rolePrioritiesLabel =
    player.rolePrioritiesLabel ??
    (player.rolePriorities?.length
      ? formatRolePriorities(player.rolePriorities)
      : undefined);

  return {
    uid: player.uid,
    nick: player.nick,
    rank: player.rank,
    role: player.role,
    matchHistory: player.matchHistory ?? [],
    ...(player.wins !== undefined ? { wins: player.wins } : {}),
    ...(player.losses !== undefined ? { losses: player.losses } : {}),
    ...(rolePrioritiesLabel ? { rolePrioritiesLabel } : {}),
  };
}

export function toFirestoreTeam(team: LegacyPlayerAssignment[]): PlayerAssignment[] {
  return team.map(toFirestorePlayerAssignment);
}

export function toFirestoreProposal(proposal: TeamProposal): TeamProposal {
  return {
    team1: toFirestoreTeam(proposal.team1),
    team2: toFirestoreTeam(proposal.team2),
  };
}

export function toFirestoreWeaknesses(weaknesses: LobbyWeaknesses): LobbyWeaknesses {
  return {
    selected: weaknesses.selected ?? [],
    pointsTotal: weaknesses.pointsTotal ?? 3,
    pointsSpent: weaknesses.pointsSpent ?? 0,
    selectorUid: weaknesses.selectorUid ?? null,
    confirmed: weaknesses.confirmed ?? false,
    revealIndex: weaknesses.revealIndex ?? 0,
    drawn: normalizeDrawnWeaknesses(weaknesses.drawn as never),
    ...(weaknesses.championPool ? { championPool: weaknesses.championPool } : {}),
  };
}

export function normalizePlayerAssignment(
  raw: LegacyPlayerAssignment
): PlayerAssignment {
  return toFirestorePlayerAssignment(raw);
}

export function normalizeTeamProposal(proposal: TeamProposal): TeamProposal {
  return toFirestoreProposal(proposal);
}

export function normalizeLobby(data: Lobby): Lobby {
  return {
    ...data,
    presentUids: data.presentUids ?? {},
    roundHistory: (data.roundHistory ?? []).map((round) => ({
      ...round,
      team1: round.team1?.map(normalizePlayerAssignment) ?? [],
      team2: round.team2?.map(normalizePlayerAssignment) ?? [],
    })),
    team1: data.team1?.map(normalizePlayerAssignment) ?? [],
    team2: data.team2?.map(normalizePlayerAssignment) ?? [],
    proposalA: data.proposalA ? normalizeTeamProposal(data.proposalA) : null,
    proposalB: data.proposalB ? normalizeTeamProposal(data.proposalB) : null,
    weaknesses: data.weaknesses
      ? toFirestoreWeaknesses(data.weaknesses)
      : data.weaknesses,
  };
}
