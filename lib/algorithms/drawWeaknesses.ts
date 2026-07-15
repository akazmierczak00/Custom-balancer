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

export function getRevealIntensity(rarity: number): string {
  if (rarity <= 10) return "ring-1 ring-yellow-500/25 shadow-sm shadow-yellow-500/10";
  if (rarity <= 30) return "ring-1 ring-purple-500/20 shadow-sm shadow-purple-500/10";
  if (rarity <= 60) return "ring-1 ring-blue-400/15";
  return "";
}
