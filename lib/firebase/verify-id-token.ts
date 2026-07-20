import { createRemoteJWKSet, jwtVerify } from "jose";
import { getServiceAccountRaw, parseServiceAccountJson } from "@/lib/firebase/parse-service-account";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }
  return jwks;
}

function getFirebaseProjectId(): string {
  const fromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;

  return parseServiceAccountJson(getServiceAccountRaw()).project_id;
}

export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string }> {
  const projectId = getFirebaseProjectId();

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) {
    throw new Error("Nieprawidłowy token Firebase.");
  }

  return { uid: payload.sub };
}
