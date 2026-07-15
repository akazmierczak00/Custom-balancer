"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { AdminLobbyControls } from "@/components/lobby/admin-lobby-controls";
import { ConfirmPopup } from "@/components/lobby/confirm-popup";
import { LobbyParticipants } from "@/components/lobby/lobby-participants";
import { RoleReveal } from "@/components/lobby/role-reveal";
import { TeamOverview } from "@/components/lobby/team-overview";
import { LineupVotePanel } from "@/components/lobby/lineup-vote-panel";
import { ProposalVotePanel } from "@/components/lobby/proposal-vote-panel";
import { WeaknessGrid } from "@/components/lobby/weakness-grid";
import { PostGamePanel } from "@/components/lobby/post-game-panel";
import { SessionSummaryPanel } from "@/components/lobby/session-summary-panel";
import {
  advanceReveal,
  advanceReshuffleReveal,
  confirmWeaknesses,
  deselectWeakness,
  draftTeams,
  fillLobbyWithTestBots,
  resolveLineupVote,
  resolveProposalVote,
  restartConfirmTimer,
  revealNextWeakness,
  selectWeakness,
  enterLobbyRoom,
  exitLobbyRoom,
  countPlayersInLobbyRoom,
  startLineupVoting,
  startWeaknessReveal,
} from "@/lib/lobby/service";
import { getWeaknessCellIndex, WEAKNESS_REVEAL_DELAY_MS } from "@/lib/algorithms/drawWeaknesses";
import { Lobby, UserProfile } from "@/types";

interface LobbyRoomProps {
  lobby: Lobby;
  profile: UserProfile;
}

export function LobbyRoom({ lobby, profile }: LobbyRoomProps) {
  const isAdmin = profile.role === "admin";
  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);
  const transitionLock = useRef(false);
  const weaknessRevealInFlight = useRef(false);
  const [weaknessLoading, setWeaknessLoading] = useState(false);
  const [adminActingAsSelector, setAdminActingAsSelector] = useState(false);

  const isLobbyFull = lobby.slots.filter(Boolean).length === 10;
  const playersInRoom = countPlayersInLobbyRoom(lobby);
  const showConfirmPopup =
    lobby.status === "confirming" && isLobbyFull && remaining > 0;

  useEffect(() => {
    if (!lobby.slots.includes(profile.uid)) return;

    void enterLobbyRoom(lobby.id, profile.uid);
    return () => {
      void exitLobbyRoom(lobby.id, profile.uid);
    };
  }, [lobby.id, profile.uid]);

  const runTransition = useCallback(async (fn: () => Promise<void>) => {
    if (transitionLock.current) return;
    transitionLock.current = true;
    try {
      await fn();
    } finally {
      setTimeout(() => {
        transitionLock.current = false;
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (lobby.status === "drafting") {
      runTransition(() => draftTeams(lobby.id));
    }
  }, [lobby.status, lobby.id, runTransition]);

  useEffect(() => {
    if (lobby.status === "reveal" && remaining === 0 && lobby.revealRoleIndex < 5) {
      runTransition(() => advanceReveal(lobby.id));
    }
  }, [lobby.status, remaining, lobby.revealRoleIndex, lobby.id, runTransition]);

  useEffect(() => {
    if (lobby.status === "reshuffle_reveal" && remaining === 0 && lobby.revealRoleIndex < 5) {
      runTransition(() => advanceReshuffleReveal(lobby.id));
    }
  }, [lobby.status, remaining, lobby.revealRoleIndex, lobby.id, runTransition]);

  useEffect(() => {
    if (lobby.status === "locked_lineup" && remaining === 0) {
      runTransition(() => resolveLineupVote(lobby.id));
    }
  }, [lobby.status, remaining, lobby.id, runTransition]);

  useEffect(() => {
    if (lobby.status === "locked_proposals" && remaining === 0) {
      runTransition(() => resolveProposalVote(lobby.id));
    }
  }, [lobby.status, remaining, lobby.id, runTransition]);

  useEffect(() => {
    if (lobby.status !== "weakness_reveal" || !lobby.weaknesses?.drawn?.length) {
      return;
    }

    const drawn = lobby.weaknesses.drawn;
    const nextIndex = lobby.weaknesses.revealIndex ?? 0;

    const advance = async () => {
      if (weaknessRevealInFlight.current) return;
      weaknessRevealInFlight.current = true;
      try {
        await revealNextWeakness(lobby.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : "";
        if (message.includes("Missing or insufficient permissions")) return;
        alert(message || "Błąd odkrywania osłabienia");
      } finally {
        weaknessRevealInFlight.current = false;
      }
    };

    if (nextIndex < drawn.length) {
      const timer = setTimeout(() => {
        void advance();
      }, WEAKNESS_REVEAL_DELAY_MS);
      return () => clearTimeout(timer);
    }

    if (nextIndex >= drawn.length) {
      void advance();
    }
  }, [
    lobby.status,
    lobby.weaknesses.revealIndex,
    lobby.weaknesses.drawn,
    lobby.id,
    runTransition,
  ]);

  useEffect(() => {
    if (lobby.status !== "weakness_pick") {
      setAdminActingAsSelector(false);
    }
  }, [lobby.status]);

  const selectorUid = lobby.weaknesses?.selectorUid ?? null;
  const selectorPlayer = [...lobby.team1, ...lobby.team2].find(
    (player) => player.uid === selectorUid
  );
  const canAdminActAsSelector =
    isAdmin &&
    lobby.status === "weakness_pick" &&
    !!selectorUid &&
    selectorUid !== profile.uid;
  const isActingAsSelector =
    selectorUid === profile.uid || (isAdmin && adminActingAsSelector);
  const getWeaknessActingUid = () =>
    isAdmin && adminActingAsSelector && selectorUid ? selectorUid : profile.uid;

  const lineupResultText =
    lobby.status === "overview" && lobby.votes.locked
      ? Object.values(lobby.votes.lineup).filter((v) => v === "reshuffle").length < 6
        ? "Wygrał aktualny skład — brak zmiany"
        : undefined
      : undefined;

  const canStartLineupVoting =
    lobby.status === "overview" && !lobby.votes?.locked && isAdmin;

  const showTeamOverview =
    lobby.status === "overview" ||
    lobby.status === "voting_lineup" ||
    lobby.status === "locked_lineup" ||
    lobby.status === "weakness_reveal" ||
    lobby.status === "weakness_pick" ||
    lobby.status === "final" ||
    lobby.status === "playing" ||
    lobby.status === "post_game" ||
    !!lobby.weaknesses?.confirmed;

  const showWeaknessSection =
    (lobby.status === "weakness_reveal" ||
      lobby.status === "weakness_pick" ||
      lobby.weaknesses?.confirmed) &&
    lobby.weaknesses;
  const canStartWeaknessReveal =
    lobby.status === "overview" &&
    lobby.team1.length > 0 &&
    !lobby.weaknesses?.confirmed;

  const handleStartWeaknessReveal = async () => {
    setWeaknessLoading(true);
    try {
      await startWeaknessReveal(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd losowania osłabień");
    } finally {
      setWeaknessLoading(false);
    }
  };

  const handleWeaknessSelect = async (row: number, col: number) => {
    const cell = lobby.weaknesses?.drawn[getWeaknessCellIndex(row, col)];
    if (!cell) return;

    const isSelected = lobby.weaknesses.selected.some(
      (item) => item.weaknessId === cell.weaknessId && item.tier === cell.tier
    );

    if (isSelected) {
      await deselectWeakness(lobby.id, getWeaknessActingUid(), cell);
      return;
    }

    await selectWeakness(lobby.id, getWeaknessActingUid(), cell);
  };

  const handleConfirmWeaknesses = async () => {
    try {
      await confirmWeaknesses(lobby.id, getWeaknessActingUid());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd zatwierdzenia");
    }
  };

  const filledSlots = lobby.slots.filter(Boolean).length;

  const handleFillTestBots = async () => {
    try {
      await fillLobbyWithTestBots(lobby.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wypełniania");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lobby #{lobby.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-400">
            Status: {lobby.status}
            {lobby.status === "open" ? ` · ${filledSlots}/10` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isAdmin && <AdminLobbyControls lobby={lobby} />}
          <div className="flex items-center gap-3">
          {lobby.status === "open" && isAdmin && filledSlots < 10 && (
            <Button variant="outline" size="sm" onClick={handleFillTestBots}>
              Wypełnij botami (test)
            </Button>
          )}
          {remaining > 0 &&
            lobby.status !== "reveal" &&
            lobby.status !== "reshuffle_reveal" && (
            <p className="text-3xl font-bold text-indigo-400">{remaining}s</p>
          )}
          </div>
        </div>
      </div>

      <ConfirmPopup
        lobby={lobby}
        currentUid={profile.uid}
        isAdmin={isAdmin}
        open={showConfirmPopup}
      />

      {(lobby.status === "open" || lobby.status === "confirming" || lobby.status === "drafting") && (
        <LobbyParticipants
          lobby={lobby}
          currentUid={profile.uid}
          isAdmin={isAdmin}
          showConfirmActions={showConfirmPopup}
          playersInRoom={playersInRoom}
        />
      )}

      {lobby.status === "drafting" && (
        <p className="text-center text-slate-400">Losowanie składów...</p>
      )}

      {isAdmin && isLobbyFull && lobby.status === "confirming" && remaining === 0 && (
        <div className="flex justify-center">
          <Button onClick={() => restartConfirmTimer(lobby.id)}>
            Uruchom ponownie timer akceptacji
          </Button>
        </div>
      )}

      {lobby.status === "reveal" && (
        <RoleReveal lobby={lobby} currentUid={profile.uid} />
      )}

      {lobby.status === "reshuffle_reveal" && (
        <RoleReveal lobby={lobby} dual currentUid={profile.uid} />
      )}

      {showTeamOverview && (
        <TeamOverview
          lobby={lobby}
          currentUid={profile.uid}
          votes={
            lobby.status === "voting_lineup" || lobby.status === "locked_lineup"
              ? lobby.votes.lineup
              : undefined
          }
        />
      )}

      {canStartLineupVoting && (
        <div className="flex justify-center">
          <Button onClick={() => startLineupVoting(lobby.id)}>
            Rozpocznij głosowanie
          </Button>
        </div>
      )}

      {(lobby.status === "voting_lineup" || lobby.status === "locked_lineup") && (
        <LineupVotePanel
          lobby={lobby}
          currentUid={profile.uid}
          locked={lobby.votes.locked}
          remaining={remaining}
          resultText={lineupResultText}
          isAdmin={isAdmin}
        />
      )}

      {(lobby.status === "voting_proposals" ||
        lobby.status === "locked_proposals") && (
        <ProposalVotePanel
          lobby={lobby}
          currentUid={profile.uid}
          locked={lobby.votes.locked}
          remaining={remaining}
          isAdmin={isAdmin}
        />
      )}

      {canStartWeaknessReveal && isAdmin && (
          <div className="flex justify-center">
            <Button onClick={handleStartWeaknessReveal} disabled={weaknessLoading}>
              {weaknessLoading ? "Losowanie..." : "Losuj osłabienia Adriana"}
            </Button>
          </div>
        )}

      {showWeaknessSection && (
        <div className="space-y-4">
          {canAdminActAsSelector && (
            <div className="flex justify-center">
              <Button
                variant={adminActingAsSelector ? "default" : "outline"}
                onClick={() => setAdminActingAsSelector((value) => !value)}
              >
                {adminActingAsSelector
                  ? "Wyjdź z widoku selektora"
                  : `Wciel się w ${selectorPlayer?.nick ?? "selektora"}`}
              </Button>
            </div>
          )}
          <WeaknessGrid
            weaknesses={lobby.weaknesses}
            selectable={lobby.status === "weakness_pick"}
            onSelect={handleWeaknessSelect}
            currentUid={profile.uid}
            actAsSelector={isAdmin && adminActingAsSelector}
          />
          {lobby.status === "weakness_pick" && isActingAsSelector && (
            <div className="flex justify-center">
              <Button
                onClick={handleConfirmWeaknesses}
                disabled={
                  lobby.weaknesses.pointsSpent !== lobby.weaknesses.pointsTotal
                }
              >
                Zatwierdź osłabienia
              </Button>
            </div>
          )}
        </div>
      )}

      {lobby.status === "session_summary" && (
        <SessionSummaryPanel lobby={lobby} isAdmin={isAdmin} />
      )}

      <PostGamePanel lobby={lobby} isAdmin={isAdmin} />
    </div>
  );
}
