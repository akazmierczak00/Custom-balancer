import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { parseServiceAccountJson, getServiceAccountRaw } from "@/lib/firebase/parse-service-account";

function getServiceAccount() {
  return parseServiceAccountJson(getServiceAccountRaw());
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const serviceAccount = getServiceAccount();

  try {
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
    });
  } catch {
    throw new Error(
      "Firebase Admin: nieprawidłowy klucz prywatny w service account. Użyj FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 w Vercel."
    );
  }
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getAdminApp());
}
