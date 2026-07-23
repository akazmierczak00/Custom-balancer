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
  /** Nadpisanie limitu ±pkt w classic (np. szersza pula pod reshuffle A/B/C). */
  classicMaxDeviation?: number;
  /**
   * Classic — tylko pierwsze losowanie (nie reshuffle):
   * po featured przypisz temu graczowi rolę z odblokowanych grup priorytetu,
   * zanim dobierzesz resztę drużyny.
   */
  classicPriorityAssign?: {
    uid: string;
    /** Ile grup priorytetu jest odblokowanych (1 = tylko najwyższy priorytet). */
    unlockedGroups: number;
  } | null;
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
  maxDeviation = 10,
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
  const topN = candidates.slice(0, Math.min(40, candidates.length));
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

/** Role z N najwyższych grup priorytetu (1 = tylko P1). */
export function getUnlockedPriorityRoles(
  player: LobbyPlayer,
  unlockedGroups: number
): LoLRole[] {
  return getWeightedUnlockedRoles(player, unlockedGroups).map((e) => e.role);
}

/**
 * Pula ról z wagami: nowo odblokowana grupa priorytetu ma 2× szansę
 * względem wcześniej odblokowanych.
 */
export function getWeightedUnlockedRoles(
  player: LobbyPlayer,
  unlockedGroups: number
): { role: LoLRole; weight: number }[] {
  const groups = [...player.rolePriorities].sort(
    (a, b) => a.priority - b.priority
  );
  if (groups.length === 0) {
    return ALL_ROLES.map((role) => ({ role, weight: 1 }));
  }

  const take = Math.max(1, Math.min(unlockedGroups, groups.length));
  const newestIndex = take - 1;
  const boostNewest = unlockedGroups > 1;
  const result: { role: LoLRole; weight: number }[] = [];
  const seen = new Set<LoLRole>();

  for (let i = 0; i < take; i++) {
    const weight = boostNewest && i === newestIndex ? 2 : 1;
    for (const role of groups[i]!.roles) {
      if (seen.has(role)) continue;
      seen.add(role);
      result.push({ role, weight });
    }
  }
  return result;
}

function pickWeightedRoleFromPool(
  weighted: { role: LoLRole; weight: number }[],
  takenRoles: Set<LoLRole>,
  fallbackPlayer: LobbyPlayer
): LoLRole {
  const free = weighted.filter((entry) => !takenRoles.has(entry.role));
  if (free.length === 0) {
    return pickRoleForPlayer(fallbackPlayer, takenRoles);
  }

  const total = free.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of free) {
    roll -= entry.weight;
    if (roll <= 0) return entry.role;
  }
  return free[free.length - 1]!.role;
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

/** Klasyczne przypisanie ról: featured → (opcjonalnie Adrian) → od najniższej rangi. */
export function assignRoles(
  team1: LobbyPlayer[],
  team2: LobbyPlayer[],
  featured: FeaturedMatchup | null = null,
  priorityAssign?: BuildProposalOptions["classicPriorityAssign"]
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

    if (priorityAssign?.uid) {
      const priorityIdx = remaining.findIndex(
        (p) => p.uid === priorityAssign.uid
      );
      if (priorityIdx >= 0) {
        const priorityPlayer = remaining[priorityIdx]!;
        const weighted = getWeightedUnlockedRoles(
          priorityPlayer,
          priorityAssign.unlockedGroups
        );
        const role = pickWeightedRoleFromPool(
          weighted,
          taken,
          priorityPlayer
        );
        assignments.push(toAssignment(priorityPlayer, role));
        taken.add(role);
        remaining.splice(priorityIdx, 1);
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
    const { team1, team2 } = generateBalancedTeams(players, 10, 200, featured);
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
    const maxDeviation = options?.classicMaxDeviation ?? 10;
    const { team1, team2 } = generateBalancedTeams(
      players,
      maxDeviation,
      200,
      featured
    );
    return assignRoles(
      team1,
      team2,
      featured,
      options?.classicPriorityAssign ?? null
    );
  }

  return buildScoredProposal(players, resolved, featured);
}

function proposalRankDiff(proposal: TeamProposal): number {
  return Math.abs(
    getTeamPointsFromAssignments(proposal.team1) -
      getTeamPointsFromAssignments(proposal.team2)
  );
}

/** Klucz podziału 5v5 (bez ról, niezależny od zamiany Team1/Team2). */
function partitionKey(proposal: TeamProposal): string {
  const t1 = proposal.team1
    .map((p) => p.uid)
    .sort()
    .join(",");
  const t2 = proposal.team2
    .map((p) => p.uid)
    .sort()
    .join(",");
  return t1 < t2 ? `${t1}||${t2}` : `${t2}||${t1}`;
}

/** Pojedynek na linii (kolejność drużyn bez znaczenia). */
function laneMatchupKey(proposal: TeamProposal, role: LoLRole): string {
  const a = proposal.team1.find((p) => p.role === role);
  const b = proposal.team2.find((p) => p.role === role);
  if (!a || !b) return role;
  const [x, y] = [a.uid, b.uid].sort();
  return `${role}:${x}|${y}`;
}

/**
 * Ile graczy musiałoby zmienić drużynę, żeby przejść z A do B
 * (po najlepszym wyrównaniu lustrzanym Team1/Team2).
 */
function teamSideDistance(a: TeamProposal, b: TeamProposal): number {
  const a1 = new Set(a.team1.map((p) => p.uid));
  const b1 = new Set(b.team1.map((p) => p.uid));
  const b2 = new Set(b.team2.map((p) => p.uid));
  const overlapB1 = [...a1].filter((uid) => b1.has(uid)).length;
  const overlapB2 = [...a1].filter((uid) => b2.has(uid)).length;
  return 5 - Math.max(overlapB1, overlapB2);
}

/** Ile linii ma ten sam pojedynek (z pominięciem featured). */
function sharedLaneMatchups(
  a: TeamProposal,
  b: TeamProposal,
  lockedRole: LoLRole | null
): number {
  let shared = 0;
  for (const role of ALL_ROLES) {
    if (lockedRole && role === lockedRole) continue;
    if (laneMatchupKey(a, role) === laneMatchupKey(b, role)) shared++;
  }
  return shared;
}

function isCompositionDiverse(
  candidate: TeamProposal,
  taken: TeamProposal[],
  minSideSwitches: number,
  maxSharedMatchups: number,
  lockedRole: LoLRole | null
): boolean {
  if (taken.some((t) => proposalsAreEqual(t, candidate))) return false;
  if (taken.some((t) => partitionKey(t) === partitionKey(candidate))) {
    return false;
  }
  for (const t of taken) {
    if (teamSideDistance(t, candidate) < minSideSwitches) return false;
    if (sharedLaneMatchups(t, candidate, lockedRole) > maxSharedMatchups) {
      return false;
    }
  }
  return true;
}

function pickDiverseFromBand(
  scored: { proposal: TeamProposal; diff: number }[],
  start: number,
  end: number,
  taken: TeamProposal[],
  minSideSwitches: number,
  maxSharedMatchups: number,
  lockedRole: LoLRole | null
): TeamProposal | null {
  const slice = scored.slice(start, Math.max(start + 1, end));
  const order = shuffle(slice);
  for (const entry of order) {
    if (
      isCompositionDiverse(
        entry.proposal,
        taken,
        minSideSwitches,
        maxSharedMatchups,
        lockedRole
      )
    ) {
      return entry.proposal;
    }
  }
  return null;
}

function pickDiverseProposal(
  scored: { proposal: TeamProposal; diff: number }[],
  preferStart: number,
  preferEnd: number,
  taken: TeamProposal[],
  lockedRole: LoLRole | null
): TeamProposal {
  // 0 shared = żaden powtórzony pojedynek na linii; potem luzujemy.
  const sharedLimits = [0, 1, 2, 4];
  const switchLimits = [3, 2, 1];

  for (const maxShared of sharedLimits) {
    for (const minSwitches of switchLimits) {
      const fromBand = pickDiverseFromBand(
        scored,
        preferStart,
        preferEnd,
        taken,
        minSwitches,
        maxShared,
        lockedRole
      );
      if (fromBand) return fromBand;

      const anywhere = pickDiverseFromBand(
        scored,
        0,
        scored.length,
        taken,
        minSwitches,
        maxShared,
        lockedRole
      );
      if (anywhere) return anywhere;
    }
  }

  for (const entry of scored) {
    if (!taken.some((t) => proposalsAreEqual(t, entry.proposal))) {
      return entry.proposal;
    }
  }
  return scored[Math.min(preferStart, scored.length - 1)]!.proposal;
}

function maybePerturbTeamRoles(
  team: PlayerAssignment[],
  lockedUid: string | null
): PlayerAssignment[] {
  const swappable = team
    .map((player, index) => ({ player, index }))
    .filter((entry) => entry.player.uid !== lockedUid);
  if (swappable.length < 2) return team;

  const i = Math.floor(Math.random() * swappable.length);
  let j = Math.floor(Math.random() * swappable.length);
  if (j === i) j = (j + 1) % swappable.length;

  const a = swappable[i]!;
  const b = swappable[j]!;
  const next = team.map((player) => ({ ...player }));
  const roleA = next[a.index]!.role;
  next[a.index] = { ...next[a.index]!, role: next[b.index]!.role };
  next[b.index] = { ...next[b.index]!, role: roleA };
  return next;
}

/** Permutacja ról (bez ruszania featured), by zróżnicować pojedynki w classic. */
function perturbProposalRoles(
  proposal: TeamProposal,
  featured: FeaturedMatchup | null,
  swaps = 1
): TeamProposal {
  const lock1 =
    featured &&
    proposal.team1.some((p) => p.uid === featured.uidA || p.uid === featured.uidB)
      ? proposal.team1.find(
          (p) => p.uid === featured.uidA || p.uid === featured.uidB
        )!.uid
      : null;
  const lock2 =
    featured &&
    proposal.team2.some((p) => p.uid === featured.uidA || p.uid === featured.uidB)
      ? proposal.team2.find(
          (p) => p.uid === featured.uidA || p.uid === featured.uidB
        )!.uid
      : null;

  let next = proposal;
  for (let i = 0; i < swaps; i++) {
    next = {
      team1: maybePerturbTeamRoles(next.team1, lock1),
      team2: maybePerturbTeamRoles(next.team2, lock2),
    };
  }
  return next;
}

/**
 * Generuje 3 propozycje reshuffle:
 * A — najmniejsze deviation, B — średnie, C — największe.
 * Muszą różnić się podziałem drużyn ORAZ pojedynkami na liniach
 * (np. nie ten sam Top we wszystkich trzech).
 */
export function generateDistinctProposals(
  players: LobbyPlayer[],
  mode: BalanceMode | undefined = "classic",
  options?: {
    /** Składy, których A/B/C nie mogą powtórzyć (np. oryginalne losowanie). */
    exclude?: TeamProposal[];
    maxAttempts?: number;
    featuredMatchup?: FeaturedMatchup | null;
  }
): {
  proposalA: TeamProposal;
  proposalB: TeamProposal;
  proposalC: TeamProposal;
} {
  const maxAttempts = options?.maxAttempts ?? 200;
  const excluded = options?.exclude ?? [];
  const featured = options?.featuredMatchup ?? null;
  const lockedRole = featured?.role ?? null;
  const buildOptions: BuildProposalOptions = {
    featuredMatchup: featured,
    classicMaxDeviation: 20,
  };

  const pool: TeamProposal[] = [];
  const seenPartitions = new Set<string>();
  const seenMatchupSets = new Set<string>();

  for (const excludedProposal of excluded) {
    seenPartitions.add(partitionKey(excludedProposal));
  }

  const matchupSetKey = (proposal: TeamProposal) =>
    ALL_ROLES.map((role) => laneMatchupKey(proposal, role)).join(";");

  const isClassic = normalizeBalanceMode(mode) === "classic";

  const tryAdd = (proposal: TeamProposal, maxPerPartition: number) => {
    if (isProposalForbidden(proposal, [...excluded, ...pool])) return;
    const key = partitionKey(proposal);
    const mKey = matchupSetKey(proposal);
    if (seenMatchupSets.has(mKey)) return;
    const partitionCount = pool.filter((p) => partitionKey(p) === key).length;
    if (partitionCount >= maxPerPartition) return;
    seenPartitions.add(key);
    seenMatchupSets.add(mKey);
    pool.push(proposal);
  };

  for (let attempt = 0; attempt < maxAttempts && pool.length < 80; attempt++) {
    const base = buildFullProposal(players, mode, buildOptions);
    tryAdd(base, isClassic ? 4 : 1);

    // Classic: te same drużyny + inne role → inne pojedynki na liniach
    if (isClassic) {
      for (let v = 0; v < 6; v++) {
        tryAdd(
          perturbProposalRoles(base, featured, 1 + (v % 3)),
          4
        );
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts && pool.length < 6; attempt++) {
    let proposal = buildFullProposal(players, mode, buildOptions);
    if (isClassic) {
      proposal = perturbProposalRoles(
        proposal,
        featured,
        1 + Math.floor(Math.random() * 3)
      );
    }
    tryAdd(proposal, 8);
  }

  while (pool.length < 3) {
    pool.push(buildFullProposal(players, mode, buildOptions));
  }

  const scored = pool
    .map((proposal) => ({ proposal, diff: proposalRankDiff(proposal) }))
    .sort((a, b) => a.diff - b.diff);

  const n = scored.length;
  const lowEnd = Math.max(1, Math.ceil(n * 0.3));
  const midStart = Math.floor(n * 0.3);
  const midEnd = Math.max(midStart + 1, Math.ceil(n * 0.7));
  const highStart = Math.floor(n * 0.7);

  const proposalA = pickDiverseProposal(
    scored,
    0,
    lowEnd,
    excluded,
    lockedRole
  );
  const proposalB = pickDiverseProposal(
    scored,
    midStart,
    midEnd,
    [...excluded, proposalA],
    lockedRole
  );
  const proposalC = pickDiverseProposal(
    scored,
    highStart,
    n,
    [...excluded, proposalA, proposalB],
    lockedRole
  );

  return { proposalA, proposalB, proposalC };
}

export function getTeamPointsFromAssignments(team: PlayerAssignment[]): number {
  return team.reduce(
    (acc, p) => acc + getRankPoints(p.rank, p.rankDivision, p.rankLp),
    0
  );
}
