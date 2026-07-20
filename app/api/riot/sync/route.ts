import { NextResponse } from "next/server";
import { getRankLabel } from "@/lib/constants/ranks";
import { syncUserRank } from "@/lib/riot/sync-user-rank";
import {
  AuthError,
  ForbiddenError,
  verifyAuthToken,
} from "@/lib/riot/verify-auth";
import { LoLDivision, LoLRank } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { uid?: string };
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
    if (error instanceof AuthError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const message =
      error instanceof Error ? error.message : "Nie udało się zsynchronizować rangi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
