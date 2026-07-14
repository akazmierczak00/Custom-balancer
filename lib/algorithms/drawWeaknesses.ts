import { Weakness, WeaknessCell } from "@/types";

function weightedPick(pool: Weakness[], exclude: Set<string>): Weakness | null {
  const available = pool.filter((w) => !exclude.has(w.id));
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
  const used = new Set<string>();

  for (const tier of [1, 2, 3] as const) {
    const row: WeaknessCell[] = [];
    for (let col = 0; col < 3; col++) {
      const picked = weightedPick(weaknesses, used);
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

      used.add(picked.id);
      const text =
        tier === 1 ? picked.tier1 : tier === 2 ? picked.tier2 : picked.tier3;

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

export function getRevealDelay(rarity: number): number {
  return Math.max(300, (101 - rarity) * 80);
}

export function getRevealIntensity(rarity: number): string {
  if (rarity <= 10) return "animate-pulse ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/50";
  if (rarity <= 30) return "ring-1 ring-purple-400 shadow-md shadow-purple-500/30";
  if (rarity <= 60) return "ring-1 ring-blue-300";
  return "";
}
