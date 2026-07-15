import { NextResponse } from "next/server";
import { fetchChampionCatalog } from "@/lib/champions/fetch-champions";

export const revalidate = 86_400;

export async function GET() {
  try {
    const catalog = await fetchChampionCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się załadować championów.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
