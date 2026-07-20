import {
  buildFullProposal,
  generateBalancedTeams,
} from "../lib/algorithms/balanceTeams.ts";
import { getRankLabel, getRankPoints } from "../lib/constants/ranks.ts";
import type { LobbyPlayer, LoLRole } from "../types/index.ts";

function player(
  nick: string,
  rank: LobbyPlayer["rank"],
  division?: LobbyPlayer["rankDivision"],
  mainRole: LoLRole = "mid"
): LobbyPlayer {
  const roles: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];
  const others = roles.filter((r) => r !== mainRole);
  return {
    uid: nick.toLowerCase(),
    nick,
    rank,
    ...(division ? { rankDivision: division } : {}),
    rolePriorities: [
      { priority: 1, roles: [mainRole] },
      { priority: 2, roles: [others[0]!] },
      { priority: 3, roles: [others[1]!] },
      { priority: 4, roles: [others[2]!] },
      { priority: 5, roles: [others[3]!] },
    ],
    wins: 10,
    losses: 10,
    matchHistory: [],
  };
}

const roster: LobbyPlayer[] = [
  player("Adrian", "diamond", "II", "mid"),
  player("Damian", "platinum", "I", "jungle"),
  player("Kuba", "emerald", "III", "top"),
  player("Mati", "gold", "II", "adc"),
  player("Olek", "silver", "I", "support"),
  player("Piotr", "diamond", "IV", "top"),
  player("Tomek", "platinum", "III", "mid"),
  player("Wojtek", "gold", "I", "jungle"),
  player("Kacper", "emerald", "IV", "adc"),
  player("Bartek", "silver", "III", "support"),
];

const total = roster.reduce((s, p) => s + getRankPoints(p.rank, p.rankDivision), 0);
const avg = total / 2;

console.log("=== SKŁAD LOBBY (10 graczy) ===\n");
for (const p of [...roster].sort((a, b) =>
  getRankPoints(b.rank, b.rankDivision) - getRankPoints(a.rank, a.rankDivision)
)) {
  const pts = getRankPoints(p.rank, p.rankDivision);
  console.log(
    `  ${p.nick.padEnd(8)} ${getRankLabel(p.rank, p.rankDivision).padEnd(14)} ${pts} pkt`
  );
}
console.log(`\nSuma wszystkich: ${total} pkt  |  Cel na drużynę: ${avg} pkt (±2)\n`);

console.log("=== 5 PRZYKŁADOWYCH LOSOWAŃ (tylko podział na drużyny) ===\n");

for (let i = 1; i <= 5; i++) {
  const { team1, team2 } = generateBalancedTeams(roster);
  const sum1 = team1.reduce((s, p) => s + getRankPoints(p.rank, p.rankDivision), 0);
  const sum2 = team2.reduce((s, p) => s + getRankPoints(p.rank, p.rankDivision), 0);

  console.log(`--- Losowanie ${i} ---`);
  console.log(`Team 1 (${sum1} pkt, odchylenie ${Math.abs(sum1 - avg).toFixed(0)}):`);
  for (const p of team1.sort((a, b) =>
    getRankPoints(b.rank, b.rankDivision) - getRankPoints(a.rank, a.rankDivision)
  )) {
    console.log(`  ${p.nick.padEnd(8)} ${getRankLabel(p.rank, p.rankDivision)}`);
  }
  console.log(`Team 2 (${sum2} pkt, odchylenie ${Math.abs(sum2 - avg).toFixed(0)}):`);
  for (const p of team2.sort((a, b) =>
    getRankPoints(b.rank, b.rankDivision) - getRankPoints(a.rank, a.rankDivision)
  )) {
    console.log(`  ${p.nick.padEnd(8)} ${getRankLabel(p.rank, p.rankDivision)}`);
  }
  console.log("");
}

console.log("=== 1 PEŁNA PROPOZYCJA (drużyny + role) ===\n");
const proposal = buildFullProposal(roster);

for (const [label, team] of [
  ["Team 1", proposal.team1],
  ["Team 2", proposal.team2],
] as const) {
  const sum = team.reduce(
    (s, p) => s + getRankPoints(p.rank as never, p.rankDivision),
    0
  );
  console.log(`${label} (${sum} pkt):`);
  for (const p of team) {
    console.log(
      `  ${p.nick.padEnd(8)} ${getRankLabel(p.rank as never, p.rankDivision).padEnd(14)} → ${p.role.toUpperCase()}`
    );
  }
  console.log("");
}
