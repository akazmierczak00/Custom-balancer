import {
  BalanceMode,
  FeaturedMatchup,
  LobbyPlayer,
  PlayerAssignment,
  TeamProposal,
  LoLRole,
} from "@/types";
import { getRankPoints } from "@/lib/constants/ranks";
import { formatRolePriorities } from "@/lib/constants/roles";
import { normalizeBalanceMode } from "@/lib/constants/balance-modes";

const ALL_ROLES: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];

export type BuildProposalOptions = {
  featuredMatchup?: FeaturedMatchup | null;
};

function normalizeFeaturedMatchup(
  players: LobbyPlayer[],
  matchup: FeaturedMatchup | null | undefined
): FeaturedMatchup | null {
  if (!matchup) return null;
  if (!ALL_ROLES.includes(matchup.role)) return null;
  if (!matchup.uidA || !matchup.uidB || matchup.uidA === matchup.uidB) {
    return null;
  }
  const a = players.find((p) => p.uid === matchup.uidA);
  const b = players.find((p) => p.uid === matchup.uidB);
  if (!a || !b) return null;
  return matchup;
}

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
  attempts = 200,
  featured: FeaturedMatchup | null = null
): { team1: LobbyPlayer[]; team2: LobbyPlayer[] } {
  if (players.length !== 10) {
    throw new Error("Wymagane jest dokładnie 10 graczy");
  }

  const totalPoints = players.reduce((acc, p) => acc + playerPoints(p), 0);
  const avgPerTeam = totalPoints / 2;

  const candidates: { team1: LobbyPlayer[]; team2: LobbyPlayer[]; score: number }[] =
    [];

  const playerA = featured
    ? players.find((p) => p.uid === featured.uidA)
    : undefined;
  const playerB = featured
    ? players.find((p) => p.uid === featured.uidB)
    : undefined;
  const rest = featured
    ? players.filter(
        (p) => p.uid !== featured.uidA && p.uid !== featured.uidB
      )
    : null;

  for (let i = 0; i < attempts; i++) {
    let team1: LobbyPlayer[];
    let team2: LobbyPlayer[];

    if (featured && playerA && playerB && rest && rest.length === 8) {
      const shuffledRest = shuffle(rest);
      const flip = Math.random() < 0.5;
      const sideA = flip ? playerA : playerB;
      const sideB = flip ? playerB : playerA;
      team1 = [sideA, ...shuffledRest.slice(0, 4)];
      team2 = [sideB, ...shuffledRest.slice(4, 8)];
    } else {
      const shuffled = shuffle(players);
      team1 = shuffled.slice(0, 5);
      team2 = shuffled.slice(5, 10);
    }

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
    if (featured && playerA && playerB && rest && rest.length === 8) {
      const shuffledRest = shuffle(rest);
      return {
        team1: [playerA, ...shuffledRest.slice(0, 4)],
        team2: [playerB, ...shuffledRest.slice(4, 8)],
      };
    }
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
  team2: LobbyPlayer[],
  featured: FeaturedMatchup | null = null
): TeamProposal {
  const assignTeam = (
    team: LobbyPlayer[],
    lockedUid: string | null
  ): PlayerAssignment[] => {
    const taken = new Set<LoLRole>();
    const assignments: PlayerAssignment[] = [];
    const remaining = [...team];

    if (featured && lockedUid) {
      const lockedPlayer = remaining.find((p) => p.uid === lockedUid);
      if (lockedPlayer) {
        assignments.push(toAssignment(lockedPlayer, featured.role));
        taken.add(featured.role);
        const idx = remaining.findIndex((p) => p.uid === lockedUid);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    remaining.sort((a, b) => playerPoints(a) - playerPoints(b));
    for (const player of remaining) {
      const role = pickRoleForPlayer(player, taken);
      taken.add(role);
      assignments.push(toAssignment(player, role));
    }

    return assignments;
  };

  const lock1 =
    featured && team1.some((p) => p.uid === featured.uidA || p.uid === featured.uidB)
      ? team1.find((p) => p.uid === featured.uidA || p.uid === featured.uidB)!.uid
      : null;
  const lock2 =
    featured && team2.some((p) => p.uid === featured.uidA || p.uid === featured.uidB)
      ? team2.find((p) => p.uid === featured.uidA || p.uid === featured.uidB)!.uid
      : null;

  return {
    team1: assignTeam(team1, lock1),
    team2: assignTeam(team2, lock2),
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
function assignRolesOptimal(
  team: LobbyPlayer[],
  locked?: { uid: string; role: LoLRole } | null
): PlayerAssignment[] {
  let bestScore = -Infinity;
  let bestRoles: LoLRole[] = ALL_ROLES;
  const lockedIndex = locked
    ? team.findIndex((p) => p.uid === locked.uid)
    : -1;

  for (const roles of ROLE_PERMUTATIONS) {
    if (lockedIndex >= 0 && locked && roles[lockedIndex] !== locked.role) {
      continue;
    }
    let score = 0;
    for (let i = 0; i < team.length; i++) {
      score += rolePreferenceScore(team[i]!, roles[i]!);
    }
    if (score > bestScore) {
      bestScore = score;
      bestRoles = roles;
    }
  }

  if (bestScore === -Infinity && locked && lockedIndex >= 0) {
    // Fallback: zablokuj rolę ręcznie, resztę optymalizuj.
    const freeRoles = ALL_ROLES.filter((r) => r !== locked.role);
    const freePlayers = team.filter((_, i) => i !== lockedIndex);
    const freeAssign = assignRolesOptimal(freePlayers);
    const byUid = new Map(freeAssign.map((a) => [a.uid, a.role]));
    return team.map((player) =>
      toAssignment(
        player,
        player.uid === locked.uid
          ? locked.role
          : (byUid.get(player.uid) ?? freeRoles[0]!)
      )
    );
  }

  return team.map((player, index) => toAssignment(player, bestRoles[index]!));
}

function lockForTeam(
  team: LobbyPlayer[],
  featured: FeaturedMatchup | null
): { uid: string; role: LoLRole } | null {
  if (!featured) return null;
  const player = team.find(
    (p) => p.uid === featured.uidA || p.uid === featured.uidB
  );
  if (!player) return null;
  return { uid: player.uid, role: featured.role };
}

function oppositeSides(
  team1: LobbyPlayer[],
  team2: LobbyPlayer[],
  featured: FeaturedMatchup
): boolean {
  const aIn1 = team1.some((p) => p.uid === featured.uidA);
  const bIn1 = team1.some((p) => p.uid === featured.uidB);
  const aIn2 = team2.some((p) => p.uid === featured.uidA);
  const bIn2 = team2.some((p) => p.uid === featured.uidB);
  return (aIn1 && bIn2) || (bIn1 && aIn2);
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
  mode: BalanceMode,
  featured: FeaturedMatchup | null = null
): TeamProposal {
  const partitions = enumeratePartitions(players).filter((part) =>
    featured ? oppositeSides(part.team1, part.team2, featured) : true
  );
  const candidates: ScoredCandidate[] = [];

  const avg =
    players.reduce((acc, p) => acc + playerPoints(p), 0) / 2;
  const maxRankDiff = mode === "chaos" ? 12 : mode === "roles" ? 8 : 6;

  const scorePartition = (
    team1: LobbyPlayer[],
    team2: LobbyPlayer[],
    extraCost = 0
  ) => {
    const proposal = {
      team1: assignRolesOptimal(team1, lockForTeam(team1, featured)),
      team2: assignRolesOptimal(team2, lockForTeam(team2, featured)),
    };
    candidates.push({
      proposal,
      cost:
        scoreCandidate(mode, team1, team2, proposal, players) + extraCost,
    });
  };

  for (const { team1, team2 } of partitions) {
    const rankDiff = Math.abs(teamPointsSum(team1) - teamPointsSum(team2));
    if (rankDiff > maxRankDiff) continue;
    scorePartition(team1, team2);
  }

  if (candidates.length === 0) {
    for (const { team1, team2 } of partitions) {
      scorePartition(team1, team2, Math.abs(teamPointsSum(team1) - avg));
    }
  }

  if (candidates.length === 0 && featured) {
    const { team1, team2 } = generateBalancedTeams(players, 4, 200, featured);
    return assignRoles(team1, team2, featured);
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
  maxAttempts: number,
  options?: BuildProposalOptions
): TeamProposal {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const proposal = buildFullProposal(players, mode, options);
    if (!isProposalForbidden(proposal, forbidden)) {
      return proposal;
    }
  }

  return buildFullProposal(players, mode, options);
}

export function buildFullProposal(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined = "classic",
  options?: BuildProposalOptions
): TeamProposal {
  const resolved = normalizeBalanceMode(mode);
  const featured = normalizeFeaturedMatchup(players, options?.featuredMatchup);

  if (resolved === "classic") {
    const { team1, team2 } = generateBalancedTeams(
      players,
      4,
      200,
      featured
    );
    return assignRoles(team1, team2, featured);
  }

  return buildScoredProposal(players, resolved, featured);
}

export function generateDistinctProposals(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined = "classic",
  options?: {
    /** Składy, których A/B nie mogą powtórzyć (np. oryginalne losowanie). */
    exclude?: TeamProposal[];
    maxAttempts?: number;
    featuredMatchup?: FeaturedMatchup | null;
  }
): { proposalA: TeamProposal; proposalB: TeamProposal } {
  const maxAttempts = options?.maxAttempts ?? 80;
  const excluded = options?.exclude ?? [];
  const buildOptions: BuildProposalOptions = {
    featuredMatchup: options?.featuredMatchup,
  };

  const proposalA = generateProposalDifferentFrom(
    players,
    mode,
    excluded,
    maxAttempts,
    buildOptions
  );
  const proposalB = generateProposalDifferentFrom(
    players,
    mode,
    [...excluded, proposalA],
    maxAttempts,
    buildOptions
  );

  return { proposalA, proposalB };
}

export function getTeamPointsFromAssignments(team: PlayerAssignment[]): number {
  return team.reduce(
    (acc, p) => acc + getRankPoints(p.rank, p.rankDivision, p.rankLp),
    0
  );
}
