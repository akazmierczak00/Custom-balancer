import { NextResponse } from "next/server";
import { fetchAccountByRiotId, RiotApiError } from "@/lib/riot/client";
import { linkRiotAccount } from "@/lib/riot/sync-user-rank";
import {
  AuthError,
  ForbiddenError,
  verifyAuthToken,
} from "@/lib/riot/verify-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      uid?: string;
      gameName?: string;
      tagLine?: string;
    };

    const gameName = body.gameName?.trim();
    const tagLine = body.tagLine?.trim().replace(/^#/, "");

    if (!gameName || !tagLine) {
      return NextResponse.json(
        { error: "Podaj nick i tag Riot Games." },
        { status: 400 }
      );
    }

    const auth = await verifyAuthToken(request);
    const targetUid = body.uid?.trim() || auth.uid;

    if (targetUid !== auth.uid && !auth.isAdmin) {
      throw new ForbiddenError();
    }

    const account = await fetchAccountByRiotId(gameName, tagLine);
    await linkRiotAccount(targetUid, account.gameName, account.tagLine, account.puuid);

    return NextResponse.json({
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof RiotApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Nie udało się podpiąć konta Riot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
