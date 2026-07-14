import { LoLRank, LoLRole, MatchResult, RolePriorityGroup } from "@/types";
import { normalizeRolePriorities } from "@/lib/constants/roles";

export const TEST_BOT_PREFIX = "test-bot-";

export interface TestBotDefinition {
  uid: string;
  nick: string;
  rank: LoLRank;
  rolePriorities: RolePriorityGroup[];
  wins: number;
  losses: number;
  matchHistory: MatchResult[];
}

function priorities(...groups: LoLRole[][]): RolePriorityGroup[] {
  return normalizeRolePriorities(
    groups.map((roles, index) => ({ priority: index + 1, roles }))
  ).filter((group) => group.roles.length > 0);
}

export const TEST_BOT_DEFINITIONS: TestBotDefinition[] = [
  {
    uid: `${TEST_BOT_PREFIX}01`,
    nick: "Bot_TopGold",
    rank: "gold",
    rolePriorities: priorities(["top"], ["jungle"], ["mid"], ["support"], ["adc"]),
    wins: 12,
    losses: 8,
    matchHistory: ["W", "L", "W", "W", "L"],
  },
  {
    uid: `${TEST_BOT_PREFIX}02`,
    nick: "Bot_JglPlat",
    rank: "platinum",
    rolePriorities: priorities(["jungle"], ["top"], ["mid"], ["adc"], ["support"]),
    wins: 20,
    losses: 15,
    matchHistory: ["W", "W", "L", "W", "L"],
  },
  {
    uid: `${TEST_BOT_PREFIX}03`,
    nick: "Bot_MidEmerald",
    rank: "emerald",
    rolePriorities: priorities(["mid"], ["jungle"], ["top"], ["support"], ["adc"]),
    wins: 18,
    losses: 12,
    matchHistory: ["L", "W", "W", "W", "W"],
  },
  {
    uid: `${TEST_BOT_PREFIX}04`,
    nick: "Bot_AdcSilver",
    rank: "silver",
    rolePriorities: priorities(["adc"], ["support"], ["mid"], ["jungle"], ["top"]),
    wins: 7,
    losses: 11,
    matchHistory: ["L", "L", "W", "L", "W"],
  },
  {
    uid: `${TEST_BOT_PREFIX}05`,
    nick: "Bot_SuppBronze",
    rank: "bronze",
    rolePriorities: priorities(["support"], ["adc"], ["mid"], ["top"], ["jungle"]),
    wins: 5,
    losses: 9,
    matchHistory: ["W", "L", "L", "W", "L"],
  },
  {
    uid: `${TEST_BOT_PREFIX}06`,
    nick: "Bot_TopDiamond",
    rank: "diamond",
    rolePriorities: priorities(["top"], ["mid"], ["jungle"], ["adc"], ["support"]),
    wins: 30,
    losses: 18,
    matchHistory: ["W", "W", "W", "L", "W"],
  },
  {
    uid: `${TEST_BOT_PREFIX}07`,
    nick: "Bot_JglIron",
    rank: "iron",
    rolePriorities: priorities(["jungle"], ["support"], ["top"], ["mid"], ["adc"]),
    wins: 2,
    losses: 14,
    matchHistory: ["L", "L", "W", "L", "L"],
  },
  {
    uid: `${TEST_BOT_PREFIX}08`,
    nick: "Bot_MidMaster",
    rank: "master",
    rolePriorities: priorities(["mid"], ["top"], ["jungle"], ["adc"], ["support"]),
    wins: 40,
    losses: 22,
    matchHistory: ["W", "L", "W", "W", "W"],
  },
  {
    uid: `${TEST_BOT_PREFIX}09`,
    nick: "Bot_AdcGM",
    rank: "grandmaster",
    rolePriorities: priorities(["adc"], ["mid"], ["support"], ["jungle"], ["top"]),
    wins: 55,
    losses: 30,
    matchHistory: ["W", "W", "L", "W", "L"],
  },
  {
    uid: `${TEST_BOT_PREFIX}10`,
    nick: "Bot_FillChall",
    rank: "challenger",
    rolePriorities: priorities(["mid"], ["jungle"], ["top"], ["adc"], ["support"]),
    wins: 80,
    losses: 35,
    matchHistory: ["W", "W", "W", "W", "L"],
  },
];

export function isTestBotUid(uid: string | null): boolean {
  return !!uid && uid.startsWith(TEST_BOT_PREFIX);
}

export function getAvailableTestBots(usedUids: string[]): TestBotDefinition[] {
  const used = new Set(usedUids);
  return TEST_BOT_DEFINITIONS.filter((bot) => !used.has(bot.uid));
}
