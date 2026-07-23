import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import {
  buildFullProposal,
  generateDistinctProposals,
  proposalsAreEqual,
  type BuildProposalOptions,
} from "@/lib/algorithms/balanceTeams";
import {
  getWeaknessPointsBase,
  getWeaknessPointsTotal,
} from "@/lib/lobby/weakness-points";
import {
  drawWeaknessGrid,
  flattenWeaknessGrid,
  normalizeDrawnWeaknesses,
} from "@/lib/algorithms/drawWeaknesses";
import { compareRanks } from "@/lib/constants/ranks";
import {
  computeChampionPoolSnapshot,
  getAdrianRole,
  getNarrowPoolTiers,
} from "@/lib/champions/narrow-pool";
import { ChampionCatalogEntry } from "@/lib/champions/types";
import {
  applyActionToState,
  createInitialChampionSelect,
  CHAMPION_SELECT_TURN_SECONDS,
  CHAMPION_SELECT_SWAP_SECONDS,
  CHAMPION_SELECT_BAN_NONE_ID,
  applyPickOrderSwap,
  getActingPlayerForTurn,
  getCurrentTurn,
  getLegalChampions,
  getNarrowRemainingIdSet,
  getPlayerForTurn,
  isChampionSelectSwapWindowOpen,
  isPickOrderSwapAllowed,
  pickRandomLegalChampion,
  pruneExpiredSwapRequests,
  snapshotRoundPicks,
  swapPairKey,
  toChampionPickRef,
} from "@/lib/lobby/champion-select";
import {
  sanitizeWeaknessForm,
  WeaknessFormInput,
} from "@/lib/weaknesses/helpers";
import {
  toFirestoreProposal,
  toFirestoreTeam,
  toFirestoreWeaknesses,
} from "@/lib/lobby/firestore-lobby";
import {
  buildBotProfileFromUser,
  botUidForUser,
  isRealUserProfile,
  isTestBotUid,
  pickBotSourceProfiles,
} from "@/lib/lobby/test-bots";
import {
  BalanceMode,
  FeaturedMatchup,
  Lobby,
  LobbyPlayer,
  LobbyStatus,
  LoLRank,
  LoLRole,
  MatchResult,
  PlayerAssignment,
  ProposalVoteChoice,
  SelectedWeakness,
  TeamProposal,
  UserProfile,
  VoteState,
  Weakness,
  WeaknessCell,
} from "@/types";
import { normalizeBalanceMode } from "@/lib/constants/balance-modes";

const LOBBY_SIZE = 10;
const PRE_REVEAL_SECONDS = 5;
const ADMIN_REDRAW_PRE_REVEAL_SECONDS = 3;
const PRE_REVEAL_ROLE_INDEX = -1;
const REVEAL_SECONDS = 5;
const CONFIRM_SECONDS = 20;
const VOTE_LOCK_SECONDS = 10;

/** Seria przegranych Adriana (createdBy) od końca sesji — wygrana resetuje. */
export function countAdrianConsecutiveLosses(lobby: Lobby): number {
  const uid = lobby.createdBy;
  const history = lobby.roundHistory ?? [];
  let streak = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const round = history[i]!;
    const onTeam1 = round.team1.some((p) => p.uid === uid);
    const onTeam2 = round.team2.some((p) => p.uid === uid);
    if (!onTeam1 && !onTeam2) break;

    const adrianTeam: 1 | 2 = onTeam1 ? 1 : 2;
    if (round.winnerTeam === adrianTeam) break;
    streak++;
  }

  return streak;
}

/**
 * Opcje pierwszego losowania classic (nie reshuffle):
 * featured + Adrian dostaje rolę z odblokowanych priorytetów jako drugi w kolejce.
 */
function classicFirstDrawOptions(
  lobby: Lobby,
  featuredMatchup?: FeaturedMatchup | null,
  balanceMode?: BalanceMode
): BuildProposalOptions {
  const options: BuildProposalOptions = {
    featuredMatchup:
      featuredMatchup !== undefined
        ? featuredMatchup
        : (lobby.featuredMatchup ?? null),
  };

  const mode = normalizeBalanceMode(balanceMode ?? lobby.balanceMode);
  if (mode === "classic") {
    options.classicPriorityAssign = {
      uid: lobby.createdBy,
      unlockedGroups: 1 + countAdrianConsecutiveLosses(lobby),
    };
  }

  return options;
}

function emptySlots(): (string | null)[] {
  return Array.from({ length: LOBBY_SIZE }, () => null);
}

function defaultWeaknessesState() {
  return {
    drawn: [] as WeaknessCell[],
    selected: [] as SelectedWeakness[],
    pointsTotal: 3,
    pointsSpent: 0,
    selectorUid: null as string | null,
    confirmed: false,
    revealIndex: 0,
  };
}

function defaultVotes(): VoteState {
  return {
    lineup: {},
    proposals: {},
    locked: false,
  };
}

export function countPlayersInLobbyRoom(lobby: Lobby): number {
  const slotUids = lobby.slots.filter(Boolean) as string[];
  const presentUids = lobby.presentUids ?? {};

  return slotUids.filter((uid) => presentUids[uid] || isTestBotUid(uid)).length;
}

function allPlayersInLobbyRoom(lobby: Lobby): boolean {
  const filled = lobby.slots.filter(Boolean).length;
  return filled === LOBBY_SIZE && countPlayersInLobbyRoom(lobby) === LOBBY_SIZE;
}

function confirmPhaseUpdates(): Record<string, unknown> {
  return {
    status: "confirming" as LobbyStatus,
    acceptDeadline: Timestamp.fromMillis(Date.now() + CONFIRM_SECONDS * 1000),
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + CONFIRM_SECONDS * 1000),
  };
}

function preRevealPhaseUpdates(seconds = PRE_REVEAL_SECONDS): Record<string, unknown> {
  return {
    revealRoleIndex: PRE_REVEAL_ROLE_INDEX,
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + seconds * 1000),
  };
}

async function refreshTeamAssignments(
  team: PlayerAssignment[]
): Promise<PlayerAssignment[]> {
  const refreshed: PlayerAssignment[] = [];

  for (const player of team) {
    const snap = await getDoc(doc(getFirebaseDb(), "users", player.uid));
    if (!snap.exists()) {
      refreshed.push(player);
      continue;
    }

    const data = snap.data() as UserProfile;
    refreshed.push({
      ...player,
      wins: data.wins,
      losses: data.losses,
      matchHistory: data.matchHistory,
    });
  }

  return refreshed;
}

export async function createLobby(
  adminUid: string,
  balanceMode: BalanceMode = "classic"
): Promise<string> {
  const ref = await addDoc(collection(getFirebaseDb(), "lobbies"), {
    createdBy: adminUid,
    status: "open" as LobbyStatus,
    balanceMode: normalizeBalanceMode(balanceMode),
    slots: emptySlots(),
    presentUids: {},
    acceptances: {},
    acceptDeadline: null,
    team1: [],
    team2: [],
    proposalA: null,
    proposalB: null,
    proposalC: null,
    votes: defaultVotes(),
    reshuffleBonusGranted: false,
    weaknesses: defaultWeaknessesState(),
    winnerTeam: null,
    roundHistory: [],
    cooldownMinutes: null,
    cooldownEndsAt: null,
    phaseTimerEndsAt: null,
    revealRoleIndex: 0,
    featuredMatchup: null,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function joinLobby(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "open" && lobby.status !== "post_game") {
      throw new Error("Lobby nie przyjmuje zapisów");
    }
    if (lobby.slots.includes(uid)) throw new Error("Już jesteś zapisany");

    const slots = [...lobby.slots];
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex === -1) throw new Error("Lobby jest pełne");

    slots[emptyIndex] = uid;

    tx.update(lobbyRef, {
      slots,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function enterLobbyRoom(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (!lobby.slots.includes(uid)) return;
    if (lobby.status !== "open") return;

    if (lobby.presentUids?.[uid]) return;

    tx.update(lobbyRef, {
      presentUids: { ...(lobby.presentUids ?? {}), [uid]: true },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function exitLobbyRoom(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "open") return;
    if (!lobby.presentUids?.[uid]) return;

    const presentUids = { ...lobby.presentUids };
    delete presentUids[uid];

    tx.update(lobbyRef, {
      presentUids,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function seedTestBotProfilesFromUsers(sources: UserProfile[]) {
  for (const source of sources) {
    const bot = buildBotProfileFromUser(source);
    await setDoc(
      doc(getFirebaseDb(), "users", bot.uid),
      {
        ...bot,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function fillLobbyWithTestBots(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = lobbySnap.data() as Lobby;
  if (lobby.status !== "open" && lobby.status !== "post_game") {
    throw new Error("Można wypełnić botami tylko w otwartym lobby lub między rundami");
  }

  const emptySlots = lobby.slots.filter((slot) => slot === null).length;
  if (emptySlots === 0) {
    throw new Error("Brak wolnych slotów");
  }

  const usersSnap = await getDocs(collection(getFirebaseDb(), "users"));
  const realUsers = usersSnap.docs
    .map((entry) => ({ uid: entry.id, ...entry.data() }) as UserProfile)
    .filter(isRealUserProfile)
    .sort((a, b) => a.nick.localeCompare(b.nick, "pl"));

  const seatedUids = lobby.slots.filter(Boolean) as string[];
  const sources = pickBotSourceProfiles(realUsers, seatedUids, emptySlots);
  await seedTestBotProfilesFromUsers(sources);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const current = snap.data() as Lobby;
    if (current.status !== "open" && current.status !== "post_game") {
      throw new Error("Można wypełnić botami tylko w otwartym lobby lub między rundami");
    }

    const slots = [...current.slots];
    const used = new Set(slots.filter(Boolean) as string[]);
    let sourceIndex = 0;

    for (let i = 0; i < slots.length && sourceIndex < sources.length; i++) {
      if (slots[i] !== null) continue;

      while (sourceIndex < sources.length) {
        const botUid = buildBotProfileFromUser(sources[sourceIndex]!).uid;
        sourceIndex++;
        if (used.has(botUid)) continue;
        slots[i] = botUid;
        used.add(botUid);
        break;
      }
    }

    const filledBots = slots.filter(
      (uid) => uid && isTestBotUid(uid) && !current.slots.includes(uid)
    ).length;

    if (filledBots === 0) {
      throw new Error("Nie udało się dodać botów do lobby");
    }

    const acceptances = { ...current.acceptances };
    for (const uid of slots) {
      if (uid && isTestBotUid(uid)) {
        acceptances[uid] = true;
      }
    }

    const updates: Record<string, unknown> = {
      slots,
      acceptances,
      updatedAt: serverTimestamp(),
    };

    tx.update(lobbyRef, updates);
  });
}

function stripUidFromVotes(votes: VoteState | undefined, uid: string): VoteState {
  const next = votes ?? defaultVotes();
  const lineup = { ...next.lineup };
  const proposals = { ...next.proposals };
  delete lineup[uid];
  delete proposals[uid];
  return { ...next, lineup, proposals };
}

function removeUidFromLobbyFields(lobby: Lobby, uid: string) {
  const slots = lobby.slots.map((s) => (s === uid ? null : s));
  const acceptances = { ...lobby.acceptances };
  delete acceptances[uid];
  const presentUids = { ...(lobby.presentUids ?? {}) };
  delete presentUids[uid];
  const votes = stripUidFromVotes(lobby.votes, uid);
  return { slots, acceptances, presentUids, votes };
}

export async function leaveLobby(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (
      lobby.status !== "open" &&
      lobby.status !== "confirming" &&
      lobby.status !== "post_game"
    ) {
      throw new Error("Nie można opuścić lobby w tej fazie");
    }

    if (!lobby.slots.includes(uid)) return;

    const { slots, acceptances, presentUids, votes } = removeUidFromLobbyFields(
      lobby,
      uid
    );

    const updates: Record<string, unknown> = {
      slots,
      acceptances,
      presentUids,
      updatedAt: serverTimestamp(),
    };

    if (lobby.status === "open" || lobby.status === "confirming") {
      updates.status = "open";
      updates.acceptDeadline = null;
      updates.phaseTimerEndsAt = null;
    } else {
      updates.votes = votes;
    }

    tx.update(lobbyRef, updates);
  });
}

/** Admin: wyrzuca gracza ze slotu (open / confirming / między rundami). */
export async function adminKickFromLobby(lobbyId: string, uid: string) {
  if (!uid) throw new Error("Brak użytkownika");

  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (
      lobby.status !== "open" &&
      lobby.status !== "confirming" &&
      lobby.status !== "post_game"
    ) {
      throw new Error(
        "Można wyrzucić gracza tylko przed startem lub między rundami"
      );
    }

    if (!lobby.slots.includes(uid)) {
      throw new Error("Gracz nie jest w tym lobby");
    }

    const { slots, acceptances, presentUids, votes } = removeUidFromLobbyFields(
      lobby,
      uid
    );

    const updates: Record<string, unknown> = {
      slots,
      acceptances,
      presentUids,
      updatedAt: serverTimestamp(),
    };

    if (lobby.status === "open" || lobby.status === "confirming") {
      updates.status = "open";
      updates.acceptDeadline = null;
      updates.phaseTimerEndsAt = null;
    } else {
      updates.votes = votes;
    }

    tx.update(lobbyRef, updates);
  });
}

export async function resetConfirmingLobby(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await updateDoc(lobbyRef, {
    status: "open",
    acceptances: {},
    presentUids: {},
    acceptDeadline: null,
    phaseTimerEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function acceptLobby(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "confirming") throw new Error("Brak akceptacji w tej fazie");
    if (!lobby.slots.includes(uid)) throw new Error("Nie jesteś w lobby");

    const acceptances = { ...lobby.acceptances, [uid]: true };
    const allAccepted = lobby.slots.every(
      (slotUid) => slotUid && acceptances[slotUid]
    );

    tx.update(lobbyRef, {
      acceptances,
      ...(allAccepted ? { status: "drafting" } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function acceptLobbyTestBots(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "confirming") {
      throw new Error("Potwierdzanie botów dostępne tylko w fazie akceptacji");
    }

    const acceptances = { ...lobby.acceptances };
    let confirmedBots = 0;

    for (const uid of lobby.slots) {
      if (uid && isTestBotUid(uid) && !acceptances[uid]) {
        acceptances[uid] = true;
        confirmedBots++;
      }
    }

    if (confirmedBots === 0) {
      throw new Error("Brak botów do potwierdzenia");
    }

    const allAccepted = lobby.slots.every(
      (slotUid) => slotUid && acceptances[slotUid]
    );

    tx.update(lobbyRef, {
      acceptances,
      ...(allAccepted ? { status: "drafting" } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function restartConfirmTimer(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  const filled = lobby.slots.filter(Boolean).length;
  if (filled !== LOBBY_SIZE) {
    throw new Error("Lobby musi mieć 10 graczy, aby uruchomić akceptację");
  }

  await updateDoc(lobbyRef, {
    status: "confirming",
    acceptDeadline: Timestamp.fromMillis(Date.now() + CONFIRM_SECONDS * 1000),
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + CONFIRM_SECONDS * 1000),
    updatedAt: serverTimestamp(),
  });
}

/** Admin: startuje timer akceptacji dopiero gdy wszyscy są w pokoju. */
export async function adminStartConfirmPhase(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  if (lobby.status !== "open") {
    throw new Error("Timer akceptacji można uruchomić tylko w otwartym lobby");
  }
  if (!allPlayersInLobbyRoom(lobby)) {
    throw new Error(
      "Wszyscy gracze muszą dołączyć i wejść do lobby, zanim uruchomisz timer"
    );
  }

  await updateDoc(lobbyRef, {
    ...confirmPhaseUpdates(),
    updatedAt: serverTimestamp(),
  });
}

export async function setFeaturedMatchup(
  lobbyId: string,
  matchup: { role: LoLRole; uidA: string; uidB: string } | null
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  if (lobby.status !== "open" && lobby.status !== "overview" && lobby.status !== "post_game") {
    throw new Error(
      "Featured matchup można ustawić przed startem, w overview lub między rundami"
    );
  }

  if (!matchup) {
    await updateDoc(lobbyRef, {
      featuredMatchup: null,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  if (matchup.uidA === matchup.uidB) {
    throw new Error("Wybierz dwóch różnych graczy");
  }
  if (!lobby.slots.includes(matchup.uidA) || !lobby.slots.includes(matchup.uidB)) {
    throw new Error("Obaj gracze muszą być w lobby");
  }

  await updateDoc(lobbyRef, {
    featuredMatchup: {
      role: matchup.role,
      uidA: matchup.uidA,
      uidB: matchup.uidB,
    },
    updatedAt: serverTimestamp(),
  });
}

async function fetchLobbyPlayers(uids: string[]): Promise<LobbyPlayer[]> {
  const players: LobbyPlayer[] = [];
  for (const uid of uids) {
    if (!uid) continue;
    const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
    if (!snap.exists()) continue;
    const data = snap.data() as UserProfile;
    players.push({
      uid,
      nick: data.nick,
      rank: data.rank as LoLRank,
      ...(data.rankDivision ? { rankDivision: data.rankDivision } : {}),
      ...(data.rankLp !== undefined ? { rankLp: data.rankLp } : {}),
      rolePriorities: data.rolePriorities,
      wins: data.wins,
      losses: data.losses,
      matchHistory: data.matchHistory,
    });
  }
  return players;
}

export async function draftTeams(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) return;

  const lobby = lobbySnap.data() as Lobby;
  const uids = lobby.slots.filter(Boolean) as string[];
  const players = await fetchLobbyPlayers(uids);
  const proposal = buildFullProposal(
    players,
    lobby.balanceMode,
    classicFirstDrawOptions(lobby)
  );

  await updateDoc(lobbyRef, {
    team1: toFirestoreTeam(proposal.team1),
    team2: toFirestoreTeam(proposal.team2),
    status: "reveal",
    ...preRevealPhaseUpdates(),
    updatedAt: serverTimestamp(),
  });
}

export async function advanceReveal(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "reveal") return;

    const nextIndex = lobby.revealRoleIndex + 1;
    if (nextIndex >= 5) {
      tx.update(lobbyRef, {
        status: "overview",
        revealRoleIndex: 5,
        phaseTimerEndsAt: null,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    tx.update(lobbyRef, {
      revealRoleIndex: nextIndex,
      phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startLineupVoting(lobbyId: string) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "voting_lineup",
    votes: defaultVotes(),
    updatedAt: serverTimestamp(),
  });
}

export async function castLineupVote(
  lobbyId: string,
  uid: string,
  choice: "accept" | "reshuffle"
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "voting_lineup") throw new Error("Głosowanie nieaktywne");
    if (lobby.votes.locked) throw new Error("Głosowanie zablokowane");

    const votes = {
      ...lobby.votes,
      lineup: { ...lobby.votes.lineup, [uid]: choice },
    };

    const voteCount = Object.keys(votes.lineup).length;
    const updates: Record<string, unknown> = {
      votes,
      updatedAt: serverTimestamp(),
    };

    if (voteCount >= LOBBY_SIZE) {
      updates.status = "locked_lineup";
      updates.votes = { ...votes, locked: true };
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + VOTE_LOCK_SECONDS * 1000
      );
    }

    tx.update(lobbyRef, updates);
  });
}

export async function castLineupVoteForTeam(
  lobbyId: string,
  choice: "accept" | "reshuffle"
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "voting_lineup") throw new Error("Głosowanie nieaktywne");
    if (lobby.votes.locked) throw new Error("Głosowanie zablokowane");

    const lineup = { ...lobby.votes.lineup };
    for (const uid of lobby.slots) {
      if (uid) lineup[uid] = choice;
    }

    const votes = { ...lobby.votes, lineup };
    const voteCount = Object.keys(lineup).length;
    const updates: Record<string, unknown> = {
      votes,
      updatedAt: serverTimestamp(),
    };

    if (voteCount >= LOBBY_SIZE) {
      updates.status = "locked_lineup";
      updates.votes = { ...votes, locked: true };
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + VOTE_LOCK_SECONDS * 1000
      );
    }

    tx.update(lobbyRef, updates);
  });
}

export async function resolveLineupVote(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const votes = Object.values(lobby.votes.lineup);
  const acceptCount = votes.filter((v) => v === "accept").length;
  const reshuffleCount = votes.filter((v) => v === "reshuffle").length;

  const adrianVotedReshuffle =
    lobby.votes.lineup[lobby.createdBy] === "reshuffle";

  if (reshuffleCount >= 6) {
    const uids = lobby.slots.filter(Boolean) as string[];
    const players = await fetchLobbyPlayers(uids);
    const { proposalA, proposalB, proposalC } = generateDistinctProposals(
      players,
      lobby.balanceMode,
      {
        exclude: [{ team1: lobby.team1, team2: lobby.team2 }],
        featuredMatchup: lobby.featuredMatchup ?? null,
      }
    );

    await updateDoc(lobbyRef, {
      status: "reshuffle_reveal",
      proposalA: toFirestoreProposal(proposalA),
      proposalB: toFirestoreProposal(proposalB),
      proposalC: toFirestoreProposal(proposalC),
      revealRoleIndex: 0,
      votes: defaultVotes(),
      reshuffleBonusGranted: adrianVotedReshuffle,
      phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(lobbyRef, {
    status: "overview",
    votes: { ...defaultVotes(), lineup: lobby.votes.lineup, locked: true },
    phaseTimerEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function advanceReshuffleReveal(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "reshuffle_reveal") return;

    const nextIndex = lobby.revealRoleIndex + 1;
    if (nextIndex >= 5) {
      tx.update(lobbyRef, {
        status: "voting_proposals",
        revealRoleIndex: 5,
        phaseTimerEndsAt: null,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    tx.update(lobbyRef, {
      revealRoleIndex: nextIndex,
      phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function castProposalVote(
  lobbyId: string,
  uid: string,
  choice: ProposalVoteChoice
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "voting_proposals") throw new Error("Głosowanie nieaktywne");
    if (lobby.votes.locked) throw new Error("Głosowanie zablokowane");

    const votes = {
      ...lobby.votes,
      proposals: { ...lobby.votes.proposals, [uid]: choice },
    };

    const voteCount = lobby.slots.filter(
      (slotUid) => slotUid && votes.proposals[slotUid]
    ).length;
    const updates: Record<string, unknown> = {
      votes,
      updatedAt: serverTimestamp(),
    };

    if (voteCount >= LOBBY_SIZE) {
      updates.status = "locked_proposals";
      updates.votes = { ...votes, locked: true };
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + VOTE_LOCK_SECONDS * 1000
      );
    }

    tx.update(lobbyRef, updates);
  });
}

export async function castProposalVoteForTeam(
  lobbyId: string,
  choice: ProposalVoteChoice
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "voting_proposals") throw new Error("Głosowanie nieaktywne");
    if (lobby.votes.locked) throw new Error("Głosowanie zablokowane");

    const proposals = { ...lobby.votes.proposals };
    for (const uid of lobby.slots) {
      if (uid) proposals[uid] = choice;
    }

    const votes = { ...lobby.votes, proposals };
    const voteCount = lobby.slots.filter(
      (slotUid) => slotUid && proposals[slotUid]
    ).length;
    const updates: Record<string, unknown> = {
      votes,
      updatedAt: serverTimestamp(),
    };

    if (voteCount >= LOBBY_SIZE) {
      updates.status = "locked_proposals";
      updates.votes = { ...votes, locked: true };
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + VOTE_LOCK_SECONDS * 1000
      );
    }

    tx.update(lobbyRef, updates);
  });
}

function applyProposal(lobby: Lobby, proposal: TeamProposal) {
  const safe = toFirestoreProposal(proposal);
  return {
    team1: safe.team1,
    team2: safe.team2,
    proposalA: null,
    proposalB: null,
    proposalC: null,
  };
}

export async function resolveProposalVote(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const votes = Object.values(lobby.votes.proposals);
  const countA = votes.filter((v) => v === "A").length;
  const countB = votes.filter((v) => v === "B").length;
  const countC = votes.filter((v) => v === "C").length;

  const byChoice: Record<ProposalVoteChoice, TeamProposal | null> = {
    A: lobby.proposalA,
    B: lobby.proposalB,
    C: lobby.proposalC ?? null,
  };
  const counts: Record<ProposalVoteChoice, number> = {
    A: countA,
    B: countB,
    C: countC,
  };
  const max = Math.max(countA, countB, countC);
  const tied = (["A", "B", "C"] as ProposalVoteChoice[]).filter(
    (choice) => counts[choice] === max && byChoice[choice]
  );
  const winnerKey =
    tied[Math.floor(Math.random() * Math.max(tied.length, 1))] ??
    (["A", "B", "C"] as ProposalVoteChoice[]).find((c) => byChoice[c])!;
  const winningProposal = byChoice[winnerKey]!;

  await updateDoc(lobbyRef, {
    status: "overview",
    ...applyProposal(lobby, winningProposal),
    votes: { ...defaultVotes(), locked: true },
    phaseTimerEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function startWeaknessReveal(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) throw new Error("Lobby nie istnieje");
  const lobby = lobbySnap.data() as Lobby;

  const allowedStatuses: LobbyStatus[] = [
    "overview",
    "weakness_reveal",
    "weakness_pick",
  ];
  if (!allowedStatuses.includes(lobby.status)) {
    throw new Error("Nie można teraz wylosować osłabień");
  }
  if (lobby.weaknesses?.confirmed) {
    throw new Error("Osłabienia są już zatwierdzone");
  }

  const weaknessesSnap = await getDocs(collection(getFirebaseDb(), "weaknesses"));
  const weaknesses = weaknessesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Weakness
  );

  if (weaknesses.length === 0) {
    throw new Error("Brak osłabień w bazie — dodaj je w panelu admina");
  }

  const drawn = flattenWeaknessGrid(drawWeaknessGrid(weaknesses));

  await updateDoc(lobbyRef, {
    status: "weakness_reveal",
    team1: toFirestoreTeam(lobby.team1),
    team2: toFirestoreTeam(lobby.team2),
    proposalA: lobby.proposalA ? toFirestoreProposal(lobby.proposalA) : null,
    proposalB: lobby.proposalB ? toFirestoreProposal(lobby.proposalB) : null,
    proposalC: lobby.proposalC ? toFirestoreProposal(lobby.proposalC) : null,
    weaknesses: toFirestoreWeaknesses({
      ...defaultWeaknessesState(),
      drawn,
      pointsTotal: getWeaknessPointsBase(lobby),
      revealIndex: 0,
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function revealNextWeakness(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const drawn = [...normalizeDrawnWeaknesses(lobby.weaknesses.drawn)];
  const nextIndex = lobby.weaknesses.revealIndex;

  if (nextIndex >= drawn.length) {
    const selectorUid = findWeaknessSelector(lobby);
    const pointsTotal = getWeaknessPointsTotal(lobby);
    await updateDoc(lobbyRef, {
      status: "weakness_pick",
      weaknesses: toFirestoreWeaknesses({
        ...lobby.weaknesses,
        drawn,
        selectorUid,
        pointsTotal,
        revealIndex: drawn.length,
      }),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  drawn[nextIndex] = { ...drawn[nextIndex], revealed: true };

  await updateDoc(lobbyRef, {
    weaknesses: toFirestoreWeaknesses({
      ...lobby.weaknesses,
      drawn,
      revealIndex: nextIndex + 1,
    }),
    updatedAt: serverTimestamp(),
  });
}

function findWeaknessSelector(lobby: Lobby): string | null {
  const adrianTeam = lobby.team1.some((p) => p.uid === lobby.createdBy)
    ? lobby.team1
    : lobby.team2;
  const opposingTeam = adrianTeam === lobby.team1 ? lobby.team2 : lobby.team1;

  if (opposingTeam.length === 0) return null;

  const sorted = [...opposingTeam].sort((a, b) =>
    compareRanks(
      a.rank,
      b.rank,
      a.rankDivision,
      b.rankDivision,
      a.rankLp,
      b.rankLp
    )
  );
  return sorted[0]?.uid ?? null;
}

export async function selectWeakness(
  lobbyId: string,
  uid: string,
  cell: WeaknessCell
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "weakness_pick") throw new Error("Nie można wybrać osłabienia");
    if (lobby.weaknesses.selectorUid !== uid) {
      throw new Error("Nie jesteś selektorem osłabień");
    }
    if (lobby.weaknesses.confirmed) throw new Error("Osłabienia już zatwierdzone");

    const cost = cell.tier;
    const newSpent = lobby.weaknesses.pointsSpent + cost;
    if (newSpent > lobby.weaknesses.pointsTotal) {
      throw new Error("Za mało punktów");
    }

    const selected: SelectedWeakness = {
      weaknessId: cell.weaknessId,
      name: cell.name,
      text: cell.text,
      tier: cell.tier,
      cost,
    };

    tx.update(lobbyRef, {
      weaknesses: toFirestoreWeaknesses({
        ...lobby.weaknesses,
        selected: [...lobby.weaknesses.selected, selected],
        pointsSpent: newSpent,
      }),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deselectWeakness(
  lobbyId: string,
  uid: string,
  cell: WeaknessCell
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "weakness_pick") throw new Error("Nie można odznaczyć osłabienia");
    if (lobby.weaknesses.selectorUid !== uid) {
      throw new Error("Nie jesteś selektorem osłabień");
    }
    if (lobby.weaknesses.confirmed) throw new Error("Osłabienia już zatwierdzone");

    const selectedIndex = lobby.weaknesses.selected.findIndex(
      (item) => item.weaknessId === cell.weaknessId && item.tier === cell.tier
    );
    if (selectedIndex === -1) throw new Error("Osłabienie nie jest wybrane");

    const removed = lobby.weaknesses.selected[selectedIndex];
    const selected = lobby.weaknesses.selected.filter(
      (_, index) => index !== selectedIndex
    );

    tx.update(lobbyRef, {
      weaknesses: toFirestoreWeaknesses({
        ...lobby.weaknesses,
        selected,
        pointsSpent: lobby.weaknesses.pointsSpent - removed.cost,
      }),
      updatedAt: serverTimestamp(),
    });
  });
}

async function loadChampionCatalog(): Promise<{
  patch: string;
  champions: ChampionCatalogEntry[];
}> {
  const response = await fetch("/api/champions");
  const data = (await response.json()) as {
    patch?: string;
    champions?: ChampionCatalogEntry[];
    error?: string;
  };

  if (!response.ok || !data.champions || !data.patch) {
    throw new Error(data.error ?? "Nie udało się załadować championów.");
  }

  return { patch: data.patch, champions: data.champions };
}

export async function confirmWeaknesses(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = { id: lobbySnap.id, ...lobbySnap.data() } as Lobby;
  if (lobby.weaknesses.selectorUid !== uid) {
    throw new Error("Nie jesteś selektorem osłabień");
  }
  if (lobby.weaknesses.pointsSpent !== lobby.weaknesses.pointsTotal) {
    throw new Error("Musisz wydać wszystkie punkty");
  }

  const narrowPoolTiers = getNarrowPoolTiers(lobby.weaknesses.selected);
  let championPool = lobby.weaknesses.championPool;

  if (narrowPoolTiers.length > 0) {
    const adrianRole = getAdrianRole(lobby);
    if (!adrianRole) {
      throw new Error("Nie znaleziono roli Adriana w składzie.");
    }

    const catalog = await loadChampionCatalog();
    championPool =
      computeChampionPoolSnapshot(
        catalog.champions,
        catalog.patch,
        adrianRole,
        narrowPoolTiers,
        lobbyId
      ) ?? undefined;

    if (!championPool) {
      throw new Error("Brak championów dla roli Adriana.");
    }
  }

  await updateDoc(lobbyRef, {
    status: "final",
    weaknesses: toFirestoreWeaknesses({
      ...lobby.weaknesses,
      confirmed: true,
      ...(championPool ? { championPool } : {}),
    }),
    updatedAt: serverTimestamp(),
  });
}

export async function startPlaying(lobbyId: string) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "playing",
    updatedAt: serverTimestamp(),
  });
}

/** Admin: start champion select z pustym stanem draftu. */
export async function startChampionSelect(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  if (!lobby.weaknesses?.confirmed) {
    throw new Error("Najpierw zatwierdź osłabienia");
  }
  if (lobby.status !== "final" && lobby.status !== "champion_select") {
    throw new Error("Champion select dostępny po zatwierdzeniu osłabień");
  }

  const turnEndsAt = Timestamp.fromMillis(
    Date.now() + CHAMPION_SELECT_TURN_SECONDS * 1000
  );

  await updateDoc(lobbyRef, {
    status: "champion_select",
    phaseTimerEndsAt: null,
    championSelect: createInitialChampionSelect(turnEndsAt, lobby),
    updatedAt: serverTimestamp(),
  });
}

export async function hoverChampionSelect(
  lobbyId: string,
  uid: string,
  championId: string | null
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") {
      throw new Error("Brak aktywnego champion select");
    }
    const state = lobby.championSelect;
    if (!state || state.phase === "concluded") {
      throw new Error("Draft zakończony");
    }

    const turn = getCurrentTurn(state);
    if (!turn) throw new Error("Brak aktywnej tury");

    const actor = getActingPlayerForTurn(lobby, turn, state);
    let canProxy = uid === lobby.createdBy;
    if (!canProxy && actor && actor.uid !== uid) {
      const adminSnap = await tx.get(doc(getFirebaseDb(), "users", uid));
      canProxy =
        adminSnap.exists() &&
        (adminSnap.data() as UserProfile).role === "admin";
    }
    if (!actor || (actor.uid !== uid && !canProxy)) {
      throw new Error("To nie Twoja tura");
    }

    tx.update(lobbyRef, {
      championSelect: {
        ...state,
        hoverChampionId: championId,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function lockChampionSelectAction(lobbyId: string, uid: string) {
  const catalog = await loadChampionCatalog();
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") {
      throw new Error("Brak aktywnego champion select");
    }
    const state = lobby.championSelect;
    if (!state || state.phase === "concluded") {
      throw new Error("Draft zakończony");
    }

    const turn = getCurrentTurn(state);
    if (!turn) throw new Error("Brak aktywnej tury");

    const seat = getPlayerForTurn(lobby, turn, state);
    const actor = getActingPlayerForTurn(lobby, turn, state);
    let canProxy = uid === lobby.createdBy;
    if (!canProxy && actor && actor.uid !== uid) {
      const adminSnap = await tx.get(doc(getFirebaseDb(), "users", uid));
      canProxy =
        adminSnap.exists() &&
        (adminSnap.data() as UserProfile).role === "admin";
    }
    if (!seat || !actor || (actor.uid !== uid && !canProxy)) {
      throw new Error("To nie Twoja tura");
    }

    if (!state.hoverChampionId) {
      throw new Error("Najpierw wybierz postać");
    }

    if (
      turn.kind === "ban" &&
      state.hoverChampionId === CHAMPION_SELECT_BAN_NONE_ID
    ) {
      const next = applyActionToState(state, turn, { none: true }, seat.role);
      tx.update(lobbyRef, {
        championSelect: next,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const legal = getLegalChampions({
      catalog: catalog.champions,
      state,
      turn,
      seatUid: seat.uid,
      adrianUid: lobby.createdBy,
      narrowRemainingIds: getNarrowRemainingIdSet(lobby),
    });
    const chosen = legal.find((c) => c.id === state.hoverChampionId);
    if (!chosen) {
      throw new Error("Ta postać jest niedostępna");
    }

    const next = applyActionToState(
      state,
      turn,
      toChampionPickRef(chosen),
      seat.role
    );
    tx.update(lobbyRef, {
      championSelect: next,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function resolveChampionSelectTimeout(lobbyId: string) {
  const catalog = await loadChampionCatalog();
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") return;

    const state = lobby.championSelect;
    if (!state || state.phase === "concluded") return;
    if (!state.turnEndsAt) return;
    if (state.turnEndsAt.toMillis() > Date.now() + 200) return;

    const turn = getCurrentTurn(state);
    if (!turn) return;

    const seat = getPlayerForTurn(lobby, turn, state);
    if (!seat) return;

    let pickRef: ReturnType<typeof toChampionPickRef> | { none: true };
    if (turn.kind === "ban") {
      pickRef = { none: true };
    } else {
      const legal = getLegalChampions({
        catalog: catalog.champions,
        state,
        turn,
        seatUid: seat.uid,
        adrianUid: lobby.createdBy,
        narrowRemainingIds: getNarrowRemainingIdSet(lobby),
      });
      const random = pickRandomLegalChampion(legal);
      if (!random) {
        pickRef = { none: true };
      } else {
        pickRef = toChampionPickRef(random);
      }
    }

    const next = applyActionToState(state, turn, pickRef, seat.role);
    tx.update(lobbyRef, {
      championSelect: next,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function requestChampionSelectSwap(
  lobbyId: string,
  fromUid: string,
  toUid: string
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") {
      throw new Error("Brak aktywnego champion select");
    }
    const state = lobby.championSelect;
    if (!state || state.phase === "concluded") {
      throw new Error("Draft zakończony");
    }
    if (!isChampionSelectSwapWindowOpen(state)) {
      throw new Error("Za mało czasu na turę, by prosić o wymianę");
    }
    if (fromUid === toUid) {
      throw new Error("Nie możesz wymienić się ze sobą");
    }

    const team1HasFrom = lobby.team1.some((p) => p.uid === fromUid);
    const team1HasTo = lobby.team1.some((p) => p.uid === toUid);
    const team2HasFrom = lobby.team2.some((p) => p.uid === fromUid);
    const team2HasTo = lobby.team2.some((p) => p.uid === toUid);

    let team: 1 | 2 | null = null;
    if (team1HasFrom && team1HasTo) team = 1;
    else if (team2HasFrom && team2HasTo) team = 2;
    if (!team) {
      throw new Error("Wymiana tylko w ramach własnej drużyny");
    }
    if (!isPickOrderSwapAllowed(state, lobby, fromUid, toUid, team)) {
      throw new Error("Ta wymiana jest zablokowana przez obostrzenie");
    }

    const active = pruneExpiredSwapRequests(state.swapRequests);
    if (active.some((r) => r.fromUid === fromUid)) {
      throw new Error("Masz już jedną prośbę o wymianę w toku");
    }
    const pair = swapPairKey(fromUid, toUid);
    if (active.some((r) => swapPairKey(r.fromUid, r.toUid) === pair)) {
      throw new Error("Wymiana z tą osobą jest już w toku");
    }

    const expiresAt = Timestamp.fromMillis(
      Date.now() + CHAMPION_SELECT_SWAP_SECONDS * 1000
    );

    tx.update(lobbyRef, {
      championSelect: {
        ...state,
        swapRequests: [
          ...active,
          { fromUid, toUid, team, expiresAt },
        ],
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function respondChampionSelectSwap(
  lobbyId: string,
  responderUid: string,
  fromUid: string,
  toUid: string,
  accept: boolean
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") {
      throw new Error("Brak aktywnego champion select");
    }
    const state = lobby.championSelect;
    if (!state || state.phase === "concluded") {
      throw new Error("Draft zakończony");
    }

    let canProxy = responderUid === lobby.createdBy;
    if (!canProxy && responderUid !== toUid) {
      const adminSnap = await tx.get(doc(getFirebaseDb(), "users", responderUid));
      canProxy =
        adminSnap.exists() &&
        (adminSnap.data() as UserProfile).role === "admin";
    }
    if (responderUid !== toUid && !canProxy) {
      throw new Error("Nie możesz odpowiedzieć na tę wymianę");
    }

    const active = pruneExpiredSwapRequests(state.swapRequests);
    const request = active.find(
      (r) => r.fromUid === fromUid && r.toUid === toUid
    );
    if (!request) {
      throw new Error("Brak aktywnej prośby o wymianę");
    }

    if (!accept) {
      tx.update(lobbyRef, {
        championSelect: {
          ...state,
          swapRequests: active.filter(
            (r) => !(r.fromUid === fromUid && r.toUid === toUid)
          ),
        },
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if (!isChampionSelectSwapWindowOpen(state)) {
      throw new Error("Za mało czasu na turę, by dokończyć wymianę");
    }

    const next = applyPickOrderSwap(
      { ...state, swapRequests: active },
      lobby,
      request.fromUid,
      request.toUid,
      request.team
    );
    tx.update(lobbyRef, {
      championSelect: next,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function cancelChampionSelectSwap(
  lobbyId: string,
  fromUid: string,
  toUid: string
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") return;
    const state = lobby.championSelect;
    if (!state) return;

    const active = pruneExpiredSwapRequests(state.swapRequests).filter(
      (r) => !(r.fromUid === fromUid && r.toUid === toUid)
    );
    tx.update(lobbyRef, {
      championSelect: {
        ...state,
        swapRequests: active,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function pruneChampionSelectSwaps(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = { id: snap.id, ...snap.data() } as Lobby;
    if (lobby.status !== "champion_select") return;
    const state = lobby.championSelect;
    if (!state?.swapRequests?.length) return;

    const active = pruneExpiredSwapRequests(state.swapRequests);
    if (active.length === state.swapRequests.length) return;

    tx.update(lobbyRef, {
      championSelect: {
        ...state,
        swapRequests: active,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function setWinner(lobbyId: string, team: 1 | 2) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const lobbySnap = await tx.get(lobbyRef);
    if (!lobbySnap.exists()) return;

    const lobby = lobbySnap.data() as Lobby;
    const winners = team === 1 ? lobby.team1 : lobby.team2;
    const losers = team === 1 ? lobby.team2 : lobby.team1;

    const winnerSnaps = await Promise.all(
      winners.map((player) => tx.get(doc(getFirebaseDb(), "users", player.uid)))
    );
    const loserSnaps = await Promise.all(
      losers.map((player) => tx.get(doc(getFirebaseDb(), "users", player.uid)))
    );

    const updatedProfiles = new Map<string, UserProfile>();

    winners.forEach((player, index) => {
      const userSnap = winnerSnaps[index];
      if (!userSnap.exists()) return;

      const data = userSnap.data() as UserProfile;
      const matchHistory = [...data.matchHistory, "W" as MatchResult].slice(-10);
      updatedProfiles.set(player.uid, {
        ...data,
        wins: data.wins + 1,
        matchHistory,
      });
      tx.update(doc(getFirebaseDb(), "users", player.uid), {
        wins: data.wins + 1,
        matchHistory,
      });
    });

    losers.forEach((player, index) => {
      const userSnap = loserSnaps[index];
      if (!userSnap.exists()) return;

      const data = userSnap.data() as UserProfile;
      const matchHistory = [...data.matchHistory, "L" as MatchResult].slice(-10);
      updatedProfiles.set(player.uid, {
        ...data,
        losses: data.losses + 1,
        matchHistory,
      });
      tx.update(doc(getFirebaseDb(), "users", player.uid), {
        losses: data.losses + 1,
        matchHistory,
      });
    });

    const syncTeam = (teamPlayers: PlayerAssignment[]) =>
      teamPlayers.map((player) => {
        const profile = updatedProfiles.get(player.uid);
        if (!profile) return player;
        return {
          ...player,
          wins: profile.wins,
          losses: profile.losses,
          matchHistory: profile.matchHistory,
        };
      });

    const team1 = syncTeam(lobby.team1);
    const team2 = syncTeam(lobby.team2);
    const roundNumber = (lobby.roundHistory?.length ?? 0) + 1;

    tx.update(lobbyRef, {
      status: "post_game",
      winnerTeam: team,
      team1: toFirestoreTeam(team1),
      team2: toFirestoreTeam(team2),
      roundHistory: [
        ...(lobby.roundHistory ?? []),
        {
          roundNumber,
          team1: toFirestoreTeam(team1),
          team2: toFirestoreTeam(team2),
          winnerTeam: team,
          selectedWeaknesses: lobby.weaknesses?.selected ?? [],
          picks: snapshotRoundPicks(lobby.championSelect?.picks),
          completedAt: Timestamp.now(),
        },
      ],
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateRoundMedia(
  lobbyId: string,
  roundNumber: number,
  data: { youtubeUrl?: string }
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  const roundHistory = (lobby.roundHistory ?? []).map((round) =>
    round.roundNumber === roundNumber ? { ...round, ...data } : round
  );

  await updateDoc(lobbyRef, {
    roundHistory,
    updatedAt: serverTimestamp(),
  });
}

export async function startNextRound(
  lobbyId: string,
  options?: { keepFeaturedMatchup?: boolean }
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  const uids = lobby.slots.filter(Boolean) as string[];
  if (uids.length !== LOBBY_SIZE) {
    throw new Error("Lobby musi mieć 10 graczy, aby zacząć kolejną rundę");
  }

  const keepFeatured = options?.keepFeaturedMatchup !== false;
  const drawOptions = classicFirstDrawOptions(
    lobby,
    keepFeatured ? lobby.featuredMatchup ?? null : null
  );

  const players = await fetchLobbyPlayers(uids);
  const previous: TeamProposal = {
    team1: lobby.team1,
    team2: lobby.team2,
  };

  let proposal = buildFullProposal(players, lobby.balanceMode, drawOptions);
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!proposalsAreEqual(proposal, previous)) break;
    proposal = buildFullProposal(players, lobby.balanceMode, drawOptions);
  }

  await updateDoc(lobbyRef, {
    status: "reveal",
    team1: toFirestoreTeam(proposal.team1),
    team2: toFirestoreTeam(proposal.team2),
    ...preRevealPhaseUpdates(),
    votes: defaultVotes(),
    proposalA: null,
    proposalB: null,
    proposalC: null,
    weaknesses: defaultWeaknessesState(),
    winnerTeam: null,
    reshuffleBonusGranted: false,
    ...(keepFeatured ? {} : { featuredMatchup: null }),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin: przelosowuje składy z overview i odpala reveal od nowa.
 * Opcjonalnie zmienia tryb losowania na kolejne rundy / reshuffle.
 */
export async function adminRedrawOverviewTeams(
  lobbyId: string,
  balanceMode?: BalanceMode
) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  if (lobby.status !== "overview") {
    throw new Error("Przelosowanie dostępne tylko w przeglądzie składu");
  }

  const uids = lobby.slots.filter(Boolean) as string[];
  if (uids.length !== LOBBY_SIZE) {
    throw new Error("Lobby musi mieć 10 graczy");
  }

  const mode = normalizeBalanceMode(balanceMode ?? lobby.balanceMode);
  const players = await fetchLobbyPlayers(uids);
  const previous: TeamProposal = {
    team1: lobby.team1,
    team2: lobby.team2,
  };
  const drawOptions = classicFirstDrawOptions(
    lobby,
    lobby.featuredMatchup ?? null,
    mode
  );

  let proposal = buildFullProposal(players, mode, drawOptions);
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!proposalsAreEqual(proposal, previous)) break;
    proposal = buildFullProposal(players, mode, drawOptions);
  }

  await updateDoc(lobbyRef, {
    status: "reveal",
    balanceMode: mode,
    team1: toFirestoreTeam(proposal.team1),
    team2: toFirestoreTeam(proposal.team2),
    ...preRevealPhaseUpdates(ADMIN_REDRAW_PRE_REVEAL_SECONDS),
    votes: defaultVotes(),
    proposalA: null,
    proposalB: null,
    proposalC: null,
    updatedAt: serverTimestamp(),
  });
}

export async function endLobbySession(lobbyId: string) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "session_summary",
    phaseTimerEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** @deprecated Use startNextRound instead */
export async function restartAfterCooldown(lobbyId: string) {
  return startNextRound(lobbyId);
}

export async function saveUserProfile(
  uid: string,
  data: Partial<UserProfile>
) {
  const { role, email, wins, losses, matchHistory, achievements, createdAt, ...safe } =
    data;
  await updateDoc(doc(getFirebaseDb(), "users", uid), safe);
}

/**
 * Admin: usuwa profil Firestore użytkownika (oraz powiązanego bota testowego).
 * Wyrzuca z otwartych / confirming lobby. Blokuje, gdy użytkownik jest w aktywnym meczu.
 * Nie usuwa konta Firebase Auth (wymaga Admin SDK po stronie serwera).
 */
export async function adminDeleteUserProfile(targetUid: string) {
  if (!targetUid) throw new Error("Brak użytkownika");

  const db = getFirebaseDb();
  const targetRef = doc(db, "users", targetUid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) {
    throw new Error("Profil nie istnieje");
  }

  const lobbiesSnap = await getDocs(
    query(collection(db, "lobbies"), where("slots", "array-contains", targetUid))
  );

  for (const lobbyDoc of lobbiesSnap.docs) {
    const lobby = lobbyDoc.data() as Lobby;
    if (
      lobby.status !== "open" &&
      lobby.status !== "confirming" &&
      lobby.status !== "post_game"
    ) {
      throw new Error(
        "Nie można usunąć profilu — użytkownik uczestniczy w aktywnym lobby. Zakończ sesję lub poczekaj na koniec gry."
      );
    }
  }

  for (const lobbyDoc of lobbiesSnap.docs) {
    const lobby = lobbyDoc.data() as Lobby;
    if (lobby.status === "post_game") {
      await adminKickFromLobby(lobbyDoc.id, targetUid);
    } else {
      await leaveLobby(lobbyDoc.id, targetUid);
    }
  }

  const botUid = botUidForUser(targetUid);
  const botRef = doc(db, "users", botUid);
  const botSnap = await getDoc(botRef);
  if (botSnap.exists()) {
    await deleteDoc(botRef);
  }

  await deleteDoc(targetRef);
}

export async function createWeakness(data: WeaknessFormInput) {
  await addDoc(collection(getFirebaseDb(), "weaknesses"), {
    ...sanitizeWeaknessForm(data, { isUpdate: false }),
    createdAt: serverTimestamp(),
  });
}

export async function updateWeakness(id: string, data: WeaknessFormInput) {
  await updateDoc(
    doc(getFirebaseDb(), "weaknesses", id),
    sanitizeWeaknessForm(data, { isUpdate: true })
  );
}

export async function deleteWeakness(id: string) {
  await deleteDoc(doc(getFirebaseDb(), "weaknesses", id));
}

export async function deleteLobby(lobbyId: string) {
  await deleteDoc(doc(getFirebaseDb(), "lobbies", lobbyId));
}

export function getRemainingSeconds(endsAt: Timestamp | null): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt.toMillis() - Date.now()) / 1000));
}

export function isPlayerInTeam(
  assignment: PlayerAssignment[],
  uid: string
): boolean {
  return assignment.some((p) => p.uid === uid);
}

export async function adminSetLobbyPhase(lobbyId: string, phase: LobbyStatus) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;

  if (phase === "weakness_reveal") {
    await startWeaknessReveal(lobbyId);
    return;
  }

  if (phase === "champion_select") {
    await startChampionSelect(lobbyId);
    return;
  }

  const updates: Record<string, unknown> = {
    status: phase,
    updatedAt: serverTimestamp(),
  };

  switch (phase) {
    case "confirming":
      updates.acceptDeadline = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
      break;
    case "drafting":
      updates.phaseTimerEndsAt = null;
      break;
    case "reveal":
      Object.assign(updates, preRevealPhaseUpdates());
      break;
    case "overview":
      updates.phaseTimerEndsAt = null;
      updates.votes = defaultVotes();
      updates.proposalA = null;
      updates.proposalB = null;
      updates.proposalC = null;
      break;
    case "voting_lineup":
      updates.votes = defaultVotes();
      updates.phaseTimerEndsAt = null;
      break;
    case "reshuffle_reveal": {
      const uids = lobby.slots.filter(Boolean) as string[];
      if (uids.length < LOBBY_SIZE) {
        throw new Error("Lobby musi być pełne, aby wygenerować propozycje Ł/O/Ś");
      }
      const players = await fetchLobbyPlayers(uids);
      const { proposalA, proposalB, proposalC } = generateDistinctProposals(
        players,
        lobby.balanceMode,
        {
          exclude:
            lobby.team1.length && lobby.team2.length
              ? [{ team1: lobby.team1, team2: lobby.team2 }]
              : [],
          featuredMatchup: lobby.featuredMatchup ?? null,
        }
      );
      updates.proposalA = toFirestoreProposal(proposalA);
      updates.proposalB = toFirestoreProposal(proposalB);
      updates.proposalC = toFirestoreProposal(proposalC);
      updates.revealRoleIndex = 0;
      updates.votes = defaultVotes();
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + REVEAL_SECONDS * 1000
      );
      break;
    }
    case "voting_proposals": {
      let proposalA = lobby.proposalA;
      let proposalB = lobby.proposalB;
      let proposalC = lobby.proposalC ?? null;
      if (!proposalA || !proposalB || !proposalC) {
        const uids = lobby.slots.filter(Boolean) as string[];
        if (uids.length < LOBBY_SIZE) {
          throw new Error("Brak propozycji Ł/O/Ś — uzupełnij lobby");
        }
        const players = await fetchLobbyPlayers(uids);
        const proposals = generateDistinctProposals(players, lobby.balanceMode, {
          exclude:
            lobby.team1.length && lobby.team2.length
              ? [{ team1: lobby.team1, team2: lobby.team2 }]
              : [],
          featuredMatchup: lobby.featuredMatchup ?? null,
        });
        proposalA = proposals.proposalA;
        proposalB = proposals.proposalB;
        proposalC = proposals.proposalC;
      }
      updates.proposalA = toFirestoreProposal(proposalA);
      updates.proposalB = toFirestoreProposal(proposalB);
      updates.proposalC = toFirestoreProposal(proposalC);
      updates.votes = defaultVotes();
      updates.phaseTimerEndsAt = null;
      break;
    }
    case "weakness_pick": {
      const existing = normalizeDrawnWeaknesses(lobby.weaknesses?.drawn);
      if (!existing.length) {
        throw new Error("Najpierw wylosuj osłabienia");
      }
      const drawn = existing.map((cell) => ({ ...cell, revealed: true }));
      updates.weaknesses = toFirestoreWeaknesses({
        ...lobby.weaknesses,
        drawn,
        selectorUid: findWeaknessSelector(lobby),
        pointsTotal: getWeaknessPointsTotal(lobby),
        pointsSpent: 0,
        selected: [],
        confirmed: false,
        revealIndex: drawn.length,
      });
      updates.phaseTimerEndsAt = null;
      break;
    }
    case "final":
      updates.phaseTimerEndsAt = null;
      break;
    case "playing":
    case "post_game":
    case "session_summary":
      updates.phaseTimerEndsAt = null;
      break;
    default:
      throw new Error(`Faza ${phase} nie jest obsługiwana przez panel admina`);
  }

  await updateDoc(lobbyRef, updates);
}
