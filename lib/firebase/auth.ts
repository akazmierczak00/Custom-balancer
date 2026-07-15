import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { ADMIN_EMAILS, getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/config";
import { DEFAULT_ROLE_PRIORITIES } from "@/lib/constants/roles";
import { leaveLobby } from "@/lib/lobby/service";
import { Lobby, UserProfile } from "@/types";

export async function registerWithEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function logout() {
  await signOut(getFirebaseAuth());
}

export async function deleteAccount() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Nie jesteś zalogowany");

  const lobbiesSnap = await getDocs(
    query(
      collection(getFirebaseDb(), "lobbies"),
      where("slots", "array-contains", user.uid)
    )
  );

  for (const lobbyDoc of lobbiesSnap.docs) {
    const lobby = lobbyDoc.data() as Lobby;
    if (lobby.status !== "open" && lobby.status !== "confirming") {
      throw new Error(
        "Nie możesz usunąć konta, dopóki uczestniczysz w aktywnym lobby. Poczekaj na zakończenie gry."
      );
    }
  }

  for (const lobbyDoc of lobbiesSnap.docs) {
    await leaveLobby(lobbyDoc.id, user.uid);
  }

  await deleteDoc(doc(getFirebaseDb(), "users", user.uid));

  try {
    await deleteUser(user);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "auth/requires-recent-login") {
      throw new Error(
        "Ze względów bezpieczeństwa zaloguj się ponownie, a następnie usuń konto."
      );
    }
    throw error;
  }
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { uid: user.uid, ...snap.data() } as UserProfile;
  }

  const isAdmin = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
  const profile: Omit<UserProfile, "uid"> = {
    email: user.email ?? "",
    role: isAdmin ? "admin" : "user",
    nick: user.displayName ?? user.email?.split("@")[0] ?? "Gracz",
    rank: "",
    rolePriorities: DEFAULT_ROLE_PRIORITIES,
    wins: 0,
    losses: 0,
    matchHistory: [],
    profileComplete: false,
    achievements: [],
    createdAt: serverTimestamp() as UserProfile["createdAt"],
  };

  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}
