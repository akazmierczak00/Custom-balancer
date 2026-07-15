import {
  collection,
  doc,
  onSnapshot,
  query,
  Unsubscribe,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import { normalizeLobby } from "@/lib/lobby/firestore-lobby";
import { Lobby, UserProfile, Weakness } from "@/types";

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
      "cooldown",
    ])
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => normalizeLobby({ id: d.id, ...d.data() } as Lobby))
    );
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
  if (uids.length === 0) {
    callback({});
    return () => undefined;
  }

  const users: Record<string, UserProfile> = {};
  const unsubs = uids.map((uid) =>
    onSnapshot(doc(getFirebaseDb(), "users", uid), (snap) => {
      if (snap.exists()) {
        users[uid] = { uid, ...snap.data() } as UserProfile;
      } else {
        delete users[uid];
      }
      callback({ ...users });
    })
  );

  return () => unsubs.forEach((u) => u());
}
