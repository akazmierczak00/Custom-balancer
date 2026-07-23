import { Weakness, WeaknessCell } from "@/types";
import { getWeaknessTierText, weaknessHasTier } from "@/lib/weaknesses/helpers";

function weightedPick(
  pool: Weakness[],
  tier: 1 | 2 | 3,
  exclude: Set<string>
): Weakness | null {
  const available = pool.filter(
    (w) => !exclude.has(w.id) && weaknessHasTier(w, tier)
  );
  if (available.length === 0) return null;

  const weights = available.map((w) => 101 - w.rarity);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }

  return available[available.length - 1];
}

export function drawWeaknessGrid(weaknesses: Weakness[]): WeaknessCell[][] {
  const grid: WeaknessCell[][] = [];

  for (const tier of [1, 2, 3] as const) {
    const row: WeaknessCell[] = [];
    const usedInRow = new Set<string>();

    for (let col = 0; col < 3; col++) {
      const picked = weightedPick(weaknesses, tier, usedInRow);
      if (!picked) {
        row.push({
          weaknessId: `empty-${tier}-${col}`,
          name: "Brak",
          text: "Brak osłabienia",
          tier,
          rarity: 100,
          revealed: false,
        });
        continue;
      }

      usedInRow.add(picked.id);
      const text = getWeaknessTierText(picked, tier)!;

      row.push({
        weaknessId: picked.id,
        name: picked.name,
        text,
        tier,
        rarity: picked.rarity,
        revealed: false,
      });
    }
    grid.push(row);
  }

  return grid;
}

export function getWeaknessCost(tier: 1 | 2 | 3): number {
  return tier;
}

export const WEAKNESS_GRID_SIZE = 9;
export const WEAKNESS_GRID_COLS = 3;

export function flattenWeaknessGrid(grid: WeaknessCell[][]): WeaknessCell[] {
  return grid.flat();
}

export function normalizeDrawnWeaknesses(
  drawn: WeaknessCell[] | WeaknessCell[][] | undefined
): WeaknessCell[] {
  if (!drawn?.length) return [];
  if (Array.isArray(drawn[0])) {
    return (drawn as WeaknessCell[][]).flat();
  }
  return [...(drawn as WeaknessCell[])];
}

export function getWeaknessCellIndex(row: number, col: number): number {
  return row * WEAKNESS_GRID_COLS + col;
}

export const WEAKNESS_REVEAL_DELAY_MS = 1000;

export function getRevealDelay(_rarity?: number): number {
  return WEAKNESS_REVEAL_DELAY_MS;
}

export type WeaknessRarityTier = "common" | "rare" | "legendary";

/**
 * Wyższa wartość rarity = rzadsze osłabienie.
 * 1–51 zwykłe, 52–70 rzadkie, 71–100 legendarne.
 */
export function getWeaknessRarityTier(rarity: number): WeaknessRarityTier {
  if (rarity >= 71) return "legendary";
  if (rarity >= 52) return "rare";
  return "common";
}

export function getRarityLabel(rarity: number): string {
  switch (getWeaknessRarityTier(rarity)) {
    case "legendary":
      return "Legendarne";
    case "rare":
      return "Rzadkie";
    default:
      return "Zwykłe";
  }
}

/**
 * Jednolity styl karty: ten sam kolor glow (liliowy), różna intensywność według rzadkości.
 */
export function getRevealIntensity(rarity: number): string {
  const base = "border bg-slate-800/70";
  switch (getWeaknessRarityTier(rarity)) {
    case "legendary":
      return `${base} border-fuchsia-400/55 shadow-[0_0_22px_4px_rgba(232,121,249,0.45)]`;
    case "rare":
      return `${base} border-fuchsia-400/45 shadow-[0_0_14px_2px_rgba(232,121,249,0.28)]`;
    default:
      return `${base} border-fuchsia-400/15 shadow-[0_0_3px_0px_rgba(232,121,249,0.02)]`;
  }
}

export function getRarityBadgeClass(rarity: number): string {
  switch (getWeaknessRarityTier(rarity)) {
    case "legendary":
      return "bg-fuchsia-500/30 text-fuchsia-100";
    case "rare":
      return "bg-fuchsia-500/20 text-fuchsia-200";
    default:
      return "bg-fuchsia-500/5 text-fuchsia-300/50";
  }
}
