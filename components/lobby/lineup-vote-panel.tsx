"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { castLineupVote } from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface LineupVotePanelProps {
  lobby: Lobby;
  currentUid: string;
  locked: boolean;
  remaining: number;
  resultText?: string;
}

export function LineupVotePanel({
  lobby,
  currentUid,
  locked,
  remaining,
  resultText,
}: LineupVotePanelProps) {
  const votes = lobby.votes.lineup;
  const acceptCount = Object.values(votes).filter((v) => v === "accept").length;
  const reshuffleCount = Object.values(votes).filter((v) => v === "reshuffle").length;
  const myVote = votes[currentUid];

  const vote = async (choice: "accept" | "reshuffle") => {
    try {
      await castLineupVote(lobby.id, currentUid, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Głosowanie nad składem</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resultText ? (
          <p className="text-center text-lg text-emerald-300">{resultText}</p>
        ) : (
          <>
            {!locked && (
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant={myVote === "accept" ? "default" : "outline"}
                  onClick={() => vote("accept")}
                  disabled={!!myVote}
                >
                  Akceptuj skład
                </Button>
                <Button
                  variant={myVote === "reshuffle" ? "destructive" : "outline"}
                  onClick={() => vote("reshuffle")}
                  disabled={!!myVote}
                >
                  Zmiana składów
                </Button>
              </div>
            )}
            {locked && (
              <p className="text-center text-2xl font-bold text-amber-400">
                Rozstrzygnięcie za {remaining}s
              </p>
            )}
            <p className="text-center text-sm text-slate-400">
              Akceptuj: {acceptCount} · Zmiana: {reshuffleCount}
            </p>
            <p className="text-center text-xs text-slate-500">
              Głosowali: {Object.keys(votes).length}/10
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
