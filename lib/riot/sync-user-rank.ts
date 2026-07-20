import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  fetchLeagueEntriesByPuuid,
  RiotApiError,
  sleep,
} from "@/lib/riot/client";
import { getSoloDuoEntry, mapRiotLeagueEntry } from "@/lib/riot/map-rank";
import { UserProfile } from "@/types";

export type SyncUserRankResult =
  | {
      status: "updated";
      rank: string;
      rankDivision?: string;
      rankLp?: number;
    }
  | { status: "skipped"; reason: "manual" | "disabled" | "no_account" | "unranked" }
  | { status: "error"; message: string };

export async function syncUserRank(
  uid: string,
  options?: { force?: boolean }
): Promise<SyncUserRankResult> {
  const db = getFirebaseAdminFirestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return { status: "error", message: "Profil nie istnieje." };
  }

  const profile = userSnap.data() as UserProfile;

  if (!profile.riotPuuid) {
    return { status: "skipped", reason: "no_account" };
  }

  if (profile.rankSource === "manual" && !options?.force) {
    return { status: "skipped", reason: "manual" };
  }

  if (profile.riotSyncDisabled && !options?.force) {
    return { status: "skipped", reason: "disabled" };
  }

  try {
    const entries = await fetchLeagueEntriesByPuuid(profile.riotPuuid);
    const soloEntry = getSoloDuoEntry(entries);

    if (!soloEntry) {
      return { status: "skipped", reason: "unranked" };
    }

    const mapped = mapRiotLeagueEntry(soloEntry);
    if (!mapped) {
      return { status: "error", message: "Nie udało się zmapować rangi z Riot API." };
    }

    await userRef.update({
      rank: mapped.rank,
      rankDivision: mapped.rankDivision ?? FieldValue.delete(),
      rankLp: mapped.rankLp ?? FieldValue.delete(),
      rankSource: "riot",
      riotRankSyncedAt: Timestamp.now(),
    });

    return {
      status: "updated",
      rank: mapped.rank,
      ...(mapped.rankDivision ? { rankDivision: mapped.rankDivision } : {}),
      ...(mapped.rankLp !== undefined ? { rankLp: mapped.rankLp } : {}),
    };
  } catch (error) {
    if (error instanceof RiotApiError) {
      return { status: "error", message: error.message };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Błąd synchronizacji rangi.",
    };
  }
}

export async function linkRiotAccount(
  uid: string,
  gameName: string,
  tagLine: string,
  puuid: string
) {
  const db = getFirebaseAdminFirestore();
  await db.collection("users").doc(uid).set(
    {
      riotGameName: gameName.trim(),
      riotTagLine: tagLine.trim(),
      riotPuuid: puuid,
      riotLinkedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function syncAllEligibleUserRanks() {
  const db = getFirebaseAdminFirestore();
  const snapshot = await db.collection("users").get();

  const results: Array<{ uid: string; result: SyncUserRankResult }> = [];

  for (const docSnap of snapshot.docs) {
    const profile = docSnap.data() as UserProfile;

    if (!profile.riotPuuid || profile.riotSyncDisabled || profile.rankSource === "manual") {
      continue;
    }

    const result = await syncUserRank(docSnap.id);
    results.push({ uid: docSnap.id, result });
    await sleep(150);
  }

  return results;
}
