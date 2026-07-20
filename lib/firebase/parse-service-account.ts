export type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export function parseServiceAccountJson(raw: string): FirebaseServiceAccount {
  let json = raw.trim();

  if (json.charCodeAt(0) === 0xfeff) {
    json = json.slice(1).trim();
  }

  if (
    (json.startsWith("'") && json.endsWith("'")) ||
    (json.startsWith('"') && json.endsWith('"'))
  ) {
    json = json.slice(1, -1).trim();
  }

  try {
    const parsed = JSON.parse(json) as FirebaseServiceAccount;

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("missing fields");
    }

    return parsed;
  } catch {
    throw new Error(
      "Nieprawidłowy FIREBASE_SERVICE_ACCOUNT_JSON. Wklej cały JSON z Firebase (Generate new private key) jako jedną linię, bez dodatkowych cudzysłowów na zewnątrz."
    );
  }
}
