import laneOverrides from "@/lib/champions/lane-overrides.json";
import { ChampionCatalogEntry } from "@/lib/champions/types";
import { LoLRole } from "@/types";

const SUMMONERS_RIFT_MAP_ID = 11;
const DDRAGON_VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const RUNE_RECOMMENDATIONS_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-rune-recommendations.json";

const POSITION_TO_LANE: Record<string, LoLRole> = {
  TOP: "top",
  JUNGLE: "jungle",
  MIDDLE: "mid",
  BOTTOM: "adc",
  UTILITY: "support",
};

type DdragonChampion = {
  id: string;
  key: string;
  name: string;
  image: { full: string };
};

type DdragonChampionFile = {
  data: Record<string, DdragonChampion>;
};

type RuneRecommendationEntry = {
  championId: number;
  runeRecommendations: {
    position: string;
    mapId: number;
  }[];
};

const LANE_ORDER: LoLRole[] = ["top", "jungle", "mid", "adc", "support"];

function isLoLRole(value: string): value is LoLRole {
  return LANE_ORDER.includes(value as LoLRole);
}

function sortLanes(lanes: LoLRole[]): LoLRole[] {
  return [...lanes].sort(
    (a, b) => LANE_ORDER.indexOf(a) - LANE_ORDER.indexOf(b)
  );
}

function getOverrideLanes(championId: string): LoLRole[] | null {
  const overrides = laneOverrides as Record<string, string[]>;
  const lanes = overrides[championId];
  if (!lanes) return null;
  return sortLanes(lanes.filter(isLoLRole));
}

function lanesFromRuneRecommendations(
  recommendations: RuneRecommendationEntry[]
): Map<string, Set<LoLRole>> {
  const lanesByKey = new Map<string, Set<LoLRole>>();

  for (const entry of recommendations) {
    const championKey = String(entry.championId);
    const lanes = lanesByKey.get(championKey) ?? new Set<LoLRole>();

    for (const recommendation of entry.runeRecommendations) {
      if (recommendation.mapId !== SUMMONERS_RIFT_MAP_ID) continue;
      const lane = POSITION_TO_LANE[recommendation.position];
      if (lane) lanes.add(lane);
    }

    if (lanes.size > 0) {
      lanesByKey.set(championKey, lanes);
    }
  }

  return lanesByKey;
}

async function getLatestDdragonVersion(): Promise<string> {
  const response = await fetch(DDRAGON_VERSIONS_URL, {
    next: { revalidate: 86_400 },
  });
  if (!response.ok) {
    throw new Error("Nie udało się pobrać wersji Data Dragon.");
  }

  const versions = (await response.json()) as string[];
  const version = versions[0];
  if (!version) {
    throw new Error("Brak wersji Data Dragon.");
  }
  return version;
}

export async function fetchChampionCatalog(): Promise<{
  patch: string;
  champions: ChampionCatalogEntry[];
}> {
  const [version, runeResponse] = await Promise.all([
    getLatestDdragonVersion(),
    fetch(RUNE_RECOMMENDATIONS_URL, { next: { revalidate: 86_400 } }),
  ]);

  const championResponse = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/pl_PL/champion.json`,
    { next: { revalidate: 86_400 } }
  );

  if (!championResponse.ok) {
    throw new Error("Nie udało się pobrać listy championów.");
  }
  if (!runeResponse.ok) {
    throw new Error("Nie udało się pobrać runowych rekomendacji championów.");
  }

  const championFile = (await championResponse.json()) as DdragonChampionFile;
  const runeRecommendations =
    (await runeResponse.json()) as RuneRecommendationEntry[];
  const lanesByKey = lanesFromRuneRecommendations(runeRecommendations);

  const champions = Object.values(championFile.data)
    .map((champion) => {
      const overrideLanes = getOverrideLanes(champion.id);
      const detectedLanes = sortLanes([
        ...Array.from(lanesByKey.get(champion.key) ?? []),
      ]);

      return {
        id: champion.id,
        key: champion.key,
        name: champion.name,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.image.full}`,
        lanes: overrideLanes ?? detectedLanes,
      } satisfies ChampionCatalogEntry;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return { patch: version, champions };
}
