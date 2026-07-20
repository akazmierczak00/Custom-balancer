import { NextResponse } from "next/server";
import { getRankLabel } from "@/lib/constants/ranks";
import { LoLDivision, LoLRank } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function errorResponse(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error.name === "AuthError" || error.name === "ForbiddenError")
  ) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : fallback },
      { status: 403 }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { uid?: string };

    const { syncUserRank } = await import("@/lib/riot/sync-user-rank");
    const { ForbiddenError, verifyAuthToken } = await import("@/lib/riot/verify-auth");

    const auth = await verifyAuthToken(request);
    const targetUid = body.uid?.trim() || auth.uid;

    if (targetUid !== auth.uid && !auth.isAdmin) {
      throw new ForbiddenError();
    }

    const result = await syncUserRank(targetUid);

    if (result.status === "error") {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    if (result.status === "skipped") {
      const messages: Record<string, string> = {
        manual: "Ranga ustawiona ręcznie przez admina — sync z Riot pominięty.",
        disabled: "Automatyczna synchronizacja jest wyłączona dla tego profilu.",
        no_account: "Brak podpiętego konta Riot Games.",
        unranked: "Brak rangi Solo/Duo na koncie Riot.",
      };

      return NextResponse.json({
        status: result.status,
        reason: result.reason,
        message: messages[result.reason],
      });
    }

    return NextResponse.json({
      status: result.status,
      rank: result.rank,
      rankDivision: result.rankDivision,
      rankLp: result.rankLp,
      rankLabel: getRankLabel(
        result.rank as LoLRank,
        result.rankDivision as LoLDivision | undefined,
        result.rankLp
      ),
    });
  } catch (error) {
    return errorResponse(error, "Nie udało się zsynchronizować rangi.");
  }
}
