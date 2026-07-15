"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhaseTimer } from "@/hooks/use-phase-timer";
import { ConfirmPopup } from "@/components/lobby/confirm-popup";
import { LobbyParticipants } from "@/components/lobby/lobby-participants";
import { RoleReveal } from "@/components/lobby/role-reveal";
import { TeamOverview } from "@/components/lobby/team-overview";
import { LineupVotePanel } from "@/components/lobby/lineup-vote-panel";
import { ProposalVotePanel } from "@/components/lobby/proposal-vote-panel";
import { WeaknessGrid } from "@/components/lobby/weakness-grid";
import { PostGamePanel } from "@/components/lobby/post-game-panel";
import {
  advanceReveal,
  advanceReshuffleReveal,
  confirmWeaknesses,
  draftTeams,
  fillLobbyWithTestBots,
  resolveLineupVote,
  resolveProposalVote,
  restartAfterCooldown,
  revealNextWeakness,
  selectWeakness,
  startLineupVoting,
  startPlaying,
  startWeaknessReveal,
} from "@/lib/lobby/service";
import { getRevealDelay } from "@/lib/algorithms/drawWeaknesses";
import { Lobby, UserProfile } from "@/types";

interface LobbyRoomProps {
  lobby: Lobby;
  profile: UserProfile;
}

export function LobbyRoom({ lobby, profile }: LobbyRoomProps) {
  const isAdmin = profile.role === "admin";
  const remaining = usePhaseTimer(lobby.phaseTimerEndsAt);
  const transitionLock = useRef(false);
  const [weaknessLoading, setWeaknessLoading] = useState(false);

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
    if (lobby.status === "weakness_reveal") {
      const flat = lobby.weaknesses.drawn.flat();
      const nextIndex = lobby.weaknesses.revealIndex;
      if (nextIndex < flat.length) {
        const cell = flat[nextIndex];
        const delay = getRevealDelay(cell.rarity);
        const timer = setTimeout(() => {
          runTransition(() => revealNextWeakness(lobby.id));
        }, delay);
        return () => clearTimeout(timer);
      }
      if (nextIndex >= flat.length && flat.length > 0) {
        runTransition(() => revealNextWeakness(lobby.id));
      }
    }
  }, [
    lobby.status,
    lobby.weaknesses.revealIndex,
    lobby.weaknesses.drawn,
    lobby.id,
    runTransition,
  ]);

  useEffect(() => {
    if (lobby.status === "cooldown" && remaining === 0 && isAdmin) {
      runTransition(() => restartAfterCooldown(lobby.id));
    }
  }, [lobby.status, remaining, isAdmin, lobby.id, runTransition]);

  const lineupResultText =
    lobby.status === "overview" && lobby.votes.locked
      ? Object.values(lobby.votes.lineup).filter((v) => v === "reshuffle").length < 6
        ? "Wygrał aktualny skład — brak zmiany"
        : undefined
      : undefined;

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
    const cell = lobby.weaknesses.drawn[row]?.[col];
    if (!cell) return;
    try {
      await selectWeakness(lobby.id, profile.uid, cell);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd wyboru");
    }
  };

  const handleConfirmWeaknesses = async () => {
    try {
      await confirmWeaknesses(lobby.id, profile.uid);
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

      <ConfirmPopup
        lobby={lobby}
        currentUid={profile.uid}
        isAdmin={isAdmin}
        open={lobby.status === "confirming"}
      />

      {(lobby.status === "open" || lobby.status === "confirming" || lobby.status === "drafting") && (
        <LobbyParticipants
          lobby={lobby}
          currentUid={profile.uid}
          isAdmin={isAdmin}
          showConfirmActions={lobby.status === "confirming"}
        />
      )}

      {lobby.status === "drafting" && (
        <p className="text-center text-slate-400">Losowanie składów...</p>
      )}

      {lobby.status === "reveal" && <RoleReveal lobby={lobby} />}

      {lobby.status === "reshuffle_reveal" && (
        <RoleReveal lobby={lobby} dual />
      )}

      {(lobby.status === "overview" ||
        lobby.status === "voting_lineup" ||
        lobby.status === "locked_lineup" ||
        lobby.status === "final" ||
        lobby.status === "playing" ||
        lobby.status === "post_game" ||
        lobby.status === "cooldown") && (
        <TeamOverview
          lobby={lobby}
          votes={
            lobby.status === "voting_lineup" || lobby.status === "locked_lineup"
              ? lobby.votes.lineup
              : undefined
          }
        />
      )}

      {lobby.status === "overview" && !lobby.votes.locked && isAdmin && (
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

      {(lobby.status === "weakness_reveal" ||
        lobby.status === "weakness_pick" ||
        lobby.weaknesses.confirmed) && (
        <div className="space-y-4">
          <WeaknessGrid
            weaknesses={lobby.weaknesses}
            selectable={lobby.status === "weakness_pick"}
            onSelect={handleWeaknessSelect}
            currentUid={profile.uid}
          />
          {lobby.status === "weakness_pick" &&
            lobby.weaknesses.selectorUid === profile.uid &&
            lobby.weaknesses.pointsSpent === lobby.weaknesses.pointsTotal && (
              <div className="flex justify-center">
                <Button onClick={handleConfirmWeaknesses}>Zatwierdź osłabienia</Button>
              </div>
            )}
        </div>
      )}

      {lobby.status === "final" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
          <h2 className="text-xl font-bold text-emerald-300">Ostateczny skład</h2>
          <p className="mt-2 text-slate-300">Gra może się rozpocząć.</p>
          {isAdmin && (
            <Button className="mt-4" onClick={() => startPlaying(lobby.id)}>
              Rozpocznij grę
            </Button>
          )}
        </div>
      )}

      <PostGamePanel
        lobby={lobby}
        isAdmin={isAdmin}
        remaining={remaining}
        onCooldownEnd={() => restartAfterCooldown(lobby.id)}
      />
    </div>
  );
}
