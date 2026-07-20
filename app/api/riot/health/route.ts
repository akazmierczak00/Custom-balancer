import { NextResponse } from "next/server";
import { checkServiceAccountConfig } from "@/lib/firebase/parse-service-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = checkServiceAccountConfig();
  const riotKey = !!process.env.RIOT_API_KEY?.trim();
  const cronSecret = !!process.env.CRON_SECRET?.trim();

  return NextResponse.json({
    ok: firebase.configured && riotKey,
    firebase,
    riotKey,
    cronSecret,
  });
}
