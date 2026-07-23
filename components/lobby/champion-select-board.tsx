"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { getRoleLabel, REVEAL_ROLE_ORDER, ROLES } from "@/lib/constants/roles";
import type { ChampionCatalogEntry } from "@/lib/champions/types";
import {
  CHAMPION_SELECT_BAN_NONE_ID,
  collectTakenChampionIds,
  describeDraftModifiers,
  ensurePickOrder,
  getActingPlayerForTurn,
  getCurrentTurn,
  getLegalChampions,
  getNarrowRemainingIdSet,
  getPlayerForTurn,
  isChampionPickRef,
  isChampionSelectSwapWindowOpen,
  isPickOrderSwapAllowed,
  pruneExpiredSwapRequests,
} from "@/lib/lobby/champion-select";
import {
  adminSetLobbyPhase,
  cancelChampionSelectSwap,
  hoverChampionSelect,
  lockChampionSelectAction,
  pruneChampionSelectSwaps,
  requestChampionSelectSwap,
  resolveChampionSelectTimeout,
  respondChampionSelectSwap,
  setWinner,
  startChampionSelect,
} from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import type {
  ChampionPickRef,
  ChampionSelectTurnSnapshot,
  DraftModifiers,
  Lobby,
  LoLRole,
  PlayerAssignment,
} from "@/types";

interface ChampionSelectBoardProps {
  lobby: Lobby;
  currentUid: string;
  isAdmin: boolean;
}

function extraBanCountForTeam(
  team: 1 | 2,
  modifiers: DraftModifiers | null | undefined
): number {
  if (!modifiers?.extraBans) return 0;
  const enemyTeam = modifiers.adrianTeam === 1 ? 2 : 1;
  return team === enemyTeam ? modifiers.extraBans : 0;
}

function TeamBanColumn({
  team,
  bans,
  extraCount,
  turn,
  hoverChampion,
  hoverBanNone,
  align,
}: {
  team: 1 | 2;
  bans: (ChampionPickRef | null)[];
  extraCount: number;
  turn: ChampionSelectTurnSnapshot | null;
  hoverChampion: ChampionCatalogEntry | null;
  hoverBanNone: boolean;
  align: "start" | "end";
}) {
  /** Sloty ban1 to 0–2; ekstra bany zaczynają się od 3; ban2 idzie po ekstra. */
  const ban1Count = 3;
  const extraStart = ban1Count;
  const regularIndices =
    extraCount > 0
      ? [
          ...Array.from({ length: ban1Count }, (_, i) => i),
          ...Array.from(
            { length: Math.max(0, bans.length - ban1Count - extraCount) },
            (_, i) => ban1Count + extraCount + i
          ),
        ]
      : bans.map((_, i) => i);
  const extraIndices =
    extraCount > 0
      ? Array.from({ length: extraCount }, (_, i) => extraStart + i)
      : [];
  const justify = align === "start" ? "justify-start" : "justify-end";

  const slotProps = (i: number, size: "sm" | "md") => {
    const isActive =
      !!turn && turn.kind === "ban" && turn.team === team && turn.banSlot === i;
    return {
      value: bans[i] ?? null,
      size,
      active: isActive,
      hover: isActive ? hoverChampion : null,
      hoverNone: hoverBanNone && isActive,
    };
  };

  return (
    <div className={cn("flex flex-col gap-1", align === "start" ? "items-start" : "items-end")}>
      {extraIndices.length > 0 && (
        <div className={cn("flex gap-1", justify)}>
          {extraIndices.map((slot) => (
            <BanSlot key={`b${team}-extra-${slot}`} {...slotProps(slot, "sm")} />
          ))}
        </div>
      )}
      <div className={cn("flex gap-1.5", justify)}>
        {regularIndices.map((slot) => (
          <BanSlot key={`b${team}-${slot}`} {...slotProps(slot, "md")} />
        ))}
      </div>
    </div>
  );
}

function useExpiresInSeconds(expiresAtMs: number | null): number {
  const [remaining, setRemaining] = useState(() =>
    expiresAtMs == null ? 0 : Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
  );

  useEffect(() => {
    if (expiresAtMs == null) {
      setRemaining(0);
      return;
    }
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [expiresAtMs]);

  return remaining;
}

function BanSlot({
  value,
  active,
  hover,
  hoverNone,
  size = "md",
}: {
  value: ChampionPickRef | null;
  active?: boolean;
  hover?: ChampionCatalogEntry | null;
  hoverNone?: boolean;
  size?: "sm" | "md";
}) {
  const showHover = !value && !!hover;
  const showNoneHover = !value && !!hoverNone;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md border bg-slate-950/60",
        size === "sm" ? "h-9 w-9" : "h-12 w-12",
        active ? "border-amber-400/70 ring-1 ring-amber-400/40" : "border-slate-700",
        value && "none" in value && value.none && "opacity-50"
      )}
    >
      {isChampionPickRef(value) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value.iconUrl} alt={value.name} className="h-full w-full object-cover" />
      ) : value && "none" in value ? (
        <span className="text-[9px] font-bold text-slate-500">NONE</span>
      ) : showNoneHover ? (
        <span className="text-[9px] font-bold text-slate-400 opacity-70">NONE</span>
      ) : showHover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hover.iconUrl}
          alt={hover.name}
          className="h-full w-full object-cover opacity-60"
          title={hover.name}
        />
      ) : (
        <span className="text-slate-600">·</span>
      )}
    </div>
  );
}

function PlayerPortrait({
  player,
  pick,
  hover,
  isActiveTurn,
  side,
  swapMode,
  swapExpiresAtMs,
  canRequestSwap,
  onRequestSwap,
  onAcceptSwap,
  onDeclineSwap,
  onCancelSwap,
}: {
  player: PlayerAssignment;
  pick: ChampionPickRef | null;
  hover: ChampionCatalogEntry | null;
  isActiveTurn: boolean;
  side: "left" | "right";
  swapMode: "none" | "incoming" | "outgoing";
  swapExpiresAtMs: number | null;
  canRequestSwap: boolean;
  onRequestSwap: () => void;
  onAcceptSwap: () => void;
  onDeclineSwap: () => void;
  onCancelSwap: () => void;
}) {
  const display = isChampionPickRef(pick)
    ? pick
    : hover
      ? hover
      : null;
  const swapRemaining = useExpiresInSeconds(
    swapMode === "none" ? null : swapExpiresAtMs
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-2 py-1.5",
        isActiveTurn
          ? "border-amber-400/60 bg-amber-950/30 ring-1 ring-amber-400/30"
          : swapMode !== "none"
            ? "border-indigo-500/50 bg-indigo-950/30"
            : "border-slate-700/80 bg-slate-900/50",
        canRequestSwap && "cursor-pointer transition-colors hover:border-indigo-500/60"
      )}
      onClick={() => {
        if (canRequestSwap) onRequestSwap();
      }}
      title={canRequestSwap ? "Swap" : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          side === "right" && "flex-row-reverse text-right"
        )}
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950">
          {display ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={display.iconUrl}
              alt={display.name}
              className={cn(
                "h-full w-full object-cover",
                !pick && hover && "opacity-60"
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-600">
              ?
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {player.nick}
          </p>
          <p className="text-[11px] text-slate-400">
            {getRoleLabel(player.role)}
          </p>
          {display && (
            <p className="truncate text-[11px] text-slate-300">
              {display.name}
              {!pick && hover ? "…" : ""}
            </p>
          )}
        </div>
      </div>

      {swapMode === "incoming" && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            side === "right" && "justify-end"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-indigo-300">Wymiana {swapRemaining}s</span>
          <Button size="sm" className="h-7 px-2 text-xs" onClick={onAcceptSwap}>
            Akceptuj
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onDeclineSwap}
          >
            Odrzuć
          </Button>
        </div>
      )}

      {swapMode === "outgoing" && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            side === "right" && "justify-end"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-indigo-300">
            Oczekiwanie {swapRemaining}s
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onCancelSwap}
          >
            Anuluj
          </Button>
        </div>
      )}
    </div>
  );
}

export function ChampionSelectBoard({
  lobby,
  currentUid,
  isAdmin,
}: ChampionSelectBoardProps) {
  const state = lobby.championSelect;
  const [catalog, setCatalog] = useState<ChampionCatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<LoLRole | "all">("all");
  const [locking, setLocking] = useState(false);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const turn = getCurrentTurn(state ?? null);
  const seat = turn && state ? getPlayerForTurn(lobby, turn, state) : null;
  const actor =
    turn && state ? getActingPlayerForTurn(lobby, turn, state) : null;
  const isMyTurn = !!actor && actor.uid === currentUid;
  const concluded = state?.phase === "concluded";
  const canAct = !concluded && !!actor && (isMyTurn || isAdmin);
  const isProxyTurn =
    !!seat && !!actor && seat.uid !== actor.uid;

  const pickOrder = useMemo(
    () => (state ? ensurePickOrder(state, lobby) : null),
    [state, lobby]
  );

  const seatRole = seat?.role;
  const modifierLines = useMemo(
    () => describeDraftModifiers(state?.modifiers ?? null),
    [state?.modifiers]
  );

  const myTeamNum: 1 | 2 | null = lobby.team1.some((p) => p.uid === currentUid)
    ? 1
    : lobby.team2.some((p) => p.uid === currentUid)
      ? 2
      : null;

  const activeSwaps = useMemo(
    () => pruneExpiredSwapRequests(state?.swapRequests),
    [state?.swapRequests]
  );

  const swapWindowOpen =
    !!state && !concluded && isChampionSelectSwapWindowOpen(state);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/champions")
      .then((res) => res.json())
      .then((data: { champions?: ChampionCatalogEntry[] }) => {
        if (!cancelled) setCatalog(data.champions ?? []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remaining = usePhaseTimer(concluded ? null : (state?.turnEndsAt ?? null));

  const timeoutInFlight = useRef(false);
  useEffect(() => {
    if (concluded || !state?.turnEndsAt || remaining > 0) return;
    if (timeoutInFlight.current) return;
    timeoutInFlight.current = true;
    void resolveChampionSelectTimeout(lobby.id)
      .catch(() => undefined)
      .finally(() => {
        timeoutInFlight.current = false;
      });
  }, [remaining, concluded, state?.turnEndsAt, lobby.id]);

  useEffect(() => {
    if (concluded || !state?.swapRequests?.length) return;
    const hasExpired = state.swapRequests.some(
      (r) => r.expiresAt.toMillis() <= Date.now()
    );
    if (!hasExpired) return;
    void pruneChampionSelectSwaps(lobby.id).catch(() => undefined);
  }, [remaining, concluded, state?.swapRequests, lobby.id]);

  const takenIds = useMemo(
    () => (state ? collectTakenChampionIds(state) : new Set<string>()),
    [state]
  );

  const adrianNarrowIds = useMemo(
    () => getNarrowRemainingIdSet(lobby),
    [lobby]
  );

  const showAdrianLocks =
    !!adrianNarrowIds &&
    adrianNarrowIds.size > 0 &&
    !!turn &&
    turn.kind === "ban";

  const legalIds = useMemo(() => {
    if (!state || !turn || !seat) return null;
    return new Set(
      getLegalChampions({
        catalog,
        state,
        turn,
        seatUid: seat.uid,
        adrianUid: lobby.createdBy,
        narrowRemainingIds: adrianNarrowIds,
      }).map((c) => c.id)
    );
  }, [catalog, state, turn, seat, lobby, adrianNarrowIds]);

  const hoverChampion = useMemo(() => {
    if (!state?.hoverChampionId) return null;
    if (state.hoverChampionId === CHAMPION_SELECT_BAN_NONE_ID) return null;
    return catalog.find((c) => c.id === state.hoverChampionId) ?? null;
  }, [catalog, state?.hoverChampionId]);

  const hoverBanNone =
    turn?.kind === "ban" &&
    state?.hoverChampionId === CHAMPION_SELECT_BAN_NONE_ID;

  const filteredChampions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      // Szukanie zawsze po całej puli — ignoruj zakładkę roli.
      if (!q && roleFilter !== "all" && !c.lanes.includes(roleFilter)) {
        return false;
      }
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, search, roleFilter]);

  const orderedTeam = (team: PlayerAssignment[], teamNum: 1 | 2) => {
    if (!pickOrder) {
      return REVEAL_ROLE_ORDER.map((role) =>
        team.find((p) => p.role === role)
      ).filter(Boolean) as PlayerAssignment[];
    }
    const order = teamNum === 1 ? pickOrder.team1 : pickOrder.team2;
    return order
      .map((uid) => team.find((p) => p.uid === uid))
      .filter(Boolean) as PlayerAssignment[];
  };

  const team1 = orderedTeam(lobby.team1, 1);
  const team2 = orderedTeam(lobby.team2, 2);

  const resolveSwapUi = (player: PlayerAssignment, teamNum: 1 | 2) => {
    const pick =
      state?.picks[teamNum === 1 ? "team1" : "team2"][player.role] ?? null;
    const isActiveTurn = !!actor && actor.uid === player.uid && !concluded;
    const hover =
      turn?.kind === "pick" && isActiveTurn ? hoverChampion : null;

    const incoming = activeSwaps.find(
      (r) => r.toUid === currentUid && r.fromUid === player.uid
    );
    const adminIncoming =
      isAdmin &&
      activeSwaps.find(
        (r) => r.fromUid === player.uid && r.toUid !== currentUid
      );
    const outgoing = activeSwaps.find(
      (r) => r.fromUid === currentUid && r.toUid === player.uid
    );

    let swapMode: "none" | "incoming" | "outgoing" = "none";
    let swapExpiresAtMs: number | null = null;
    let swapToUid: string | null = null;
    if (incoming) {
      swapMode = "incoming";
      swapExpiresAtMs = incoming.expiresAt.toMillis();
      swapToUid = incoming.toUid;
    } else if (adminIncoming) {
      swapMode = "incoming";
      swapExpiresAtMs = adminIncoming.expiresAt.toMillis();
      swapToUid = adminIncoming.toUid;
    } else if (outgoing) {
      swapMode = "outgoing";
      swapExpiresAtMs = outgoing.expiresAt.toMillis();
      swapToUid = outgoing.toUid;
    }

    const hasOutgoingSwap = activeSwaps.some((r) => r.fromUid === currentUid);

    const pairBusy = activeSwaps.some(
      (r) =>
        (r.fromUid === currentUid && r.toUid === player.uid) ||
        (r.fromUid === player.uid && r.toUid === currentUid)
    );

    const canRequestSwap =
      !concluded &&
      !!state &&
      myTeamNum === teamNum &&
      player.uid !== currentUid &&
      swapWindowOpen &&
      !hasOutgoingSwap &&
      !pairBusy &&
      swapMode === "none" &&
      isPickOrderSwapAllowed(state, lobby, currentUid, player.uid, teamNum);

    return {
      pick,
      hover,
      isActiveTurn,
      swapMode,
      swapExpiresAtMs,
      swapToUid,
      canRequestSwap,
    };
  };

  const onHover = async (championId: string | null) => {
    if (!canAct) return;
    try {
      await hoverChampionSelect(lobby.id, currentUid, championId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wyboru");
    }
  };

  const onLock = async () => {
    if (!canAct || locking) return;
    setLocking(true);
    try {
      await lockChampionSelectAction(lobby.id, currentUid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd akceptacji");
    } finally {
      setLocking(false);
    }
  };

  const onRequestSwap = async (toUid: string) => {
    try {
      await requestChampionSelectSwap(lobby.id, currentUid, toUid);
    } catch {
      // Już jest request / okno zamknięte — bez popupu
    }
  };

  const onAcceptSwap = async (fromUid: string, toUid: string) => {
    try {
      await respondChampionSelectSwap(
        lobby.id,
        currentUid,
        fromUid,
        toUid,
        true
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd akceptacji wymiany");
    }
  };

  const onDeclineSwap = async (fromUid: string, toUid: string) => {
    try {
      await respondChampionSelectSwap(
        lobby.id,
        currentUid,
        fromUid,
        toUid,
        false
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd odrzucenia wymiany");
    }
  };

  const onCancelSwap = async (toUid: string) => {
    try {
      await cancelChampionSelectSwap(lobby.id, currentUid, toUid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd anulowania wymiany");
    }
  };

  const pickWinner = async (team: 1 | 2) => {
    setWinnerLoading(true);
    try {
      await setWinner(lobby.id, team);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setWinnerLoading(false);
    }
  };

  const skipToPostGame = async () => {
    setWinnerLoading(true);
    try {
      await adminSetLobbyPhase(lobby.id, "post_game");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd");
    } finally {
      setWinnerLoading(false);
    }
  };

  const resetDraft = async () => {
    if (
      !confirm(
        "Zresetować draft? Wszystkie bany i picki zostaną wyczyszczone."
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await startChampionSelect(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd resetu draftu");
    } finally {
      setResetting(false);
    }
  };

  if (!state) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-400">
          Ładowanie champion select…
        </CardContent>
      </Card>
    );
  }

  const phaseLabel =
    state.phase === "ban1"
      ? "Faza 1 — pierwsze bany"
      : state.phase === "pick1"
        ? "Faza 2 — pierwsze picki"
        : state.phase === "ban2"
          ? "Faza 3 — drugie bany"
          : state.phase === "pick2"
            ? "Faza 4 — drugie picki"
            : "Draft zakończony";

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-700/80 bg-slate-900/60">
        <CardHeader className="border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl text-slate-100">Champion Select</CardTitle>
              <p className="mt-1 text-sm text-slate-400">{phaseLabel}</p>
            </div>
            {!concluded && (
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void resetDraft()}
                    disabled={resetting}
                  >
                    {resetting ? "Reset…" : "Resetuj draft"}
                  </Button>
                )}
                <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Czas tury
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-amber-300">
                    {remaining}s
                  </p>
                  {actor && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {actor.nick}
                      {isProxyTurn && seat
                        ? ` (za ${seat.nick})`
                        : ""}{" "}
                      · {getRoleLabel(seatRole ?? actor.role)} · Team{" "}
                      {turn?.team}
                      {turn?.kind === "ban" ? " · BAN" : " · PICK"}
                    </p>
                  )}
                </div>
              </div>
            )}
            {concluded && isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void resetDraft()}
                disabled={resetting}
              >
                {resetting ? "Reset…" : "Resetuj draft"}
              </Button>
            )}
          </div>
          {modifierLines.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-indigo-200/90">
              {modifierLines.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          )}
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 items-start gap-3">
            <TeamBanColumn
              team={1}
              bans={state.bans.team1}
              extraCount={extraBanCountForTeam(1, state.modifiers)}
              turn={turn}
              hoverChampion={hoverChampion}
              hoverBanNone={!!hoverBanNone}
              align="start"
            />
            <TeamBanColumn
              team={2}
              bans={state.bans.team2}
              extraCount={extraBanCountForTeam(2, state.modifiers)}
              turn={turn}
              hoverChampion={hoverChampion}
              hoverBanNone={!!hoverBanNone}
              align="end"
            />
          </div>

          <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="flex flex-col space-y-2">
              <p className="text-center text-sm font-semibold text-indigo-300">Team 1</p>
              {team1.map((player) => {
                const ui = resolveSwapUi(player, 1);
                return (
                  <PlayerPortrait
                    key={player.uid}
                    player={player}
                    pick={ui.pick}
                    hover={ui.hover}
                    isActiveTurn={ui.isActiveTurn}
                    side="left"
                    swapMode={ui.swapMode}
                    swapExpiresAtMs={ui.swapExpiresAtMs}
                    canRequestSwap={ui.canRequestSwap}
                    onRequestSwap={() => void onRequestSwap(player.uid)}
                    onAcceptSwap={() => {
                      if (ui.swapToUid) void onAcceptSwap(player.uid, ui.swapToUid);
                    }}
                    onDeclineSwap={() => {
                      if (ui.swapToUid) void onDeclineSwap(player.uid, ui.swapToUid);
                    }}
                    onCancelSwap={() => void onCancelSwap(player.uid)}
                  />
                );
              })}
            </div>

            <div className="relative min-h-0">
              <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/40">
                <div className="shrink-0 space-y-2 border-b border-slate-800 p-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setRoleFilter("all")}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        roleFilter === "all"
                          ? "border-amber-400/60 bg-amber-950/40 text-amber-100"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"
                      )}
                    >
                      All
                    </button>
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setRoleFilter(role.value)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          roleFilter === role.value
                            ? "border-amber-400/60 bg-amber-950/40 text-amber-100"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="search"
                    placeholder="Szukaj bohatera…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                    disabled={concluded}
                  />
                </div>
                <div className="min-h-0 flex-1 grid grid-cols-4 content-start gap-1.5 overflow-y-auto p-2 sm:grid-cols-5 md:grid-cols-6">
                  {turn?.kind === "ban" && (
                    <button
                      type="button"
                      disabled={concluded || !canAct}
                      onClick={() => void onHover(CHAMPION_SELECT_BAN_NONE_ID)}
                      title="Ban none"
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-md border p-1 transition-colors",
                        state.hoverChampionId === CHAMPION_SELECT_BAN_NONE_ID
                          ? "border-amber-400/70 bg-amber-950/40"
                          : "border-slate-800 bg-slate-900/40",
                        concluded || !canAct
                          ? "cursor-not-allowed opacity-35"
                          : "hover:border-slate-500"
                      )}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded bg-slate-950 text-[10px] font-bold text-slate-400">
                        NONE
                      </span>
                      <span className="w-full truncate text-center text-[9px] text-slate-400">
                        None
                      </span>
                    </button>
                  )}
                  {filteredChampions.map((champion) => {
                    const taken = takenIds.has(champion.id);
                    const disabled =
                      concluded ||
                      taken ||
                      !canAct ||
                      (canAct && !!legalIds && !legalIds.has(champion.id));
                    const selected = state.hoverChampionId === champion.id;
                    const lockedForAdrian =
                      showAdrianLocks && !adrianNarrowIds!.has(champion.id);

                    return (
                      <button
                        key={champion.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => void onHover(champion.id)}
                        title={
                          lockedForAdrian
                            ? `${champion.name} — poza pulą Adriana`
                            : champion.name
                        }
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-md border p-1 transition-colors",
                          selected
                            ? "border-amber-400/70 bg-amber-950/40"
                            : "border-slate-800 bg-slate-900/40",
                          disabled
                            ? "cursor-not-allowed opacity-35 grayscale"
                            : canAct
                              ? "hover:border-slate-500"
                              : "opacity-70"
                        )}
                      >
                        <span className="relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={champion.iconUrl}
                            alt={champion.name}
                            className="h-9 w-9 rounded object-cover"
                          />
                          {lockedForAdrian && (
                            <span
                              className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-slate-950/90 text-amber-300 ring-1 ring-slate-700"
                              aria-hidden
                            >
                              <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                            </span>
                          )}
                        </span>
                        <span className="w-full truncate text-center text-[9px] text-slate-400">
                          {champion.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <p className="text-center text-sm font-semibold text-purple-300">Team 2</p>
              {team2.map((player) => {
                const ui = resolveSwapUi(player, 2);
                return (
                  <PlayerPortrait
                    key={player.uid}
                    player={player}
                    pick={ui.pick}
                    hover={ui.hover}
                    isActiveTurn={ui.isActiveTurn}
                    side="right"
                    swapMode={ui.swapMode}
                    swapExpiresAtMs={ui.swapExpiresAtMs}
                    canRequestSwap={ui.canRequestSwap}
                    onRequestSwap={() => void onRequestSwap(player.uid)}
                    onAcceptSwap={() => {
                      if (ui.swapToUid) void onAcceptSwap(player.uid, ui.swapToUid);
                    }}
                    onDeclineSwap={() => {
                      if (ui.swapToUid) void onDeclineSwap(player.uid, ui.swapToUid);
                    }}
                    onCancelSwap={() => void onCancelSwap(player.uid)}
                  />
                );
              })}
            </div>
          </div>

          {!concluded && canAct && (
            <div className="flex flex-col items-center gap-1 pt-1">
              {isAdmin && !isMyTurn && actor && (
                <p className="text-xs text-amber-300/90">
                  Admin — grasz za: {actor.nick}
                  {isProxyTurn && seat ? ` (slot ${seat.nick})` : ""} (
                  {getRoleLabel(seatRole ?? actor.role)})
                </p>
              )}
              {isProxyTurn && isMyTurn && seat && (
                <p className="text-xs text-indigo-300/90">
                  Wybierasz za {seat.nick} ({getRoleLabel(seat.role)})
                  {seat.uid === lobby.createdBy ? " — pula Adriana" : ""}
                </p>
              )}
              <Button
                size="lg"
                onClick={() => void onLock()}
                disabled={locking || !state.hoverChampionId}
              >
                {locking ? "Akceptowanie…" : "Zaakceptuj"}
              </Button>
            </div>
          )}

          {!concluded && !canAct && actor && (
            <p className="text-center text-sm text-slate-500">
              Tura: {actor.nick}
              {isProxyTurn && seat ? ` (za ${seat.nick})` : ""} (
              {getRoleLabel(seatRole ?? actor.role)})
            </p>
          )}
        </CardContent>
      </Card>

      {concluded && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Wybierz zwycięzcę</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => void pickWinner(1)} disabled={winnerLoading}>
              Team 1 wygrywa
            </Button>
            <Button
              variant="secondary"
              onClick={() => void pickWinner(2)}
              disabled={winnerLoading}
            >
              Team 2 wygrywa
            </Button>
            <Button
              variant="outline"
              onClick={() => void skipToPostGame()}
              disabled={winnerLoading}
            >
              Pomiń wynik (bez statystyk)
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
