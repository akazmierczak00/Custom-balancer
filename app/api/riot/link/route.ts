import { NextResponse } from "next/server";

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

  if (error && typeof error === "object" && "name" in error && error.name === "RiotApiError") {
    const status =
      "status" in error && typeof error.status === "number" ? error.status : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : fallback },
      { status }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}

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

    const { fetchAccountByRiotId } = await import("@/lib/riot/client");
    const { linkRiotAccount } = await import("@/lib/riot/sync-user-rank");
    const { ForbiddenError, verifyAuthToken } = await import("@/lib/riot/verify-auth");

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
    return errorResponse(error, "Nie udało się podpiąć konta Riot.");
  }
}
