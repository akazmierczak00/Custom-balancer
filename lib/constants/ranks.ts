import { LoLRank } from "@/types";

export const RANKS: { value: LoLRank; label: string; points: number }[] = [
  { value: "iron", label: "Iron", points: 1 },
  { value: "bronze", label: "Bronze", points: 2 },
  { value: "silver", label: "Silver", points: 3 },
  { value: "gold", label: "Gold", points: 4 },
  { value: "platinum", label: "Platinum", points: 5 },
  { value: "emerald", label: "Emerald", points: 6 },
  { value: "diamond", label: "Diamond", points: 7 },
  { value: "master", label: "Master", points: 8 },
  { value: "grandmaster", label: "Grandmaster", points: 9 },
  { value: "challenger", label: "Challenger", points: 10 },
];

export const RANK_POINTS: Record<LoLRank, number> = RANKS.reduce(
  (acc, rank) => {
    acc[rank.value] = rank.points;
    return acc;
  },
  {} as Record<LoLRank, number>
);

export function getRankLabel(rank: LoLRank): string {
  return RANKS.find((r) => r.value === rank)?.label ?? rank;
}

export function compareRanks(a: LoLRank, b: LoLRank): number {
  return RANK_POINTS[a] - RANK_POINTS[b];
}
