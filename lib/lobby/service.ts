import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/config";
import {
  buildFullProposal,
  generateDistinctProposals,
} from "@/lib/algorithms/balanceTeams";
import {
  sanitizeWeaknessForm,
  WeaknessFormInput,
} from "@/lib/weaknesses/helpers";
import {
  drawWeaknessGrid,
  flattenWeaknessGrid,
  normalizeDrawnWeaknesses,
} from "@/lib/algorithms/drawWeaknesses";
import { compareRanks } from "@/lib/constants/ranks";
import {
  toFirestoreProposal,
  toFirestoreTeam,
  toFirestoreWeaknesses,
} from "@/lib/lobby/firestore-lobby";
import {
  getAvailableTestBots,
  isTestBotUid,
  TEST_BOT_DEFINITIONS,
} from "@/lib/lobby/test-bots";
import {
  Lobby,
  LobbyPlayer,
  LobbyStatus,
  LoLRank,
  MatchResult,
  PlayerAssignment,
  SelectedWeakness,
  TeamProposal,
  UserProfile,
  Weakness,
  WeaknessCell,
} from "@/types";

const LOBBY_SIZE = 10;
const REVEAL_SECONDS = 5;
const CONFIRM_SECONDS = 20;
const VOTE_LOCK_SECONDS = 10;

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

function defaultVotes() {
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

function shouldStartConfirmPhase(lobby: Lobby, presentUids?: Record<string, boolean>) {
  if (lobby.status !== "open") return false;
  const nextLobby = presentUids ? { ...lobby, presentUids } : lobby;
  return allPlayersInLobbyRoom(nextLobby);
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

export async function createLobby(adminUid: string): Promise<string> {
  const ref = await addDoc(collection(getFirebaseDb(), "lobbies"), {
    createdBy: adminUid,
    status: "open" as LobbyStatus,
    slots: emptySlots(),
    presentUids: {},
    acceptances: {},
    acceptDeadline: null,
    team1: [],
    team2: [],
    proposalA: null,
    proposalB: null,
    votes: defaultVotes(),
    reshuffleBonusGranted: false,
    weaknesses: defaultWeaknessesState(),
    winnerTeam: null,
    roundHistory: [],
    cooldownMinutes: null,
    cooldownEndsAt: null,
    phaseTimerEndsAt: null,
    revealRoleIndex: 0,
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
    if (lobby.status !== "open") throw new Error("Lobby nie przyjmuje zapisów");
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

    const alreadyPresent = !!lobby.presentUids?.[uid];
    const presentUids = alreadyPresent
      ? { ...(lobby.presentUids ?? {}) }
      : { ...(lobby.presentUids ?? {}), [uid]: true };
    const nextLobby = { ...lobby, presentUids };

    if (alreadyPresent) {
      if (!shouldStartConfirmPhase(nextLobby)) return;
      tx.update(lobbyRef, {
        ...confirmPhaseUpdates(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const updates: Record<string, unknown> = {
      presentUids,
      updatedAt: serverTimestamp(),
    };

    if (shouldStartConfirmPhase(nextLobby)) {
      Object.assign(updates, confirmPhaseUpdates());
    }

    tx.update(lobbyRef, updates);
  });
}

export async function tryStartConfirmPhase(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (!shouldStartConfirmPhase(lobby)) return;

    tx.update(lobbyRef, {
      ...confirmPhaseUpdates(),
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

export async function seedTestBotProfiles() {
  for (const bot of TEST_BOT_DEFINITIONS) {
    await setDoc(
      doc(getFirebaseDb(), "users", bot.uid),
      {
        email: `${bot.uid}@test.local`,
        role: "user",
        nick: bot.nick,
        rank: bot.rank,
        rolePriorities: bot.rolePriorities,
        wins: bot.wins,
        losses: bot.losses,
        matchHistory: bot.matchHistory,
        profileComplete: true,
        achievements: [],
        isTestBot: true,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function fillLobbyWithTestBots(lobbyId: string) {
  await seedTestBotProfiles();

  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "open") {
      throw new Error("Można wypełnić botami tylko otwarte lobby");
    }

    const slots = [...lobby.slots];
    const used = slots.filter(Boolean) as string[];
    const available = getAvailableTestBots(used);

    let botIndex = 0;
    for (let i = 0; i < slots.length && botIndex < available.length; i++) {
      if (slots[i] === null) {
        slots[i] = available[botIndex].uid;
        botIndex++;
      }
    }

    if (botIndex === 0) {
      throw new Error("Brak wolnych slotów lub dostępnych botów");
    }

    const acceptances = { ...lobby.acceptances };
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

    const nextLobby = { ...lobby, slots };
    if (shouldStartConfirmPhase(nextLobby)) {
      Object.assign(updates, confirmPhaseUpdates());
    }

    tx.update(lobbyRef, updates);
  });
}

export async function leaveLobby(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) return;

    const lobby = snap.data() as Lobby;
    if (lobby.status !== "open" && lobby.status !== "confirming") {
      throw new Error("Nie można opuścić lobby w tej fazie");
    }

    const slots = lobby.slots.map((s) => (s === uid ? null : s));
    const acceptances = { ...lobby.acceptances };
    delete acceptances[uid];
    const presentUids = { ...(lobby.presentUids ?? {}) };
    delete presentUids[uid];

    tx.update(lobbyRef, {
      slots,
      acceptances,
      presentUids,
      status: "open",
      acceptDeadline: null,
      phaseTimerEndsAt: null,
      updatedAt: serverTimestamp(),
    });
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
  const proposal = buildFullProposal(players);

  await updateDoc(lobbyRef, {
    team1: toFirestoreTeam(proposal.team1),
    team2: toFirestoreTeam(proposal.team2),
    status: "reveal",
    revealRoleIndex: 0,
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
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
    const { proposalA, proposalB } = generateDistinctProposals(players);

    await updateDoc(lobbyRef, {
      status: "reshuffle_reveal",
      proposalA: toFirestoreProposal(proposalA),
      proposalB: toFirestoreProposal(proposalB),
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
  choice: "A" | "B"
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

export async function castProposalVoteForTeam(lobbyId: string, choice: "A" | "B") {
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

  let winningProposal: TeamProposal;
  if (countA === 5 && countB === 5) {
    winningProposal = Math.random() < 0.5 ? lobby.proposalA! : lobby.proposalB!;
  } else if (countA >= 6) {
    winningProposal = lobby.proposalA!;
  } else {
    winningProposal = lobby.proposalB!;
  }

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
    weaknesses: toFirestoreWeaknesses({
      ...defaultWeaknessesState(),
      drawn,
      pointsTotal: 3,
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
    const pointsTotal = 3 + (lobby.reshuffleBonusGranted ? 1 : 0);
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
    compareRanks(a.rank, b.rank)
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

export async function confirmWeaknesses(lobbyId: string, uid: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(lobbyRef);
    if (!snap.exists()) throw new Error("Lobby nie istnieje");

    const lobby = snap.data() as Lobby;
    if (lobby.weaknesses.selectorUid !== uid) {
      throw new Error("Nie jesteś selektorem osłabień");
    }
    if (lobby.weaknesses.pointsSpent !== lobby.weaknesses.pointsTotal) {
      throw new Error("Musisz wydać wszystkie punkty");
    }

    tx.update(lobbyRef, {
      status: "final",
      weaknesses: toFirestoreWeaknesses({
        ...lobby.weaknesses,
        confirmed: true,
      }),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startPlaying(lobbyId: string) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "playing",
    updatedAt: serverTimestamp(),
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

export async function startNextRound(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) throw new Error("Lobby nie istnieje");

  const lobby = snap.data() as Lobby;
  const team1 = await refreshTeamAssignments(lobby.team1);
  const team2 = await refreshTeamAssignments(lobby.team2);

  await updateDoc(lobbyRef, {
    status: "reveal",
    team1: toFirestoreTeam(team1),
    team2: toFirestoreTeam(team2),
    revealRoleIndex: 0,
    votes: defaultVotes(),
    proposalA: null,
    proposalB: null,
    weaknesses: defaultWeaknessesState(),
    winnerTeam: null,
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
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
      updates.revealRoleIndex = 0;
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + REVEAL_SECONDS * 1000
      );
      break;
    case "overview":
      updates.phaseTimerEndsAt = null;
      updates.votes = { ...defaultVotes(), locked: true };
      updates.proposalA = null;
      updates.proposalB = null;
      break;
    case "voting_lineup":
      updates.votes = defaultVotes();
      updates.phaseTimerEndsAt = null;
      break;
    case "reshuffle_reveal": {
      const uids = lobby.slots.filter(Boolean) as string[];
      if (uids.length < LOBBY_SIZE) {
        throw new Error("Lobby musi być pełne, aby wygenerować propozycje A/B");
      }
      const players = await fetchLobbyPlayers(uids);
      const { proposalA, proposalB } = generateDistinctProposals(players);
      updates.proposalA = toFirestoreProposal(proposalA);
      updates.proposalB = toFirestoreProposal(proposalB);
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
      if (!proposalA || !proposalB) {
        const uids = lobby.slots.filter(Boolean) as string[];
        if (uids.length < LOBBY_SIZE) {
          throw new Error("Brak propozycji A/B — uzupełnij lobby");
        }
        const players = await fetchLobbyPlayers(uids);
        const proposals = generateDistinctProposals(players);
        proposalA = proposals.proposalA;
        proposalB = proposals.proposalB;
      }
      updates.proposalA = toFirestoreProposal(proposalA);
      updates.proposalB = toFirestoreProposal(proposalB);
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
        pointsTotal: 3 + (lobby.reshuffleBonusGranted ? 1 : 0),
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
