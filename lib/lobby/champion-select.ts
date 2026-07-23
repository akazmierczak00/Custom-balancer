import { Timestamp } from "firebase/firestore";
import { REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import type { ChampionCatalogEntry } from "@/lib/champions/types";
import { resolveDraftModifiers } from "@/lib/weaknesses/effects";
import type {
  ChampionPickRef,
  ChampionSelectPhase,
  ChampionSelectState,
  ChampionSelectSwapRequest,
  ChampionSelectTurnSnapshot,
  DraftModifiers,
  Lobby,
  LobbyRoundRecord,
  LoLRole,
  PlayerAssignment,
} from "@/types";

export const CHAMPION_SELECT_TURN_SECONDS = 60;
export const CHAMPION_SELECT_SWAP_SECONDS = 10;
/** Hover/lock sentinel — świadomy ban NONE (nie timeout). */
export const CHAMPION_SELECT_BAN_NONE_ID = "__NONE__";
/** Poniżej tego progu na timerze tury nie wolno requestować ani akceptować swapa. */
export const CHAMPION_SELECT_SWAP_LOCKOUT_SECONDS = 5;

export type ChampionSelectTurnKind = "ban" | "pick";

export interface ChampionSelectTurn {
  phase: Exclude<ChampionSelectPhase, "concluded">;
  kind: ChampionSelectTurnKind;
  team: 1 | 2;
  /** Pozycja na liście drużyny od góry (0–4) — kolejność ban/pick. */
  orderIndex: number;
  /** Indeks w bans.teamN. */
  banSlot?: number;
}

/**
 * Bany naprzemiennie T1/T2.
 * Picki (snake):
 * pick1: T1P1 → T2P1 → T2P2 → T1P2 → T1P3 → T2P3
 * pick2: T2P4 → T1P4 → T1P5 → T2P5
 */
export const CHAMPION_SELECT_TURNS: ChampionSelectTurn[] = [
  { phase: "ban1", kind: "ban", team: 1, orderIndex: 0, banSlot: 0 },
  { phase: "ban1", kind: "ban", team: 2, orderIndex: 0, banSlot: 0 },
  { phase: "ban1", kind: "ban", team: 1, orderIndex: 1, banSlot: 1 },
  { phase: "ban1", kind: "ban", team: 2, orderIndex: 1, banSlot: 1 },
  { phase: "ban1", kind: "ban", team: 1, orderIndex: 2, banSlot: 2 },
  { phase: "ban1", kind: "ban", team: 2, orderIndex: 2, banSlot: 2 },
  { phase: "pick1", kind: "pick", team: 1, orderIndex: 0 },
  { phase: "pick1", kind: "pick", team: 2, orderIndex: 0 },
  { phase: "pick1", kind: "pick", team: 2, orderIndex: 1 },
  { phase: "pick1", kind: "pick", team: 1, orderIndex: 1 },
  { phase: "pick1", kind: "pick", team: 1, orderIndex: 2 },
  { phase: "pick1", kind: "pick", team: 2, orderIndex: 2 },
  { phase: "ban2", kind: "ban", team: 1, orderIndex: 3, banSlot: 3 },
  { phase: "ban2", kind: "ban", team: 2, orderIndex: 3, banSlot: 3 },
  { phase: "ban2", kind: "ban", team: 1, orderIndex: 4, banSlot: 4 },
  { phase: "ban2", kind: "ban", team: 2, orderIndex: 4, banSlot: 4 },
  { phase: "pick2", kind: "pick", team: 2, orderIndex: 3 },
  { phase: "pick2", kind: "pick", team: 1, orderIndex: 3 },
  { phase: "pick2", kind: "pick", team: 1, orderIndex: 4 },
  { phase: "pick2", kind: "pick", team: 2, orderIndex: 4 },
];

export function emptyPicks(): Record<LoLRole, ChampionPickRef | null> {
  return {
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  };
}

/** Kopia picków bezpieczna do zapisu w roundHistory. */
export function snapshotRoundPicks(
  picks: ChampionSelectState["picks"] | null | undefined
): NonNullable<LobbyRoundRecord["picks"]> {
  const copySide = (
    side: Record<LoLRole, ChampionPickRef | null> | undefined
  ): Record<LoLRole, ChampionPickRef | null> => {
    const out = emptyPicks();
    for (const role of REVEAL_ROLE_ORDER) {
      const pick = side?.[role] ?? null;
      if (pick && "none" in pick && pick.none) {
        out[role] = { none: true };
      } else if (pick && "id" in pick) {
        out[role] = {
          id: pick.id,
          key: pick.key,
          name: pick.name,
          iconUrl: pick.iconUrl,
        };
      } else {
        out[role] = null;
      }
    }
    return out;
  };

  return {
    team1: copySide(picks?.team1),
    team2: copySide(picks?.team2),
  };
}

function emptyBanSlots(count: number): (ChampionPickRef | null)[] {
  return Array.from({ length: count }, () => null);
}

/** Startowa kolejność = role od góry (Top→JG→Mid→ADC→Supp). */
export function buildPickOrder(
  lobby: Pick<Lobby, "team1" | "team2">
): NonNullable<ChampionSelectState["pickOrder"]> {
  const fromTeam = (team: PlayerAssignment[]) =>
    REVEAL_ROLE_ORDER.map(
      (role) => team.find((p) => p.role === role)?.uid ?? ""
    ).filter(Boolean);

  return {
    team1: fromTeam(lobby.team1),
    team2: fromTeam(lobby.team2),
  };
}

function pickOrderFromSeatByRole(
  seatByRole: NonNullable<ChampionSelectState["seatByRole"]>
): NonNullable<ChampionSelectState["pickOrder"]> {
  return {
    team1: REVEAL_ROLE_ORDER.map((role) => seatByRole.team1[role]).filter(
      Boolean
    ),
    team2: REVEAL_ROLE_ORDER.map((role) => seatByRole.team2[role]).filter(
      Boolean
    ),
  };
}

/** Wymusza pozycję Adriana wg obostrzenia kolejności. */
export function applyPickOrderHandicap(
  pickOrder: NonNullable<ChampionSelectState["pickOrder"]>,
  modifiers: DraftModifiers
): NonNullable<ChampionSelectState["pickOrder"]> {
  if (!modifiers.pickOrderMode) return pickOrder;

  const next = {
    team1: [...pickOrder.team1],
    team2: [...pickOrder.team2],
  };
  const key = modifiers.adrianTeam === 1 ? "team1" : "team2";
  const list = next[key];
  const idx = list.indexOf(modifiers.adrianUid);
  if (idx < 0) return next;

  const target =
    modifiers.pickOrderMode === "first_pick" ? 0 : idx > 2 ? 2 : idx;
  if (target !== idx) {
    const tmp = list[target]!;
    list[target] = list[idx]!;
    list[idx] = tmp;
  }
  return next;
}

function shouldSkipAdrianTeamBan(
  turn: ChampionSelectTurn,
  adrianTeam: 1 | 2,
  noBans: DraftModifiers["noBans"]
): boolean {
  if (!noBans || turn.kind !== "ban" || turn.team !== adrianTeam) return false;
  if (noBans === "all") return true;
  if (noBans === "ban1" && turn.phase === "ban1") return true;
  if (noBans === "ban2" && turn.phase === "ban2") return true;
  return false;
}

/**
 * Buduje tury z obostrzeń:
 * - ekstra bany przeciwnika po ban1, przed pick1 (P1)
 * - skip banów drużyny Adriana
 */
export function buildChampionSelectTurns(
  modifiers: DraftModifiers | null
): ChampionSelectTurnSnapshot[] {
  const extra = modifiers?.extraBans ?? 0;
  const enemyTeam: 1 | 2 | null = modifiers
    ? modifiers.adrianTeam === 1
      ? 2
      : 1
    : null;

  const turns: ChampionSelectTurnSnapshot[] = [];
  let extrasInserted = false;

  const insertExtraBans = () => {
    if (extrasInserted || !(extra > 0 && enemyTeam)) return;
    extrasInserted = true;
    for (let i = 0; i < extra; i++) {
      turns.push({
        phase: "ban1",
        kind: "ban",
        team: enemyTeam,
        orderIndex: 0,
        /** Po slotach ban1 (0–2), przed ban2. */
        banSlot: 3 + i,
      });
    }
  };

  for (const base of CHAMPION_SELECT_TURNS) {
    if (
      modifiers &&
      shouldSkipAdrianTeamBan(base, modifiers.adrianTeam, modifiers.noBans)
    ) {
      continue;
    }

    if (base.phase !== "ban1") {
      insertExtraBans();
    }

    let banSlot = base.banSlot;
    if (
      base.kind === "ban" &&
      banSlot != null &&
      enemyTeam &&
      base.team === enemyTeam &&
      banSlot >= 3
    ) {
      banSlot = banSlot + extra;
    }

    turns.push({
      phase: base.phase,
      kind: base.kind,
      team: base.team,
      orderIndex: base.orderIndex,
      ...(banSlot != null ? { banSlot } : {}),
    });
  }

  insertExtraBans();
  return turns;
}

export function createInitialChampionSelect(
  turnEndsAt: Timestamp,
  lobby: Lobby
): ChampionSelectState {
  const modifiers = resolveDraftModifiers(lobby);
  let pickOrder = buildPickOrder(lobby);
  if (modifiers) {
    pickOrder = applyPickOrderHandicap(pickOrder, modifiers);
  }
  const turns = buildChampionSelectTurns(modifiers);
  const enemyTeam = modifiers
    ? modifiers.adrianTeam === 1
      ? 2
      : 1
    : null;
  const extra = modifiers?.extraBans ?? 0;
  const team1BanCount =
    enemyTeam === 1 ? 5 + extra : 5;
  const team2BanCount =
    enemyTeam === 2 ? 5 + extra : 5;

  return {
    phase: turns[0]?.phase ?? "ban1",
    turnIndex: 0,
    turnEndsAt,
    hoverChampionId: null,
    pickOrder,
    turns,
    modifiers,
    swapRequests: [],
    bans: {
      team1: emptyBanSlots(team1BanCount),
      team2: emptyBanSlots(team2BanCount),
    },
    picks: {
      team1: emptyPicks(),
      team2: emptyPicks(),
    },
  };
}

export function getTurnList(
  state: ChampionSelectState | null | undefined
): ChampionSelectTurn[] {
  if (state?.turns?.length) return state.turns;
  return CHAMPION_SELECT_TURNS;
}

export function getCurrentTurn(
  state: ChampionSelectState | null | undefined
): ChampionSelectTurn | null {
  if (!state || state.phase === "concluded") return null;
  return getTurnList(state)[state.turnIndex] ?? null;
}

export function ensurePickOrder(
  state: ChampionSelectState,
  lobby: Pick<Lobby, "team1" | "team2">
): NonNullable<ChampionSelectState["pickOrder"]> {
  if (state.pickOrder?.team1?.length && state.pickOrder?.team2?.length) {
    return state.pickOrder;
  }
  if (state.seatByRole) {
    return pickOrderFromSeatByRole(state.seatByRole);
  }
  return buildPickOrder(lobby);
}

export function getPlayerForTurn(
  lobby: Pick<Lobby, "team1" | "team2">,
  turn: ChampionSelectTurn,
  state?: ChampionSelectState | null
): PlayerAssignment | null {
  const team = turn.team === 1 ? lobby.team1 : lobby.team2;
  if (state) {
    const order = ensurePickOrder(state, lobby);
    const uid = (turn.team === 1 ? order.team1 : order.team2)[turn.orderIndex];
    if (uid) {
      return team.find((p) => p.uid === uid) ?? null;
    }
  }
  const fallbackRole = REVEAL_ROLE_ORDER[turn.orderIndex];
  if (!fallbackRole) return null;
  return team.find((p) => p.role === fallbackRole) ?? null;
}

/** Osoba z P1 (lub P2 gdy P1 = Adrian) banuje/pickuje za Adriana. */
export function getNoHelpProxy(
  lobby: Pick<Lobby, "team1" | "team2">,
  state: ChampionSelectState,
  modifiers: DraftModifiers
): PlayerAssignment | null {
  const team =
    modifiers.adrianTeam === 1 ? lobby.team1 : lobby.team2;
  const order =
    modifiers.adrianTeam === 1
      ? ensurePickOrder(state, lobby).team1
      : ensurePickOrder(state, lobby).team2;
  const p1 = order[0];
  const proxyUid =
    p1 && p1 !== modifiers.adrianUid ? p1 : order[1] ?? null;
  if (!proxyUid) return null;
  return team.find((p) => p.uid === proxyUid) ?? null;
}

function noHelpAppliesToTurn(
  turn: ChampionSelectTurn,
  noHelp: DraftModifiers["noHelp"]
): boolean {
  if (!noHelp) return false;
  if (noHelp === "all") return true;
  if (noHelp === "ban") return turn.kind === "ban";
  if (noHelp === "pick") return turn.kind === "pick";
  return false;
}

/**
 * Kto klika na turze: zwykle owner slotu; przy „bez pomocy” — proxy za Adriana.
 */
export function getActingPlayerForTurn(
  lobby: Pick<Lobby, "team1" | "team2" | "createdBy">,
  turn: ChampionSelectTurn,
  state: ChampionSelectState
): PlayerAssignment | null {
  const seat = getPlayerForTurn(lobby, turn, state);
  if (!seat) return null;

  const modifiers = state.modifiers ?? resolveDraftModifiers(lobby as Lobby);
  if (!modifiers?.noHelp) return seat;
  if (seat.uid !== modifiers.adrianUid) return seat;
  if (!noHelpAppliesToTurn(turn, modifiers.noHelp)) return seat;

  return getNoHelpProxy(lobby, state, modifiers) ?? seat;
}

export function swapPairKey(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}:${uidB}` : `${uidB}:${uidA}`;
}

export function pruneExpiredSwapRequests(
  requests: ChampionSelectSwapRequest[] | undefined,
  nowMs = Date.now()
): ChampionSelectSwapRequest[] {
  return (requests ?? []).filter((r) => r.expiresAt.toMillis() > nowMs);
}

export function isChampionSelectSwapWindowOpen(
  state: ChampionSelectState,
  nowMs = Date.now()
): boolean {
  if (state.phase === "concluded" || !state.turnEndsAt) return false;
  const remainingMs = state.turnEndsAt.toMillis() - nowMs;
  return remainingMs >= CHAMPION_SELECT_SWAP_LOCKOUT_SECONDS * 1000;
}

/** Walidacja swapa względem obostrzenia kolejności. */
export function isPickOrderSwapAllowed(
  state: ChampionSelectState,
  lobby: Pick<Lobby, "team1" | "team2" | "createdBy">,
  fromUid: string,
  toUid: string,
  team: 1 | 2
): boolean {
  const modifiers = state.modifiers ?? resolveDraftModifiers(lobby as Lobby);
  if (!modifiers?.pickOrderMode) return true;
  if (team !== modifiers.adrianTeam) return true;

  const order = ensurePickOrder(state, lobby);
  const list = team === 1 ? order.team1 : order.team2;
  const iFrom = list.indexOf(fromUid);
  const iTo = list.indexOf(toUid);
  if (iFrom < 0 || iTo < 0) return false;

  const adrian = modifiers.adrianUid;
  const involvesAdrian = fromUid === adrian || toUid === adrian;

  if (modifiers.pickOrderMode === "first_pick") {
    return !involvesAdrian;
  }

  // first_phase: Adrian tylko w obrębie pozycji 0–2
  if (involvesAdrian) {
    return iFrom <= 2 && iTo <= 2;
  }
  return true;
}

/** Zamienia tylko kolejność na liście — role i picki zostają przy graczach. */
export function applyPickOrderSwap(
  state: ChampionSelectState,
  lobby: Pick<Lobby, "team1" | "team2" | "createdBy">,
  fromUid: string,
  toUid: string,
  team: 1 | 2
): ChampionSelectState {
  if (!isPickOrderSwapAllowed(state, lobby, fromUid, toUid, team)) {
    throw new Error("Ta wymiana jest zablokowana przez obostrzenie");
  }

  const pickOrder = {
    team1: [...ensurePickOrder(state, lobby).team1],
    team2: [...ensurePickOrder(state, lobby).team2],
  };
  const teamKey = team === 1 ? "team1" : "team2";
  const list = pickOrder[teamKey];
  const iFrom = list.indexOf(fromUid);
  const iTo = list.indexOf(toUid);
  if (iFrom < 0 || iTo < 0 || iFrom === iTo) {
    throw new Error("Nie można wymienić kolejności z tym graczem");
  }

  list[iFrom] = toUid;
  list[iTo] = fromUid;

  const pair = swapPairKey(fromUid, toUid);
  const swapRequests = pruneExpiredSwapRequests(state.swapRequests).filter(
    (r) => swapPairKey(r.fromUid, r.toUid) !== pair
  );

  return {
    ...state,
    pickOrder,
    swapRequests,
    hoverChampionId: null,
  };
}

export function isChampionPickRef(
  value: ChampionPickRef | null | undefined
): value is Exclude<ChampionPickRef, { none: true }> {
  return !!value && !("none" in value && value.none);
}

export function collectTakenChampionIds(
  state: ChampionSelectState
): Set<string> {
  const taken = new Set<string>();
  for (const ban of [...state.bans.team1, ...state.bans.team2]) {
    if (isChampionPickRef(ban)) taken.add(ban.id);
  }
  for (const role of REVEAL_ROLE_ORDER) {
    const p1 = state.picks.team1[role];
    const p2 = state.picks.team2[role];
    if (isChampionPickRef(p1)) taken.add(p1.id);
    if (isChampionPickRef(p2)) taken.add(p2.id);
  }
  return taken;
}

export function toChampionPickRef(
  champion: Pick<ChampionCatalogEntry, "id" | "key" | "name" | "iconUrl">
): Exclude<ChampionPickRef, { none: true }> {
  return {
    id: champion.id,
    key: champion.key,
    name: champion.name,
    iconUrl: champion.iconUrl,
  };
}

/**
 * Legalni championi na turę.
 * Przy picku Adriana (lub proxy za niego) + zawężonej puli — tylko remaining.
 */
export function getLegalChampions(options: {
  catalog: ChampionCatalogEntry[];
  state: ChampionSelectState;
  turn: ChampionSelectTurn;
  /** Owner slotu (Adrian przy jego picku) — do zawężonej puli. */
  seatUid: string;
  adrianUid: string;
  narrowRemainingIds: Set<string> | null;
}): ChampionCatalogEntry[] {
  const taken = collectTakenChampionIds(options.state);
  let pool = options.catalog.filter((c) => !taken.has(c.id));

  if (
    options.turn.kind === "pick" &&
    options.seatUid === options.adrianUid &&
    options.narrowRemainingIds &&
    options.narrowRemainingIds.size > 0
  ) {
    pool = pool.filter((c) => options.narrowRemainingIds!.has(c.id));
  }

  return pool;
}

export function pickRandomLegalChampion(
  legal: ChampionCatalogEntry[]
): ChampionCatalogEntry | null {
  if (legal.length === 0) return null;
  return legal[Math.floor(Math.random() * legal.length)] ?? null;
}

export function applyActionToState(
  state: ChampionSelectState,
  turn: ChampionSelectTurn,
  pick: ChampionPickRef,
  /** Rola z profilu właściciela slotu — pick zapisujemy pod rolą. */
  seatRole: LoLRole
): ChampionSelectState {
  const next: ChampionSelectState = {
    ...state,
    bans: {
      team1: [...state.bans.team1],
      team2: [...state.bans.team2],
    },
    picks: {
      team1: { ...state.picks.team1 },
      team2: { ...state.picks.team2 },
    },
    hoverChampionId: null,
  };

  if (turn.kind === "ban") {
    const slot = turn.banSlot ?? 0;
    const key = turn.team === 1 ? "team1" : "team2";
    next.bans[key][slot] = pick;
  } else {
    const key = turn.team === 1 ? "team1" : "team2";
    next.picks[key][seatRole] = pick;
  }

  return advanceChampionSelect(next);
}

export function advanceChampionSelect(
  state: ChampionSelectState
): ChampionSelectState {
  const turns = getTurnList(state);
  const nextIndex = state.turnIndex + 1;
  if (nextIndex >= turns.length) {
    return {
      ...state,
      phase: "concluded",
      turnIndex: nextIndex,
      turnEndsAt: null,
      hoverChampionId: null,
    };
  }

  const nextTurn = turns[nextIndex]!;
  return {
    ...state,
    phase: nextTurn.phase,
    turnIndex: nextIndex,
    hoverChampionId: null,
    turnEndsAt: Timestamp.fromMillis(
      Date.now() + CHAMPION_SELECT_TURN_SECONDS * 1000
    ),
  };
}

export function getNarrowRemainingIdSet(
  lobby: Lobby
): Set<string> | null {
  const remaining = lobby.weaknesses?.championPool?.remaining;
  if (!remaining?.length) return null;
  return new Set(remaining.map((c) => c.id));
}

export function describeDraftModifiers(modifiers: DraftModifiers | null): string[] {
  if (!modifiers) return [];
  const lines: string[] = [];
  if (modifiers.pickOrderMode === "first_pick") {
    lines.push("First pick — Adrian na P1, bez swapów");
  } else if (modifiers.pickOrderMode === "first_phase") {
    lines.push("Pick w 1. fazie — Adrian w pierwszej trójce");
  }
  if (modifiers.extraBans > 0) {
    lines.push(`+${modifiers.extraBans} banów po ban1 dla przeciwnika (P1)`);
  }
  if (modifiers.noBans === "all") {
    lines.push("Brak banów drużyny Adriana");
  } else if (modifiers.noBans === "ban1") {
    lines.push("Brak pierwszych banów drużyny Adriana");
  } else if (modifiers.noBans === "ban2") {
    lines.push("Brak drugich banów drużyny Adriana");
  }
  if (modifiers.noHelp === "all") {
    lines.push("CS bez pomocy — proxy P1/P2 za Adriana");
  } else if (modifiers.noHelp === "ban") {
    lines.push("Bez pomocy przy banach — proxy za Adriana");
  } else if (modifiers.noHelp === "pick") {
    lines.push("Bez pomocy przy pickach — proxy za Adriana");
  }
  if (modifiers.hasNarrowPool) {
    lines.push("Zawężona pula Adriana");
  }
  return lines;
}
