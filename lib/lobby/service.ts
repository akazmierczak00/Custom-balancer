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
import { drawWeaknessGrid } from "@/lib/algorithms/drawWeaknesses";
import { compareRanks } from "@/lib/constants/ranks";
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
    drawn: [] as WeaknessCell[][],
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

export async function createLobby(adminUid: string): Promise<string> {
  const ref = await addDoc(collection(getFirebaseDb(), "lobbies"), {
    createdBy: adminUid,
    status: "open" as LobbyStatus,
    slots: emptySlots(),
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
    const filled = slots.filter(Boolean).length;

    const updates: Record<string, unknown> = {
      slots,
      updatedAt: serverTimestamp(),
    };

    if (filled === LOBBY_SIZE) {
      updates.status = "confirming";
      updates.acceptDeadline = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
    }

    tx.update(lobbyRef, updates);
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

    const filled = slots.filter(Boolean).length;
    const updates: Record<string, unknown> = {
      slots,
      acceptances,
      updatedAt: serverTimestamp(),
    };

    if (filled === LOBBY_SIZE) {
      updates.status = "confirming";
      updates.acceptDeadline = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
      updates.phaseTimerEndsAt = Timestamp.fromMillis(
        Date.now() + CONFIRM_SECONDS * 1000
      );
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

    tx.update(lobbyRef, {
      slots,
      acceptances,
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
    team1: proposal.team1,
    team2: proposal.team2,
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
      proposalA,
      proposalB,
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

    const voteCount = Object.keys(votes.proposals).length;
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
    const voteCount = Object.keys(proposals).length;
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
  return {
    team1: proposal.team1,
    team2: proposal.team2,
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
    votes: defaultVotes(),
    phaseTimerEndsAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function startWeaknessReveal(lobbyId: string) {
  const weaknessesSnap = await getDocs(collection(getFirebaseDb(), "weaknesses"));
  const weaknesses = weaknessesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Weakness
  );

  if (weaknesses.length === 0) {
    throw new Error("Brak osłabień w bazie — dodaj je w panelu admina");
  }

  const drawn = drawWeaknessGrid(weaknesses);

  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "weakness_reveal",
    weaknesses: {
      ...defaultWeaknessesState(),
      drawn,
      pointsTotal: 3,
      revealIndex: 0,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function revealNextWeakness(lobbyId: string) {
  const lobbyRef = doc(getFirebaseDb(), "lobbies", lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const drawn = lobby.weaknesses.drawn.map((row) =>
    row.map((cell) => ({ ...cell }))
  );

  const flat = drawn.flat();
  const nextIndex = lobby.weaknesses.revealIndex;
  if (nextIndex >= flat.length) {
    const selectorUid = findWeaknessSelector(lobby);
    const pointsTotal = 3 + (lobby.reshuffleBonusGranted ? 1 : 0);
    await updateDoc(lobbyRef, {
      status: "weakness_pick",
      weaknesses: {
        ...lobby.weaknesses,
        drawn,
        selectorUid,
        pointsTotal,
        revealIndex: flat.length,
      },
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const cell = flat[nextIndex];
  const rowIdx = Math.floor(nextIndex / 3);
  const colIdx = nextIndex % 3;
  drawn[rowIdx][colIdx] = { ...cell, revealed: true };

  await updateDoc(lobbyRef, {
    weaknesses: {
      ...lobby.weaknesses,
      drawn,
      revealIndex: nextIndex + 1,
    },
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
      weaknesses: {
        ...lobby.weaknesses,
        selected: [...lobby.weaknesses.selected, selected],
        pointsSpent: newSpent,
      },
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
      weaknesses: { ...lobby.weaknesses, confirmed: true },
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
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return;

  const lobby = snap.data() as Lobby;
  const winners = team === 1 ? lobby.team1 : lobby.team2;
  const losers = team === 1 ? lobby.team2 : lobby.team1;

  await runTransaction(getFirebaseDb(), async (tx) => {
    for (const player of winners) {
      const userRef = doc(getFirebaseDb(), "users", player.uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) continue;
      const data = userSnap.data() as UserProfile;
      const history = [...data.matchHistory, "W"].slice(-10);
      tx.update(userRef, {
        wins: data.wins + 1,
        matchHistory: history,
      });
    }

    for (const player of losers) {
      const userRef = doc(getFirebaseDb(), "users", player.uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) continue;
      const data = userSnap.data() as UserProfile;
      const history = [...data.matchHistory, "L"].slice(-10);
      tx.update(userRef, {
        losses: data.losses + 1,
        matchHistory: history,
      });
    }

    tx.update(lobbyRef, {
      status: "post_game",
      winnerTeam: team,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function startCooldown(lobbyId: string, minutes: number) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "cooldown",
    cooldownMinutes: minutes,
    cooldownEndsAt: Timestamp.fromMillis(Date.now() + minutes * 60 * 1000),
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + minutes * 60 * 1000),
    updatedAt: serverTimestamp(),
  });
}

export async function restartAfterCooldown(lobbyId: string) {
  await updateDoc(doc(getFirebaseDb(), "lobbies", lobbyId), {
    status: "reveal",
    revealRoleIndex: 0,
    votes: defaultVotes(),
    weaknesses: defaultWeaknessesState(),
    winnerTeam: null,
    cooldownMinutes: null,
    cooldownEndsAt: null,
    phaseTimerEndsAt: Timestamp.fromMillis(Date.now() + REVEAL_SECONDS * 1000),
    updatedAt: serverTimestamp(),
  });
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
