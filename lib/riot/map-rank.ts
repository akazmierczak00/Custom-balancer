import { LoLDivision, LoLRank } from "@/types";
import { RiotLeagueEntry } from "@/lib/riot/client";

const TIER_MAP: Record<string, LoLRank> = {
  IRON: "iron",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  EMERALD: "emerald",
  DIAMOND: "diamond",
  MASTER: "master",
  GRANDMASTER: "grandmaster",
  CHALLENGER: "challenger",
};

const DIVISION_MAP: Record<string, LoLDivision> = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
};

const MASTER_PLUS = new Set<LoLRank>(["master", "grandmaster", "challenger"]);

export type MappedRiotRank = {
  rank: LoLRank;
  rankDivision?: LoLDivision;
  rankLp?: number;
};

export function mapRiotLeagueEntry(
  entry: RiotLeagueEntry
): MappedRiotRank | null {
  const rank = TIER_MAP[entry.tier];
  if (!rank) return null;

  if (MASTER_PLUS.has(rank)) {
    return {
      rank,
      rankLp: entry.leaguePoints,
    };
  }

  const division = DIVISION_MAP[entry.rank];
  if (!division) return null;

  return {
    rank,
    rankDivision: division,
    rankLp: entry.leaguePoints,
  };
}

export function getSoloDuoEntry(
  entries: RiotLeagueEntry[]
): RiotLeagueEntry | null {
  return entries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") ?? null;
}
