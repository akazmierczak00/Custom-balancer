export type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export function getServiceAccountRaw(): string {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (base64) {
    try {
      return Buffer.from(base64, "base64").toString("utf8");
    } catch {
      throw new Error(
        "Nieprawidłowy FIREBASE_SERVICE_ACCOUNT_JSON_BASE64. Wygeneruj go z pliku JSON service account."
      );
    }
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) {
    throw new Error(
      "Brak FIREBASE_SERVICE_ACCOUNT_JSON (lub FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) w zmiennych środowiskowych."
    );
  }

  return json;
}

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

    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");

    return parsed;
  } catch {
    throw new Error(
      "Nieprawidłowy FIREBASE_SERVICE_ACCOUNT_JSON. W Vercel najlepiej użyć FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (patrz .env.example)."
    );
  }
}

export function checkServiceAccountConfig(): {
  configured: boolean;
  method: "base64" | "json" | "missing";
  error?: string;
} {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!base64 && !json) {
    return { configured: false, method: "missing" };
  }

  try {
    parseServiceAccountJson(getServiceAccountRaw());
    return { configured: true, method: base64 ? "base64" : "json" };
  } catch (error) {
    return {
      configured: false,
      method: base64 ? "base64" : "json",
      error: error instanceof Error ? error.message : "Invalid config",
    };
  }
}
