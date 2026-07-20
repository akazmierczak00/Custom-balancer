const RIOT_API_KEY = process.env.RIOT_API_KEY;

export class RiotApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
  }
}

function getApiKey(): string {
  if (!RIOT_API_KEY) {
    throw new Error("Brak RIOT_API_KEY w zmiennych środowiskowych.");
  }
  return RIOT_API_KEY;
}

async function riotFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": getApiKey(),
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new RiotApiError("Nie znaleziono konta Riot Games.", 404);
  }

  if (response.status === 429) {
    throw new RiotApiError("Limit zapytań Riot API — spróbuj za chwilę.", 429);
  }

  if (!response.ok) {
    throw new RiotApiError(
      `Błąd Riot API (${response.status}).`,
      response.status
    );
  }

  return (await response.json()) as T;
}

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type RiotLeagueEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
};

export async function fetchAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  const encodedName = encodeURIComponent(gameName);
  const encodedTag = encodeURIComponent(tagLine);

  return riotFetch<RiotAccount>(
    `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`
  );
}

export async function fetchLeagueEntriesByPuuid(
  puuid: string
): Promise<RiotLeagueEntry[]> {
  return riotFetch<RiotLeagueEntry[]>(
    `https://eun1.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
