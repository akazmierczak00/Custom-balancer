import { ChampionCatalogEntry } from "@/lib/champions/types";
import { LoLRole, Lobby, SelectedWeakness } from "@/types";

export const NARROW_POOL_WEAKNESS_MATCH = "zawezona pula champion";

export const NARROW_POOL_TIER_FRACTION: Record<1 | 2 | 3, number> = {
  1: 1 / 4,
  2: 2 / 4,
  3: 3 / 4,
};

export type ChampionPoolSnapshot = {
  role: LoLRole;
  patch: string;
  appliedTiers: (1 | 2 | 3)[];
  startingPool: {
    id: string;
    key: string;
    name: string;
    iconUrl: string;
  }[];
  removedChampionIds: string[];
  remaining: {
    id: string;
    key: string;
    name: string;
    iconUrl: string;
  }[];
  revealedAt: number;
};

const POLISH_CHAR_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

function normalizeWeaknessName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_CHAR_MAP[char] ?? char);
}

export function isNarrowChampionPoolWeakness(name: string): boolean {
  return normalizeWeaknessName(name).includes(NARROW_POOL_WEAKNESS_MATCH);
}

export function getNarrowPoolTiers(selected: SelectedWeakness[]): (1 | 2 | 3)[] {
  return selected
    .filter((item) => isNarrowChampionPoolWeakness(item.name))
    .map((item) => item.tier)
    .sort((a, b) => NARROW_POOL_TIER_FRACTION[b] - NARROW_POOL_TIER_FRACTION[a]);
}

export function getAdrianRole(lobby: Lobby): LoLRole | null {
  const adrian = [...lobby.team1, ...lobby.team2].find(
    (player) => player.uid === lobby.createdBy
  );
  return adrian?.role ?? null;
}

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 0xffffffff;
  };
}

function shuffleDeterministic<T>(items: T[], seed: string): T[] {
  const random = seededRandom(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function toSnapshotChampion(champion: ChampionCatalogEntry) {
  return {
    id: champion.id,
    key: champion.key,
    name: champion.name,
    iconUrl: champion.iconUrl,
  };
}

export function computeChampionPoolSnapshot(
  champions: ChampionCatalogEntry[],
  patch: string,
  role: LoLRole,
  tiers: (1 | 2 | 3)[],
  seed: string
): ChampionPoolSnapshot | null {
  if (tiers.length === 0) return null;

  const startingPool = champions
    .filter((champion) => champion.lanes.includes(role))
    .map(toSnapshotChampion)
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  if (startingPool.length === 0) return null;

  let pool = [...startingPool];
  const removedChampionIds: string[] = [];

  for (const tier of tiers) {
    const removeCount = Math.floor(pool.length * NARROW_POOL_TIER_FRACTION[tier]);
    if (removeCount <= 0) continue;

    const shuffled = shuffleDeterministic(pool, `${seed}:${tier}`);
    const removed = shuffled.slice(0, removeCount);
    const removedIds = new Set(removed.map((champion) => champion.id));

    removedChampionIds.push(...removed.map((champion) => champion.id));
    pool = pool.filter((champion) => !removedIds.has(champion.id));
  }

  return {
    role,
    patch,
    appliedTiers: tiers,
    startingPool,
    removedChampionIds,
    remaining: pool,
    revealedAt: Date.now(),
  };
}
