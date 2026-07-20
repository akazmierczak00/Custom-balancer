"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLobbyUsers } from "@/components/lobby/lobby-users-context";
import { VoteVoterList } from "@/components/lobby/vote-voter-list";
import { castLineupVote, castLineupVoteForTeam } from "@/lib/lobby/service";
import { cn } from "@/lib/utils";
import { Lobby, LineupVoteChoice } from "@/types";

interface LineupVotePanelProps {
  lobby: Lobby;
  currentUid: string;
  locked: boolean;
  remaining: number;
  resultText?: string;
  isAdmin?: boolean;
}

export function LineupVotePanel({
  lobby,
  currentUid,
  locked,
  remaining,
  resultText,
  isAdmin = false,
}: LineupVotePanelProps) {
  const lobbyUsers = useLobbyUsers();
  const votes = lobby.votes.lineup;
  const acceptCount = Object.values(votes).filter((v) => v === "accept").length;
  const reshuffleCount = Object.values(votes).filter((v) => v === "reshuffle").length;
  const votedCount = Object.keys(votes).length;
  const myVote = votes[currentUid];
  const totalVotes = Math.max(votedCount, 1);
  const acceptShare = (acceptCount / totalVotes) * 100;
  const reshuffleShare = (reshuffleCount / totalVotes) * 100;

  const nickByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of [...lobby.team1, ...lobby.team2]) {
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
  }, [lobby.team1, lobby.team2, lobbyUsers]);

  const votersFor = (choice: LineupVoteChoice) =>
    Object.entries(votes)
      .filter(([, vote]) => vote === choice)
      .map(([uid]) => nickByUid.get(uid) ?? uid.slice(0, 6))
      .sort((a, b) => a.localeCompare(b, "pl"));

  const acceptVoters = votersFor("accept");
  const reshuffleVoters = votersFor("reshuffle");

  const vote = async (choice: "accept" | "reshuffle") => {
    try {
      await castLineupVote(lobby.id, currentUid, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania");
    }
  };

  const voteForTeam = async (choice: "accept" | "reshuffle") => {
    try {
      await castLineupVoteForTeam(lobby.id, choice);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd głosowania za team");
    }
  };

  return (
    <Card className="overflow-hidden border-slate-700/80 bg-slate-900/60">
      <CardHeader className="border-b border-slate-800/80 pb-4">
        <CardTitle className="text-xl text-slate-100">Głosowanie nad składem</CardTitle>
        <p className="text-sm text-slate-400">
          {resultText
            ? "Wynik głosowania"
            : locked
              ? "Głosowanie zamknięte — trwa rozstrzygnięcie"
              : myVote
                ? "Możesz jeszcze zmienić głos, dopóki nie zagłosują wszyscy"
                : "Wybierz: zaakceptuj aktualny skład albo zagłosuj za zmianą"}
        </p>
        {!resultText && (
          <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
            Jeśli Adrian zagłosuje na{" "}
            <span className="font-semibold text-amber-100">zmianę składów</span> i
            dojdzie do reshuffle, drużyna przeciwna dostaje{" "}
            <span className="font-semibold text-amber-100">+1 punkt</span> do
            osłabień w tej grze.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {resultText ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-6 text-center">
            <p className="text-lg font-semibold text-emerald-300">{resultText}</p>
          </div>
        ) : (
          <>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={locked || myVote === "accept"}
                onClick={() => void vote("accept")}
                className={cn(
                  "flex flex-col rounded-xl border px-4 py-5 text-left transition-all",
                  myVote === "accept"
                    ? "border-emerald-500/50 bg-emerald-950/35 ring-1 ring-emerald-400/30"
                    : "border-slate-700/80 bg-slate-800/40",
                  !locked &&
                    myVote !== "accept" &&
                    "hover:border-emerald-500/35 hover:bg-emerald-950/20",
                  locked && myVote !== "accept" && "opacity-55"
                )}
              >
                <p className="text-sm font-semibold text-emerald-300">Akceptuj skład</p>
                <p className="mt-1 text-xs text-slate-400">Zostawiamy obecne teamy</p>
                <p className="mt-4 text-3xl font-bold tabular-nums text-slate-100">
                  {acceptCount}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
                  <div
                    className="h-full rounded-full bg-emerald-500/70 transition-all duration-500"
                    style={{ width: `${acceptShare}%` }}
                  />
                </div>
                {myVote === "accept" && (
                  <p className="mt-3 text-xs font-medium text-emerald-400">Twój głos</p>
                )}
                <VoteVoterList
                  names={acceptVoters}
                  accentClassName="text-emerald-400/70"
                />
              </button>

              <button
                type="button"
                disabled={locked || myVote === "reshuffle"}
                onClick={() => void vote("reshuffle")}
                className={cn(
                  "flex flex-col rounded-xl border px-4 py-5 text-left transition-all",
                  myVote === "reshuffle"
                    ? "border-rose-500/50 bg-rose-950/35 ring-1 ring-rose-400/30"
                    : "border-slate-700/80 bg-slate-800/40",
                  !locked &&
                    myVote !== "reshuffle" &&
                    "hover:border-rose-500/35 hover:bg-rose-950/20",
                  locked && myVote !== "reshuffle" && "opacity-55"
                )}
              >
                <p className="text-sm font-semibold text-rose-300">Zmiana składów</p>
                <p className="mt-1 text-xs text-slate-400">Losujemy nowe propozycje</p>
                <p className="mt-4 text-3xl font-bold tabular-nums text-slate-100">
                  {reshuffleCount}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-900/80">
                  <div
                    className="h-full rounded-full bg-rose-500/70 transition-all duration-500"
                    style={{ width: `${reshuffleShare}%` }}
                  />
                </div>
                {myVote === "reshuffle" && (
                  <p className="mt-3 text-xs font-medium text-rose-400">Twój głos</p>
                )}
                <VoteVoterList
                  names={reshuffleVoters}
                  accentClassName="text-rose-400/70"
                />
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                Głosowali:{" "}
                <span className="font-semibold tabular-nums text-slate-100">
                  {votedCount}/10
                </span>
              </p>
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
                  onClick={() => void voteForTeam("accept")}
                >
                  Team: Akceptuj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void voteForTeam("reshuffle")}
                >
                  Team: Zmiana
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
