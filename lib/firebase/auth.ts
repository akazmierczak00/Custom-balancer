import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ADMIN_EMAILS, getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/config";
import { DEFAULT_ROLE_PRIORITIES } from "@/lib/constants/roles";
import { UserProfile } from "@/types";

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
