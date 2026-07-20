import {
  BalanceMode,
  LobbyPlayer,
  PlayerAssignment,
  TeamProposal,
  LoLRole,
} from "@/types";
import { getRankPoints } from "@/lib/constants/ranks";
import { formatRolePriorities } from "@/lib/constants/roles";
import { normalizeBalanceMode } from "@/lib/constants/balance-modes";

const ALL_ROLES: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];

function playerPoints(player: LobbyPlayer): number {
  return getRankPoints(player.rank, player.rankDivision, player.rankLp);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function partitionScore(team: LobbyPlayer[], avgPerTeam: number): number {
  const sum = team.reduce((acc, p) => acc + playerPoints(p), 0);
  return Math.abs(sum - avgPerTeam);
}

function getPriorityList(player: LobbyPlayer): LoLRole[] {
  return [...player.rolePriorities]
    .sort((a, b) => a.priority - b.priority)
    .flatMap((g) => g.roles);
}

function getRolePriorityGroup(
  player: LobbyPlayer,
  role: LoLRole
): { priority: number; roles: LoLRole[] } | undefined {
  return player.rolePriorities.find((group) => group.roles.includes(role));
}

/**
 * Siła preferencji roli.
 * Role w tym samym priorytecie (=) dzielą punkty — kto ma wyraźne ">"
 * (jedna rola w grupie) wygrywa z kimś, kto ma "A = B = C".
 */
function rolePreferenceScore(player: LobbyPlayer, role: LoLRole): number {
  const group = getRolePriorityGroup(player, role);
  if (!group || group.roles.length === 0) return 0;

  const base = (6 - group.priority) * 10;
  return base / group.roles.length;
}

function teamPointsSum(team: LobbyPlayer[]): number {
  return team.reduce((acc, p) => acc + playerPoints(p), 0);
}

/** Klasyczny podział — bez zmian względem poprzedniej wersji. */
export function generateBalancedTeams(
  players: LobbyPlayer[],
  maxDeviation = 4,
  attempts = 200
): { team1: LobbyPlayer[]; team2: LobbyPlayer[] } {
  if (players.length !== 10) {
    throw new Error("Wymagane jest dokładnie 10 graczy");
  }

  const totalPoints = players.reduce((acc, p) => acc + playerPoints(p), 0);
  const avgPerTeam = totalPoints / 2;

  const candidates: { team1: LobbyPlayer[]; team2: LobbyPlayer[]; score: number }[] =
    [];

  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle(players);
    const team1 = shuffled.slice(0, 5);
    const team2 = shuffled.slice(5, 10);
    const team1Sum = team1.reduce((acc, p) => acc + playerPoints(p), 0);
    const team2Sum = team2.reduce((acc, p) => acc + playerPoints(p), 0);

    if (
      Math.abs(team1Sum - avgPerTeam) > maxDeviation ||
      Math.abs(team2Sum - avgPerTeam) > maxDeviation
    ) {
      continue;
    }

    const score = partitionScore(team1, avgPerTeam) + partitionScore(team2, avgPerTeam);
    candidates.push({ team1, team2, score });
  }

  if (candidates.length === 0) {
    const shuffled = shuffle(players);
    return { team1: shuffled.slice(0, 5), team2: shuffled.slice(5, 10) };
  }

  candidates.sort((a, b) => a.score - b.score);
  const topN = candidates.slice(0, Math.min(10, candidates.length));
  const pick = topN[Math.floor(Math.random() * topN.length)];
  return { team1: pick.team1, team2: pick.team2 };
}

function pickRoleForPlayer(
  player: LobbyPlayer,
  takenRoles: Set<LoLRole>
): LoLRole {
  const priorities = getPriorityList(player);

  for (const role of priorities) {
    if (!takenRoles.has(role)) {
      return role;
    }
  }

  const available = ALL_ROLES.filter((r) => !takenRoles.has(r));
  return available[0] ?? ALL_ROLES[0];
}

function toAssignment(player: LobbyPlayer, role: LoLRole): PlayerAssignment {
  return {
    uid: player.uid,
    nick: player.nick,
    rank: player.rank,
    ...(player.rankDivision ? { rankDivision: player.rankDivision } : {}),
    ...(player.rankLp !== undefined ? { rankLp: player.rankLp } : {}),
    role,
    wins: player.wins,
    losses: player.losses,
    rolePrioritiesLabel: formatRolePriorities(player.rolePriorities),
    matchHistory: player.matchHistory,
  };
}

/** Klasyczne przypisanie ról: od najniższej rangi, pierwsza wolna rola z priorytetu. */
export function assignRoles(
  team1: LobbyPlayer[],
  team2: LobbyPlayer[]
): TeamProposal {
  const assignTeam = (team: LobbyPlayer[]): PlayerAssignment[] => {
    const sorted = [...team].sort((a, b) => playerPoints(a) - playerPoints(b));
    const taken = new Set<LoLRole>();
    const assignments: PlayerAssignment[] = [];

    for (const player of sorted) {
      const role = pickRoleForPlayer(player, taken);
      taken.add(role);
      assignments.push(toAssignment(player, role));
    }

    return assignments;
  };

  return {
    team1: assignTeam(team1),
    team2: assignTeam(team2),
  };
}

function permuteRoles(roles: LoLRole[]): LoLRole[][] {
  if (roles.length <= 1) return [roles];
  const result: LoLRole[][] = [];
  for (let i = 0; i < roles.length; i++) {
    const rest = [...roles.slice(0, i), ...roles.slice(i + 1)];
    for (const perm of permuteRoles(rest)) {
      result.push([roles[i]!, ...perm]);
    }
  }
  return result;
}

const ROLE_PERMUTATIONS = permuteRoles(ALL_ROLES);

/** Optymalne role (max sumy preferencji) — do trybów score/roles/fair_lanes. */
function assignRolesOptimal(team: LobbyPlayer[]): PlayerAssignment[] {
  let bestScore = -Infinity;
  let bestRoles: LoLRole[] = ALL_ROLES;

  for (const roles of ROLE_PERMUTATIONS) {
    let score = 0;
    for (let i = 0; i < team.length; i++) {
      score += rolePreferenceScore(team[i]!, roles[i]!);
    }
    if (score > bestScore) {
      bestScore = score;
      bestRoles = roles;
    }
  }

  return team.map((player, index) => toAssignment(player, bestRoles[index]!));
}

function enumeratePartitions(
  players: LobbyPlayer[]
): { team1: LobbyPlayer[]; team2: LobbyPlayer[] }[] {
  const partitions: { team1: LobbyPlayer[]; team2: LobbyPlayer[] }[] = [];
  const n = players.length;
  const target = n / 2;
  const indices = players.map((_, i) => i);

  function walk(start: number, chosen: number[]) {
    if (chosen.length === target) {
      const team1Set = new Set(chosen);
      const team1 = chosen.map((i) => players[i]!);
      const team2 = indices.filter((i) => !team1Set.has(i)).map((i) => players[i]!);
      // Unikaj lustrzanych duplikatów (team1/team2 swap)
      const key1 = team1
        .map((p) => p.uid)
        .sort()
        .join(",");
      const key2 = team2
        .map((p) => p.uid)
        .sort()
        .join(",");
      if (key1 < key2) {
        partitions.push({ team1, team2 });
      }
      return;
    }

    for (let i = start; i < n; i++) {
      chosen.push(i);
      walk(i + 1, chosen);
      chosen.pop();
    }
  }

  walk(0, []);
  return partitions;
}

function softConstraintPenalty(
  team1: LobbyPlayer[],
  team2: LobbyPlayer[],
  proposal: TeamProposal
): number {
  let penalty = 0;

  const byPoints = [...team1, ...team2].sort(
    (a, b) => playerPoints(b) - playerPoints(a)
  );
  const top2 = byPoints.slice(0, 2);
  if (top2.length === 2) {
    const sameTeam =
      (team1.some((p) => p.uid === top2[0]!.uid) &&
        team1.some((p) => p.uid === top2[1]!.uid)) ||
      (team2.some((p) => p.uid === top2[0]!.uid) &&
        team2.some((p) => p.uid === top2[1]!.uid));
    if (sameTeam) penalty += 4;
  }

  for (const assignment of [...proposal.team1, ...proposal.team2]) {
    const player = [...team1, ...team2].find((p) => p.uid === assignment.uid);
    if (!player) continue;
    const group = getRolePriorityGroup(player, assignment.role);
    if (!group || group.priority >= 4) penalty += 2;
  }

  return penalty;
}

function roleQuality(proposal: TeamProposal, players: LobbyPlayer[]): number {
  const byUid = new Map(players.map((p) => [p.uid, p]));
  let total = 0;
  for (const assignment of [...proposal.team1, ...proposal.team2]) {
    const player = byUid.get(assignment.uid);
    if (!player) continue;
    total += rolePreferenceScore(player, assignment.role);
  }
  return total;
}

function laneFairness(proposal: TeamProposal): number {
  let diff = 0;
  for (const role of ALL_ROLES) {
    const a = proposal.team1.find((p) => p.role === role);
    const b = proposal.team2.find((p) => p.role === role);
    if (!a || !b) continue;
    diff += Math.abs(
      getRankPoints(a.rank, a.rankDivision, a.rankLp) -
        getRankPoints(b.rank, b.rankDivision, b.rankLp)
    );
  }
  return diff;
}

type ScoredCandidate = {
  proposal: TeamProposal;
  cost: number;
};

function scoreCandidate(
  mode: BalanceMode,
  team1: LobbyPlayer[],
  team2: LobbyPlayer[],
  proposal: TeamProposal,
  allPlayers: LobbyPlayer[]
): number {
  const rankDiff = Math.abs(teamPointsSum(team1) - teamPointsSum(team2));
  const quality = roleQuality(proposal, allPlayers);
  const soft = softConstraintPenalty(team1, team2, proposal);
  const lanes = laneFairness(proposal);

  switch (mode) {
    case "roles":
      return -quality * 12 + rankDiff * 2 + soft;
    case "score":
      return rankDiff * 3 - quality * 4 + soft;
    case "fair_lanes":
      return lanes * 2.5 + rankDiff * 1.5 - quality * 2 + soft;
    case "chaos":
      return rankDiff * 0.5 - quality + soft * 0.25 + Math.random() * 8;
    default:
      return rankDiff + soft;
  }
}

function pickFromTop(candidates: ScoredCandidate[], topN: number): TeamProposal {
  candidates.sort((a, b) => a.cost - b.cost);
  const slice = candidates.slice(0, Math.min(topN, candidates.length));
  return slice[Math.floor(Math.random() * slice.length)]!.proposal;
}

function buildScoredProposal(
  players: LobbyPlayer[],
  mode: BalanceMode
): TeamProposal {
  const partitions = enumeratePartitions(players);
  const candidates: ScoredCandidate[] = [];

  const avg =
    players.reduce((acc, p) => acc + playerPoints(p), 0) / 2;
  const maxRankDiff = mode === "chaos" ? 12 : mode === "roles" ? 8 : 6;

  for (const { team1, team2 } of partitions) {
    const rankDiff = Math.abs(teamPointsSum(team1) - teamPointsSum(team2));
    if (rankDiff > maxRankDiff) continue;

    const proposal = {
      team1: assignRolesOptimal(team1),
      team2: assignRolesOptimal(team2),
    };
    candidates.push({
      proposal,
      cost: scoreCandidate(mode, team1, team2, proposal, players),
    });
  }

  if (candidates.length === 0) {
    // Fallback: wszystkie partycje bez limitu rankDiff
    for (const { team1, team2 } of partitions) {
      const proposal = {
        team1: assignRolesOptimal(team1),
        team2: assignRolesOptimal(team2),
      };
      candidates.push({
        proposal,
        cost: scoreCandidate(mode, team1, team2, proposal, players) +
          Math.abs(teamPointsSum(team1) - avg),
      });
    }
  }

  const topN = mode === "chaos" ? 25 : mode === "roles" ? 8 : 10;
  return pickFromTop(candidates, topN);
}

export function proposalsAreEqual(a: TeamProposal, b: TeamProposal): boolean {
  return proposalFingerprint(a) === proposalFingerprint(b);
}

/** Fingerprint niezależny od zamiany Team1/Team2. */
function proposalFingerprint(proposal: TeamProposal): string {
  const teamKey = (team: PlayerAssignment[]) =>
    [...team]
      .map((player) => `${player.uid}:${player.role}`)
      .sort()
      .join(",");

  return [teamKey(proposal.team1), teamKey(proposal.team2)].sort().join("|");
}

function isProposalForbidden(
  proposal: TeamProposal,
  forbidden: TeamProposal[]
): boolean {
  return forbidden.some((entry) => proposalsAreEqual(proposal, entry));
}

function generateProposalDifferentFrom(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined,
  forbidden: TeamProposal[],
  maxAttempts: number
): TeamProposal {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proposal = buildFullProposal(players, mode);
    if (!isProposalForbidden(proposal, forbidden)) {
      return proposal;
    }
  }

  return buildFullProposal(players, mode);
}

export function buildFullProposal(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined = "classic"
): TeamProposal {
  const resolved = normalizeBalanceMode(mode);

  if (resolved === "classic") {
    const { team1, team2 } = generateBalancedTeams(players);
    return assignRoles(team1, team2);
  }

  return buildScoredProposal(players, resolved);
}

export function generateDistinctProposals(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined = "classic",
  options?: {
    /** Składy, których A/B nie mogą powtórzyć (np. oryginalne losowanie). */
    exclude?: TeamProposal[];
    maxAttempts?: number;
  }
): { proposalA: TeamProposal; proposalB: TeamProposal } {
  const maxAttempts = options?.maxAttempts ?? 80;
  const excluded = options?.exclude ?? [];

  const proposalA = generateProposalDifferentFrom(
    players,
    mode,
    excluded,
    maxAttempts
  );
  const proposalB = generateProposalDifferentFrom(
    players,
    mode,
    [...excluded, proposalA],
    maxAttempts
  );

  return { proposalA, proposalB };
}

export function getTeamPointsFromAssignments(team: PlayerAssignment[]): number {
  return team.reduce(
    (acc, p) => acc + getRankPoints(p.rank, p.rankDivision, p.rankLp),
    0
  );
}
