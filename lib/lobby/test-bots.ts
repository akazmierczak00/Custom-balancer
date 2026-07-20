import { UserProfile } from "@/types";

export const TEST_BOT_PREFIX = "test-bot-";

export function isTestBotUid(uid: string | null): boolean {
  return !!uid && uid.startsWith(TEST_BOT_PREFIX);
}

export function botUidForUser(sourceUid: string): string {
  return `${TEST_BOT_PREFIX}${sourceUid}`;
}

export function sourceUidFromBotUid(botUid: string): string | null {
  if (!isTestBotUid(botUid)) return null;
  return botUid.slice(TEST_BOT_PREFIX.length) || null;
}

export function botNickForUser(nick: string): string {
  const trimmed = nick.trim() || "User";
  if (trimmed.toUpperCase().startsWith("BOT_")) {
    return trimmed;
  }
  return `BOT_${trimmed}`;
}

export function isRealUserProfile(profile: UserProfile): boolean {
  return !profile.isTestBot && !isTestBotUid(profile.uid);
}

/** Źródła profili dla botów — najpierw gracze spoza lobby, potem ewentualnie z lobby. */
export function pickBotSourceProfiles(
  realUsers: UserProfile[],
  seatedUids: string[],
  slotsNeeded: number
): UserProfile[] {
  if (slotsNeeded <= 0) return [];

  const seated = new Set(seatedUids);
  const outside = realUsers.filter((user) => !seated.has(user.uid));
  const inside = realUsers.filter((user) => seated.has(user.uid));
  const pool = [...outside, ...inside];

  if (pool.length === 0) {
    throw new Error("Brak prawdziwych użytkowników w bazie do sklonowania na boty.");
  }

  const picked: UserProfile[] = [];
  let index = 0;
  while (picked.length < slotsNeeded) {
    picked.push(pool[index % pool.length]!);
    index++;
  }
  return picked;
}

export function buildBotProfileFromUser(source: UserProfile): Omit<
  UserProfile,
  "createdAt"
> & { email: string; isTestBot: true } {
  return {
    uid: botUidForUser(source.uid),
    email: `${botUidForUser(source.uid)}@test.local`,
    role: "user",
    nick: botNickForUser(source.nick),
    rank: source.rank || "gold",
    ...(source.rankDivision ? { rankDivision: source.rankDivision } : {}),
    ...(source.rankLp !== undefined ? { rankLp: source.rankLp } : {}),
    ...(source.rankSource ? { rankSource: source.rankSource } : {}),
    rolePriorities: source.rolePriorities ?? [],
    wins: source.wins ?? 0,
    losses: source.losses ?? 0,
    matchHistory: source.matchHistory ?? [],
    profileComplete: true,
    achievements: [],
    isTestBot: true,
  };
}
