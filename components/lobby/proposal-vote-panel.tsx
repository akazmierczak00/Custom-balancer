"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamOverview } from "@/components/lobby/team-overview";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { VoteVoterList } from "@/components/lobby/vote-voter-list";
import { castProposalVote, castProposalVoteForTeam } from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { Lobby, ProposalVoteChoice, TeamProposal } from "@/types";
import { getProposalLabel } from "@/lib/constants/proposals";

interface ProposalVotePanelProps {
  lobby: Lobby;
  currentUid: string;
  locked: boolean;
  remaining: number;
  isAdmin?: boolean;
}

const PROPOSAL_META: {
  choice: ProposalVoteChoice;
  title: string;
  borderActive: string;
  borderIdle: string;
  hover: string;
  titleColor: string;
  bar: string;
  accent: string;
}[] = [
  {
    choice: "A",
    title: `Propozycja ${getProposalLabel("A")}`,
    borderActive: "border-sky-500/50 bg-sky-950/25 ring-1 ring-sky-400/30",
    borderIdle: "border-slate-700/80 bg-slate-800/30",
    hover: "hover:border-sky-500/35 hover:bg-sky-950/15",
    titleColor: "text-sky-300",
    bar: "bg-sky-500/70",
    accent: "text-sky-400/70",
  },
  {
    choice: "B",
    title: `Propozycja ${getProposalLabel("B")}`,
    borderActive: "border-teal-500/50 bg-teal-950/25 ring-1 ring-teal-400/30",
    borderIdle: "border-slate-700/80 bg-slate-800/30",
    hover: "hover:border-teal-500/35 hover:bg-teal-950/15",
    titleColor: "text-teal-300",
    bar: "bg-teal-500/70",
    accent: "text-teal-400/70",
  },
  {
    choice: "C",
    title: `Propozycja ${getProposalLabel("C")}`,
    borderActive: "border-violet-500/50 bg-violet-950/25 ring-1 ring-violet-400/30",
    borderIdle: "border-slate-700/80 bg-slate-800/30",
    hover: "hover:border-violet-500/35 hover:bg-violet-950/15",
    titleColor: "text-violet-300",
    bar: "bg-violet-500/70",
    accent: "text-violet-400/70",
  },
];

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
  const countC = Object.values(votes).filter((v) => v === "C").length;
  const counts: Record<ProposalVoteChoice, number> = {
    A: countA,
    B: countB,
    C: countC,
  };
  const votedCount = lobby.slots.filter((uid) => uid && votes[uid]).length;
  const myVote = votes[currentUid];
  const totalVotes = Math.max(votedCount, 1);

  const proposals: Record<ProposalVoteChoice, TeamProposal | null> = {
    A: lobby.proposalA,
    B: lobby.proposalB,
    C: lobby.proposalC ?? null,
  };

  const nickByUid = useMemo(() => {
    const map = new Map<string, string>();
    const players = [
      ...lobby.team1,
      ...lobby.team2,
      ...(lobby.proposalA?.team1 ?? []),
      ...(lobby.proposalA?.team2 ?? []),
      ...(lobby.proposalB?.team1 ?? []),
      ...(lobby.proposalB?.team2 ?? []),
      ...(lobby.proposalC?.team1 ?? []),
      ...(lobby.proposalC?.team2 ?? []),
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
  }, [
    lobby.team1,
    lobby.team2,
    lobby.proposalA,
    lobby.proposalB,
    lobby.proposalC,
    lobbyUsers,
  ]);

  const votersFor = (choice: ProposalVoteChoice) =>
    Object.entries(votes)
      .filter(([, vote]) => vote === choice)
      .map(([uid]) => nickByUid.get(uid) ?? uid.slice(0, 6))
      .sort((a, b) => a.localeCompare(b, "pl"));

  const vote = async (choice: ProposalVoteChoice) => {
    try {
      await castProposalVote(lobby.id, currentUid, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania");
    }
  };

  const voteForTeam = async (choice: ProposalVoteChoice) => {
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
              : "Porównaj propozycje i oddaj głos na Ł, O albo Ś"}
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

        <div className="grid gap-5 xl:grid-cols-3 xl:gap-4">
          {PROPOSAL_META.map((meta) => {
            const proposal = proposals[meta.choice];
            if (!proposal) return null;
            const count = counts[meta.choice];
            const share = (count / totalVotes) * 100;
            const selected = myVote === meta.choice;

            return (
              <button
                key={meta.choice}
                type="button"
                disabled={locked || selected}
                onClick={() => void vote(meta.choice)}
                className={cn(
                  "flex min-w-0 flex-col space-y-3 rounded-xl border p-4 text-left transition-all",
                  selected ? meta.borderActive : meta.borderIdle,
                  !locked && !selected && meta.hover,
                  locked && !selected && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("text-base font-semibold", meta.titleColor)}>
                      {meta.title}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg border border-slate-600/60 bg-slate-950/50 px-2.5 py-1.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Głosy
                    </p>
                    <p className="text-2xl font-bold tabular-nums leading-none text-slate-50">
                      {count}
                    </p>
                    {selected && (
                      <p
                        className={cn(
                          "mt-1 text-[10px] font-medium",
                          meta.titleColor
                        )}
                      >
                        Twój
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/80">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      meta.bar
                    )}
                    style={{ width: `${share}%` }}
                  />
                </div>

                <div
                  className="pointer-events-none"
                  onClick={(event) => event.stopPropagation()}
                >
                  <TeamOverview
                    lobby={{
                      ...lobby,
                      team1: proposal.team1,
                      team2: proposal.team2,
                    }}
                    dense
                    currentUid={currentUid}
                    showRolePriorities={false}
                    showTeamPoints={isAdmin}
                  />
                </div>

                <VoteVoterList
                  names={votersFor(meta.choice)}
                  accentClassName={meta.accent}
                />
              </button>
            );
          })}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => void voteForTeam("A")}
            >
              Team: {getProposalLabel("A")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void voteForTeam("B")}
            >
              Team: {getProposalLabel("B")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void voteForTeam("C")}
            >
              Team: {getProposalLabel("C")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
