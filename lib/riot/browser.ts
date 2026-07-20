import { getFirebaseAuth } from "@/lib/firebase/config";

export async function getAuthHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("Musisz być zalogowany.");
  }

  const token = await user.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error("Pusta odpowiedź serwera.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      "Serwer zwrócił niepoprawną odpowiedź. Sprawdź FIREBASE_SERVICE_ACCOUNT_JSON i RIOT_API_KEY w .env.local, potem zrestartuj npm run dev."
    );
  }
}

export async function postRiotLink(uid: string, gameName: string, tagLine: string) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/riot/link", {
    method: "POST",
    headers,
    body: JSON.stringify({ uid, gameName, tagLine }),
  });

  const data = await parseJsonResponse<{ error?: string; gameName?: string; tagLine?: string }>(
    response
  );

  if (!response.ok) {
    throw new Error(data.error ?? "Nie udało się zapisać konta Riot.");
  }

  return data;
}

export async function postRiotSync(uid: string) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/riot/sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ uid }),
  });

  const data = await parseJsonResponse<{
    error?: string;
    status?: string;
    reason?: string;
    message?: string;
    rank?: string;
    rankDivision?: string;
    rankLp?: number;
    rankLabel?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Nie udało się zsynchronizować rangi.");
  }

  return data;
}
