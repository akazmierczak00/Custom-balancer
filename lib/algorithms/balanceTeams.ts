import { LobbyPlayer, LoLRank, PlayerAssignment, TeamProposal } from "@/types";
import { getRankPoints } from "@/lib/constants/ranks";
import { formatRolePriorities } from "@/lib/constants/roles";
import { LoLRole } from "@/types";

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

export function generateBalancedTeams(
  players: LobbyPlayer[],
  maxDeviation = 2,
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

function getPriorityList(player: LobbyPlayer): LoLRole[] {
  return [...player.rolePriorities]
    .sort((a, b) => a.priority - b.priority)
    .flatMap((g) => g.roles);
}

function pickRoleForPlayer(
  player: LobbyPlayer,
  takenRoles: Set<LoLRole>,
  conflictingPlayers: LobbyPlayer[]
): LoLRole {
  const priorities = getPriorityList(player);

  for (const role of priorities) {
    if (!takenRoles.has(role)) {
      const othersWant = conflictingPlayers.filter((p) =>
        getPriorityList(p).includes(role)
      );
      if (othersWant.length > 0) {
        const pool = [player, ...othersWant];
        const winner = pool[Math.floor(Math.random() * pool.length)];
        if (winner.uid !== player.uid) continue;
      }
      return role;
    }
  }

  const available = ALL_ROLES.filter((r) => !takenRoles.has(r));
  return available[0] ?? ALL_ROLES[0];
}

function ranksMatch(a: LobbyPlayer, b: LobbyPlayer): boolean {
  return (
    a.rank === b.rank &&
    (a.rankDivision ?? "") === (b.rankDivision ?? "") &&
    (a.rankLp ?? 0) === (b.rankLp ?? 0)
  );
}

export function assignRoles(
  team1: LobbyPlayer[],
  team2: LobbyPlayer[]
): TeamProposal {
  const assignTeam = (team: LobbyPlayer[]): PlayerAssignment[] => {
    const sorted = [...team].sort((a, b) => playerPoints(a) - playerPoints(b));
    const taken = new Set<LoLRole>();
    const assignments: PlayerAssignment[] = [];

    for (const player of sorted) {
      const sameRankSamePriority = sorted.filter(
        (p) =>
          p.uid !== player.uid &&
          ranksMatch(p, player) &&
          JSON.stringify(getPriorityList(p)) ===
            JSON.stringify(getPriorityList(player))
      );

      let role: LoLRole;
      if (sameRankSamePriority.length > 0 && Math.random() < 0.5) {
        const pool = [player, ...sameRankSamePriority];
        const winner = pool[Math.floor(Math.random() * pool.length)];
        const priorities = getPriorityList(winner);
        role =
          priorities.find((r) => !taken.has(r)) ??
          (ALL_ROLES.find((r) => !taken.has(r)) as LoLRole);
      } else {
        role = pickRoleForPlayer(player, taken, sorted);
      }

      taken.add(role);
      assignments.push({
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
      });
    }

    return assignments;
  };

  return {
    team1: assignTeam(team1),
    team2: assignTeam(team2),
  };
}

export function proposalsAreEqual(a: TeamProposal, b: TeamProposal): boolean {
  const serialize = (proposal: TeamProposal) =>
    JSON.stringify({
      team1: [...proposal.team1].sort((x, y) => x.uid.localeCompare(y.uid)),
      team2: [...proposal.team2].sort((x, y) => x.uid.localeCompare(y.uid)),
    });
  return serialize(a) === serialize(b);
}

export function generateDistinctProposals(
  players: LobbyPlayer[],
  maxAttempts = 50
): { proposalA: TeamProposal; proposalB: TeamProposal } {
  let proposalA = buildFullProposal(players);
  let proposalB = buildFullProposal(players);
  let attempts = 0;

  while (proposalsAreEqual(proposalA, proposalB) && attempts < maxAttempts) {
    proposalB = buildFullProposal(players);
    attempts++;
  }

  return { proposalA, proposalB };
}

export function buildFullProposal(players: LobbyPlayer[]): TeamProposal {
  const { team1, team2 } = generateBalancedTeams(players);
  return assignRoles(team1, team2);
}
