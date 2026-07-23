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

/** Stałe punkty Master+ — bez LP (Diamond I = 31, skok +4 na tier). */
const MASTER_PLUS_FIXED_POINTS: Record<"master" | "grandmaster" | "challenger", number> = {
  master: 35,
  grandmaster: 39,
  challenger: 43,
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
  _lp?: number
): number {
  if (!rank) return 0;

  if (MASTER_PLUS_TIERS.has(rank)) {
    return MASTER_PLUS_FIXED_POINTS[rank as keyof typeof MASTER_PLUS_FIXED_POINTS];
  }

  const base = RANK_POINTS[rank];
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

/** Emblemy rang w /public/ranks (PNG z przezroczystością). */
const RANK_EMBLEM_FILES: Record<LoLRank, string> = {
  iron: "Iron.png",
  bronze: "Bronze.png",
  silver: "Silver.png",
  gold: "Gold.png",
  platinum: "Platinum.png",
  emerald: "Emerald.png",
  diamond: "Diamond.png",
  master: "Master.png",
  grandmaster: "Grandmaster.png",
  challenger: "Challenger.png",
};

export function getRankEmblemUrl(rank: LoLRank | ""): string | null {
  if (!rank || !(rank in RANK_EMBLEM_FILES)) return null;
  return `/ranks/${RANK_EMBLEM_FILES[rank as LoLRank]}`;
}

/** @deprecated Użyj getRankEmblemUrl */
export function getRankBackgroundUrl(rank: LoLRank | ""): string | null {
  return getRankEmblemUrl(rank);
}
