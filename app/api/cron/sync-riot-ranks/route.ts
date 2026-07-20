import { NextResponse } from "next/server";
import { syncAllEligibleUserRanks } from "@/lib/riot/sync-user-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Brak CRON_SECRET w konfiguracji." },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  try {
    const results = await syncAllEligibleUserRanks();
    const updated = results.filter((entry) => entry.result.status === "updated").length;
    const skipped = results.filter((entry) => entry.result.status === "skipped").length;
    const errors = results.filter((entry) => entry.result.status === "error").length;

    return NextResponse.json({
      processed: results.length,
      updated,
      skipped,
      errors,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Błąd synchronizacji rang.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
