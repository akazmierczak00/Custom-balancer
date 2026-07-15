"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { castProposalVote, castProposalVoteForTeam } from "@/lib/lobby/service";
import { Lobby } from "@/types";
import { TeamOverview } from "@/components/lobby/team-overview";

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
  const votes = lobby.votes.proposals;
  const countA = Object.values(votes).filter((v) => v === "A").length;
  const countB = Object.values(votes).filter((v) => v === "B").length;
  const myVote = votes[currentUid];

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
    <Card>
      <CardHeader>
        <CardTitle>Wybierz propozycję składów</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-indigo-500/30 p-3">
            <p className="text-center font-semibold text-indigo-300">Propozycja A</p>
            {lobby.proposalA && (
              <TeamOverview
                lobby={{ ...lobby, team1: lobby.proposalA.team1, team2: lobby.proposalA.team2 }}
                compact
                currentUid={currentUid}
                showRolePriorities={isAdmin}
              />
            )}
          </div>
          <div className="min-w-0 space-y-3 overflow-hidden rounded-xl border border-purple-500/30 p-3">
            <p className="text-center font-semibold text-purple-300">Propozycja B</p>
            {lobby.proposalB && (
              <TeamOverview
                lobby={{ ...lobby, team1: lobby.proposalB.team1, team2: lobby.proposalB.team2 }}
                compact
                currentUid={currentUid}
                showRolePriorities={isAdmin}
              />
            )}
          </div>
        </div>

        {!locked && (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-400">
              Możesz zmienić głos, dopóki nie odda głosu wszystkich 10 graczy.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant={myVote === "A" ? "default" : "outline"}
                onClick={() => vote("A")}
              >
                {myVote === "A" ? "Twój głos: A" : "Głosuj A"} ({countA})
              </Button>
              <Button
                variant={myVote === "B" ? "secondary" : "outline"}
                onClick={() => vote("B")}
              >
                {myVote === "B" ? "Twój głos: B" : "Głosuj B"} ({countB})
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => voteForTeam("A")}>
                    Team: A
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => voteForTeam("B")}>
                    Team: B
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {locked && (
          <p className="text-center text-2xl font-bold text-amber-400">
            Rozstrzygnięcie za {remaining}s
          </p>
        )}
        <p className="text-center text-xs text-slate-500">
          Głosowali:{" "}
          {lobby.slots.filter((uid) => uid && votes[uid]).length}/10
        </p>
      </CardContent>
    </Card>
  );
}
