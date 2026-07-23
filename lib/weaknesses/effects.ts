import type {
  DraftModifiers,
  Lobby,
  NoBansMode,
  NoHelpMode,
  PickOrderMode,
  SelectedWeakness,
} from "@/types";

const POLISH_CHAR_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function normalizeWeaknessName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_CHAR_MAP[char] ?? char);
}

const EXTRA_BAN_BY_TIER: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 3,
  3: 5,
};

function matchName(name: string, needle: string): boolean {
  return normalizeWeaknessName(name).includes(needle);
}

function strongestPickOrder(tiers: (1 | 2 | 3)[]): PickOrderMode {
  if (tiers.includes(3)) return "first_pick";
  if (tiers.includes(2) || tiers.includes(1)) return "first_phase";
  return null;
}

function strongestNoBans(tiers: (1 | 2 | 3)[]): NoBansMode {
  if (tiers.includes(3)) return "all";
  if (tiers.includes(2)) return "ban1";
  if (tiers.includes(1)) return "ban2";
  return null;
}

function strongestNoHelp(tiers: (1 | 2 | 3)[]): NoHelpMode {
  if (tiers.includes(3)) return "all";
  const hasBan = tiers.includes(1);
  const hasPick = tiers.includes(2);
  if (hasBan && hasPick) return "all";
  if (hasPick) return "pick";
  if (hasBan) return "ban";
  return null;
}

export function resolveDraftModifiers(
  lobby: Pick<Lobby, "createdBy" | "team1" | "team2" | "weaknesses">
): DraftModifiers | null {
  const adrianUid = lobby.createdBy;
  const onTeam1 = lobby.team1.some((p) => p.uid === adrianUid);
  const onTeam2 = lobby.team2.some((p) => p.uid === adrianUid);
  if (!onTeam1 && !onTeam2) return null;

  const selected: SelectedWeakness[] = lobby.weaknesses?.selected ?? [];
  const adrianTeam: 1 | 2 = onTeam1 ? 1 : 2;

  let extraBans = 0;
  const pickOrderTiers: (1 | 2 | 3)[] = [];
  const noBansTiers: (1 | 2 | 3)[] = [];
  const noHelpTiers: (1 | 2 | 3)[] = [];
  let hasNarrowPool = false;

  for (const item of selected) {
    if (matchName(item.name, "dodatkowe bany")) {
      extraBans += EXTRA_BAN_BY_TIER[item.tier] ?? 0;
    } else if (matchName(item.name, "kolejnosc pickowania")) {
      pickOrderTiers.push(item.tier);
    } else if (matchName(item.name, "brak banow")) {
      noBansTiers.push(item.tier);
    } else if (matchName(item.name, "champion select bez pomocy")) {
      noHelpTiers.push(item.tier);
    } else if (matchName(item.name, "zawezona pula champion")) {
      hasNarrowPool = true;
    }
  }

  return {
    adrianUid,
    adrianTeam,
    extraBans,
    noBans: strongestNoBans(noBansTiers),
    pickOrderMode: strongestPickOrder(pickOrderTiers),
    noHelp: strongestNoHelp(noHelpTiers),
    hasNarrowPool,
  };
}
