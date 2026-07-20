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

export async function postRiotLink(uid: string, gameName: string, tagLine: string) {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/riot/link", {
    method: "POST",
    headers,
    body: JSON.stringify({ uid, gameName, tagLine }),
  });

  const data = (await response.json()) as { error?: string; gameName?: string; tagLine?: string };

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

  const data = (await response.json()) as {
    error?: string;
    status?: string;
    reason?: string;
    message?: string;
    rank?: string;
    rankDivision?: string;
    rankLp?: number;
    rankLabel?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Nie udało się zsynchronizować rangi.");
  }

  return data;
}
