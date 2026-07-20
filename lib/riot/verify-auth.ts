import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import { UserProfile } from "@/types";
export class AuthError extends Error {
  constructor(message = "Brak autoryzacji") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Brak uprawnień") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function verifyAuthToken(request: Request): Promise<{
  uid: string;
  isAdmin: boolean;
}> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError();
  }

  const token = header.slice("Bearer ".length).trim();
  const decoded = await verifyFirebaseIdToken(token);
  const userSnap = await getFirebaseAdminFirestore()
    .collection("users")
    .doc(decoded.uid)
    .get();

  const profile = userSnap.data() as UserProfile | undefined;

  return {
    uid: decoded.uid,
    isAdmin: profile?.role === "admin",
  };
}

export async function assertCanManageProfile(
  request: Request,
  targetUid: string
): Promise<{ uid: string; isAdmin: boolean }> {
  const auth = await verifyAuthToken(request);

  if (auth.uid !== targetUid && !auth.isAdmin) {
    throw new ForbiddenError("Nie możesz edytować tego profilu.");
  }

  return auth;
}
