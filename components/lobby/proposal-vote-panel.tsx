"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamOverview } from "@/components/lobby/team-overview";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { VoteVoterList } from "@/components/lobby/vote-voter-list";
import { castProposalVote, castProposalVoteForTeam } from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { Lobby, ProposalVoteChoice } from "@/types";

interface ProposalVotePanelProps {
  lobby: Lobby;
  currentUid: string;
  locked: boolean;
  remaining: number;
  isAdmin?: boolean;
}

export function ProposalVotePanel({
  lobby,
  currentUid,
  locked,
  remaining,
  isAdmin = false,
}: ProposalVotePanelProps) {
  const lobbyUsers = useLobbyUsers();
  const votes = lobby.votes.proposals;
  const countA = Object.values(votes).filter((v) => v === "A").length;
  const countB = Object.values(votes).filter((v) => v === "B").length;
  const votedCount = lobby.slots.filter((uid) => uid && votes[uid]).length;
  const myVote = votes[currentUid];
  const totalVotes = Math.max(votedCount, 1);
  const shareA = (countA / totalVotes) * 100;
  const shareB = (countB / totalVotes) * 100;

  const nickByUid = useMemo(() => {
    const map = new Map<string, string>();
    const players = [
      ...lobby.team1,
      ...lobby.team2,
      ...(lobby.proposalA?.team1 ?? []),
      ...(lobby.proposalA?.team2 ?? []),
      ...(lobby.proposalB?.team1 ?? []),
      ...(lobby.proposalB?.team2 ?? []),
    ];
    for (const player of players) {
      map.set(player.uid, player.nick);
    }
    if (lobbyUsers) {
      for (const [uid, profile] of Object.entries(lobbyUsers)) {
        if (!map.has(uid) && profile.nick) {
          map.set(uid, profile.nick);
        }
      }
    }
    return map;
  }, [lobby.team1, lobby.team2, lobby.proposalA, lobby.proposalB, lobbyUsers]);

  const votersFor = (choice: ProposalVoteChoice) =>
    Object.entries(votes)
      .filter(([, vote]) => vote === choice)
      .map(([uid]) => nickByUid.get(uid) ?? uid.slice(0, 6))
      .sort((a, b) => a.localeCompare(b, "pl"));

  const votersA = votersFor("A");
  const votersB = votersFor("B");

  const vote = async (choice: "A" | "B") => {
    try {
      await castProposalVote(lobby.id, currentUid, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania");
    }
  };

  const voteForTeam = async (choice: "A" | "B") => {
    try {
      await castProposalVoteForTeam(lobby.id, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania za team");
    }
  };

  return (
    <Card className="overflow-hidden border-slate-700/80 bg-slate-900/60">
      <CardHeader className="border-b border-slate-800/80 pb-4">
        <CardTitle className="text-xl text-slate-100">
          Wybierz propozycję składów
        </CardTitle>
        <p className="text-sm text-slate-400">
          {locked
            ? "Głosowanie zamknięte — trwa rozstrzygnięcie"
            : myVote
              ? "Możesz jeszcze zmienić głos, dopóki nie zagłosują wszyscy"
              : "Porównaj obie propozycje i oddaj głos na A albo B"}
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {locked && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-5 text-center">
            <p className="text-sm uppercase tracking-wide text-amber-400/80">
              Rozstrzygnięcie
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-amber-300">
              {remaining}s
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <button
            type="button"
            disabled={locked || myVote === "A"}
            onClick={() => void vote("A")}
            className={cn(
              "flex min-w-0 flex-col space-y-4 overflow-hidden rounded-xl border p-3 text-left transition-all sm:p-4",
              myVote === "A"
                ? "border-sky-500/50 bg-sky-950/25 ring-1 ring-sky-400/30"
                : "border-slate-700/80 bg-slate-800/30",
              !locked &&
                myVote !== "A" &&
                "hover:border-sky-500/35 hover:bg-sky-950/15",
              locked && myVote !== "A" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-sky-300">Propozycja A</p>
                <p className="mt-0.5 text-xs text-slate-400">Pierwszy wariant składów</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-slate-100">{countA}</p>
                {myVote === "A" && (
                  <p className="mt-1 text-[11px] font-medium text-sky-400">Twój głos</p>
                )}
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="h-full rounded-full bg-sky-500/70 transition-all duration-500"
                style={{ width: `${shareA}%` }}
              />
            </div>

            {lobby.proposalA && (
              <div
                className="pointer-events-none"
                onClick={(event) => event.stopPropagation()}
              >
                <TeamOverview
                  lobby={{
                    ...lobby,
                    team1: lobby.proposalA.team1,
                    team2: lobby.proposalA.team2,
                  }}
                  compact
                  currentUid={currentUid}
                  showRolePriorities={isAdmin}
                  showTeamPoints={isAdmin}
                />
              </div>
            )}

            <VoteVoterList names={votersA} accentClassName="text-sky-400/70" />
          </button>

          <button
            type="button"
            disabled={locked || myVote === "B"}
            onClick={() => void vote("B")}
            className={cn(
              "flex min-w-0 flex-col space-y-4 overflow-hidden rounded-xl border p-3 text-left transition-all sm:p-4",
              myVote === "B"
                ? "border-teal-500/50 bg-teal-950/25 ring-1 ring-teal-400/30"
                : "border-slate-700/80 bg-slate-800/30",
              !locked &&
                myVote !== "B" &&
                "hover:border-teal-500/35 hover:bg-teal-950/15",
              locked && myVote !== "B" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-teal-300">Propozycja B</p>
                <p className="mt-0.5 text-xs text-slate-400">Drugi wariant składów</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums text-slate-100">{countB}</p>
                {myVote === "B" && (
                  <p className="mt-1 text-[11px] font-medium text-teal-400">Twój głos</p>
                )}
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/80">
              <div
                className="h-full rounded-full bg-teal-500/70 transition-all duration-500"
                style={{ width: `${shareB}%` }}
              />
            </div>

            {lobby.proposalB && (
              <div
                className="pointer-events-none"
                onClick={(event) => event.stopPropagation()}
              >
                <TeamOverview
                  lobby={{
                    ...lobby,
                    team1: lobby.proposalB.team1,
                    team2: lobby.proposalB.team2,
                  }}
                  compact
                  currentUid={currentUid}
                  showRolePriorities={isAdmin}
                  showTeamPoints={isAdmin}
                />
              </div>
            )}

            <VoteVoterList names={votersB} accentClassName="text-teal-400/70" />
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-300">
              Głosowali:{" "}
              <span className="font-semibold tabular-nums text-slate-100">
                {votedCount}/10
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Żeby przejść dalej, muszą zagłosować wszyscy (10/10).
            </p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 sm:max-w-48">
            <div
              className="h-full rounded-full bg-slate-400/70 transition-all duration-500"
              style={{ width: `${(votedCount / 10) * 100}%` }}
            />
          </div>
        </div>

        {isAdmin && !locked && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 pt-4">
            <p className="mr-1 w-full text-center text-[11px] uppercase tracking-wide text-slate-500 sm:w-auto sm:text-left">
              Admin
            </p>
            <Button variant="outline" size="sm" onClick={() => void voteForTeam("A")}>
              Team: A
            </Button>
            <Button variant="outline" size="sm" onClick={() => void voteForTeam("B")}>
              Team: B
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
