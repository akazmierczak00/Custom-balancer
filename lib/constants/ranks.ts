import { LoLDivision, LoLRank } from "@/types";

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

export const DIVISIONS: LoLDivision[] = ["I", "II", "III", "IV"];

const MASTER_PLUS_TIERS = new Set<LoLRank>([
  "master",
  "grandmaster",
  "challenger",
]);

const DIVISION_OFFSET: Record<LoLDivision, number> = {
  IV: 0,
  III: 1,
  II: 2,
  I: 3,
};

export const RANK_POINTS: Record<LoLRank, number> = RANKS.reduce(
  (acc, rank) => {
    acc[rank.value] = rank.points;
    return acc;
  },
  {} as Record<LoLRank, number>
);

export function getRankPoints(
  rank: LoLRank | "",
  division?: LoLDivision | "",
  lp?: number
): number {
  if (!rank) return 0;

  const base = RANK_POINTS[rank];

  if (MASTER_PLUS_TIERS.has(rank)) {
    return base * 4 + (lp ?? 0) / 100;
  }

  const divisionOffset =
    division && division in DIVISION_OFFSET
      ? DIVISION_OFFSET[division as LoLDivision]
      : 0;

  return base * 4 + divisionOffset;
}

export function getRankLabel(
  rank: LoLRank | "",
  division?: LoLDivision | "",
  lp?: number
): string {
  if (!rank) return "Brak rangi";

  const tierLabel = RANKS.find((entry) => entry.value === rank)?.label ?? rank;

  if (MASTER_PLUS_TIERS.has(rank as LoLRank)) {
    return lp !== undefined && lp > 0 ? `${tierLabel} ${lp} LP` : tierLabel;
  }

  return division ? `${tierLabel} ${division}` : tierLabel;
}

export function compareRanks(
  a: LoLRank,
  b: LoLRank,
  aDivision?: LoLDivision | "",
  bDivision?: LoLDivision | "",
  aLp?: number,
  bLp?: number
): number {
  return (
    getRankPoints(a, aDivision, aLp) - getRankPoints(b, bDivision, bLp)
  );
}

export function isMasterPlusTier(rank: LoLRank | ""): boolean {
  return !!rank && MASTER_PLUS_TIERS.has(rank);
}
