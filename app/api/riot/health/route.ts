import { NextResponse } from "next/server";
import { checkServiceAccountConfig } from "@/lib/firebase/parse-service-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = checkServiceAccountConfig();
  const riotKey = !!process.env.RIOT_API_KEY?.trim();
  const cronSecret = !!process.env.CRON_SECRET?.trim();

  let adminInit = false;
  let adminError: string | undefined;

  if (firebase.configured) {
    try {
      const { getFirebaseAdminAuth } = await import("@/lib/firebase/admin");
      getFirebaseAdminAuth();
      adminInit = true;
    } catch (error) {
      adminError =
        error instanceof Error ? error.message : "Firebase Admin init failed";
    }
  }

  return NextResponse.json({
    ok: firebase.configured && riotKey && adminInit,
    firebase,
    adminInit,
    adminError,
    riotKey,
    cronSecret,
  });
}
