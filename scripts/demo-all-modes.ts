import { buildFullProposal } from "../lib/algorithms/balanceTeams";
import { getRankLabel, getRankPoints } from "../lib/constants/ranks";
import { getBalanceModeLabel } from "../lib/constants/balance-modes";
import type { BalanceMode, LobbyPlayer, LoLRole } from "../types/index";

function player(
  nick: string,
  rank: LobbyPlayer["rank"],
  division: LobbyPlayer["rankDivision"],
  mainRole: LoLRole,
  second: LoLRole,
  third: LoLRole
): LobbyPlayer {
  const all: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];
  const used = new Set([mainRole, second, third]);
  const rest = all.filter((r) => !used.has(r));
  return {
    uid: nick.toLowerCase(),
    nick,
    rank,
    rankDivision: division,
    rolePriorities: [
      { priority: 1, roles: [mainRole] },
      { priority: 2, roles: [second] },
      { priority: 3, roles: [third] },
      { priority: 4, roles: [rest[0]!] },
      { priority: 5, roles: [rest[1]!] },
    ],
    wins: 10,
    losses: 10,
    matchHistory: [],
  };
}

const roster: LobbyPlayer[] = [
  player("Adrian", "diamond", "II", "mid", "jungle", "top"),
  player("Damian", "platinum", "I", "jungle", "mid", "top"),
  player("Kuba", "emerald", "III", "top", "jungle", "mid"),
  player("Mati", "gold", "II", "adc", "mid", "support"),
  player("Olek", "silver", "I", "support", "adc", "mid"),
  player("Piotr", "diamond", "IV", "top", "mid", "jungle"),
  player("Tomek", "platinum", "III", "mid", "adc", "jungle"),
  player("Wojtek", "gold", "I", "jungle", "top", "support"),
  player("Kacper", "emerald", "IV", "adc", "mid", "support"),
  player("Bartek", "silver", "III", "support", "top", "adc"),
];

const MODES: BalanceMode[] = ["classic", "roles", "score", "fair_lanes", "chaos"];

function teamSum(team: { rank: LobbyPlayer["rank"]; rankDivision?: LobbyPlayer["rankDivision"] }[]) {
  return team.reduce((s, p) => s + getRankPoints(p.rank, p.rankDivision), 0);
}

function prefLabel(player: LobbyPlayer, role: LoLRole): string {
  const list = [...player.rolePriorities]
    .sort((a, b) => a.priority - b.priority)
    .flatMap((g) => g.roles);
  const idx = list.indexOf(role);
  if (idx === -1) return "off";
  return `P${idx + 1}`;
}

function laneDiff(
  team1: { role: LoLRole; rank: LobbyPlayer["rank"]; rankDivision?: LobbyPlayer["rankDivision"] }[],
  team2: typeof team1
): number {
  const roles: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];
  let diff = 0;
  for (const role of roles) {
    const a = team1.find((p) => p.role === role);
    const b = team2.find((p) => p.role === role);
    if (!a || !b) continue;
    diff += Math.abs(getRankPoints(a.rank, a.rankDivision) - getRankPoints(b.rank, b.rankDivision));
  }
  return diff;
}

console.log("=== SKŁAD LOBBY ===\n");
for (const p of [...roster].sort(
  (a, b) => getRankPoints(b.rank, b.rankDivision) - getRankPoints(a.rank, a.rankDivision)
)) {
  const prefs = [...p.rolePriorities]
    .sort((a, b) => a.priority - b.priority)
    .flatMap((g) => g.roles)
    .slice(0, 3)
    .join(" > ");
  console.log(
    `  ${p.nick.padEnd(8)} ${getRankLabel(p.rank, p.rankDivision).padEnd(14)} ${String(getRankPoints(p.rank, p.rankDivision)).padStart(2)} pkt  |  ${prefs}`
  );
}
console.log(
  `\nSuma: ${roster.reduce((s, p) => s + getRankPoints(p.rank, p.rankDivision), 0)} pkt\n`
);

for (const mode of MODES) {
  const proposal = buildFullProposal(roster, mode);
  const s1 = teamSum(proposal.team1);
  const s2 = teamSum(proposal.team2);
  const lanes = laneDiff(proposal.team1, proposal.team2);

  console.log(`======== ${getBalanceModeLabel(mode).toUpperCase()} (${mode}) ========`);
  console.log(`Punkty: ${s1} vs ${s2}  |  różnica drużyn: ${Math.abs(s1 - s2)}  |  suma różnic linii: ${lanes}\n`);

  for (const [label, team] of [
    ["Team 1", proposal.team1],
    ["Team 2", proposal.team2],
  ] as const) {
    console.log(`${label} (${teamSum(team)} pkt):`);
    const byRole = ["top", "jungle", "mid", "adc", "support"] as const;
    for (const role of byRole) {
      const p = team.find((x) => x.role === role)!;
      const src = roster.find((r) => r.uid === p.uid)!;
      console.log(
        `  ${role.toUpperCase().padEnd(7)} ${p.nick.padEnd(8)} ${getRankLabel(p.rank as never, p.rankDivision).padEnd(14)} ${prefLabel(src, role)}`
      );
    }
    console.log("");
  }
}
