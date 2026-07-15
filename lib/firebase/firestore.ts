import {
  collection,
  doc,
  documentId,
  onSnapshot,
  query,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import { normalizeLobby } from "@/lib/lobby/firestore-lobby";
import { Lobby, UserProfile, Weakness } from "@/types";

const COMPLETED_LOBBIES_LIMIT = 20;
const USER_SUBSCRIBE_CHUNK_SIZE = 10;

export function subscribeToUser(
  uid: string,
  callback: (profile: UserProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(getFirebaseDb(), "users", uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ uid, ...snap.data() } as UserProfile);
  });
}

export function subscribeToLobby(
  lobbyId: string,
  callback: (lobby: Lobby | null) => void
): Unsubscribe {
  return onSnapshot(doc(getFirebaseDb(), "lobbies", lobbyId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(normalizeLobby({ id: snap.id, ...snap.data() } as Lobby));
  });
}

export function subscribeToActiveLobbies(
  callback: (lobbies: Lobby[]) => void
): Unsubscribe {
  const q = query(
    collection(getFirebaseDb(), "lobbies"),
    where("status", "in", [
      "open",
      "confirming",
      "drafting",
      "reveal",
      "overview",
      "voting_lineup",
      "locked_lineup",
      "reshuffle_reveal",
      "voting_proposals",
      "locked_proposals",
      "weakness_reveal",
      "weakness_pick",
      "final",
      "playing",
      "post_game",
    ])
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => normalizeLobby({ id: d.id, ...d.data() } as Lobby))
    );
  });
}

export function subscribeToCompletedLobbies(
  callback: (lobbies: Lobby[]) => void
): Unsubscribe {
  // Equality-only query avoids a composite index; sort + limit on the client.
  const q = query(
    collection(getFirebaseDb(), "lobbies"),
    where("status", "==", "session_summary")
  );

  return onSnapshot(q, (snap) => {
    const lobbies = snap.docs
      .map((d) => normalizeLobby({ id: d.id, ...d.data() } as Lobby))
      .sort((a, b) => {
        const aMs = a.updatedAt?.toMillis?.() ?? 0;
        const bMs = b.updatedAt?.toMillis?.() ?? 0;
        return bMs - aMs;
      })
      .slice(0, COMPLETED_LOBBIES_LIMIT);

    callback(lobbies);
  });
}

export function subscribeToAllUsers(
  callback: (users: UserProfile[]) => void
): Unsubscribe {
  return onSnapshot(collection(getFirebaseDb(), "users"), (snap) => {
    callback(
      snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as UserProfile)
    );
  });
}

export function subscribeToWeaknesses(
  callback: (weaknesses: Weakness[]) => void
): Unsubscribe {
  return onSnapshot(collection(getFirebaseDb(), "weaknesses"), (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Weakness)
    );
  });
}

export function subscribeToUsers(
  uids: string[],
  callback: (users: Record<string, UserProfile>) => void
): Unsubscribe {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  if (uniqueUids.length === 0) {
    callback({});
    return () => undefined;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueUids.length; i += USER_SUBSCRIBE_CHUNK_SIZE) {
    chunks.push(uniqueUids.slice(i, i + USER_SUBSCRIBE_CHUNK_SIZE));
  }

  const chunkResults = chunks.map(() => ({} as Record<string, UserProfile>));

  const publish = () => {
    const merged: Record<string, UserProfile> = {};
    for (const chunk of chunkResults) {
      Object.assign(merged, chunk);
    }

    const filtered: Record<string, UserProfile> = {};
    for (const uid of uniqueUids) {
      if (merged[uid]) {
        filtered[uid] = merged[uid];
      }
    }
    callback(filtered);
  };

  const unsubs = chunks.map((chunk, chunkIndex) => {
    const q = query(
      collection(getFirebaseDb(), "users"),
      where(documentId(), "in", chunk)
    );

    return onSnapshot(q, (snap) => {
      const nextChunk: Record<string, UserProfile> = {};
      for (const docSnap of snap.docs) {
        nextChunk[docSnap.id] = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
      }
      chunkResults[chunkIndex] = nextChunk;
      publish();
    });
  });

  return () => unsubs.forEach((unsub) => unsub());
}
