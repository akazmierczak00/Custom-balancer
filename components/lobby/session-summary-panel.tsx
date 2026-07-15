"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamOverview } from "@/components/lobby/team-overview";
import { updateRoundMedia } from "@/lib/lobby/service";
import { Lobby } from "@/types";

interface SessionSummaryPanelProps {
  lobby: Lobby;
  isAdmin: boolean;
}

export function SessionSummaryPanel({ lobby, isAdmin }: SessionSummaryPanelProps) {
  const rounds = lobby.roundHistory ?? [];

  if (rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie sesji</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Brak zakończonych rund w tej sesji.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Podsumowanie sesji</h2>
        <p className="text-slate-400">{rounds.length} rund w tym lobby</p>
      </div>

      <div className="grid gap-6">
        {rounds.map((round) => (
          <RoundSummaryCard
            key={round.roundNumber}
            lobbyId={lobby.id}
            round={round}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

interface RoundSummaryCardProps {
  lobbyId: string;
  round: Lobby["roundHistory"][number];
  isAdmin: boolean;
}

function RoundSummaryCard({ lobbyId, round, isAdmin }: RoundSummaryCardProps) {
  const [youtubeUrl, setYoutubeUrl] = useState(round.youtubeUrl ?? "");
  const [saving, setSaving] = useState(false);

  const saveYoutube = async () => {
    setSaving(true);
    try {
      await updateRoundMedia(lobbyId, round.roundNumber, {
        youtubeUrl: youtubeUrl.trim() || undefined,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd zapisu linku");
    } finally {
      setSaving(false);
    }
  };

  const loserTeam = round.winnerTeam === 1 ? 2 : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>Runda {round.roundNumber}</span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">
            Team {round.winnerTeam} — wygrana
          </span>
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-300">
            Team {loserTeam} — przegrana
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TeamOverview
          lobby={lobby}
          team1={round.team1}
          team2={round.team2}
          compact
        />

        {round.screenshotUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Screenshot wyników</p>
            <a
              href={round.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-slate-700"
            >
              <Image
                src={round.screenshotUrl}
                alt={`Screenshot rundy ${round.roundNumber}`}
                width={800}
                height={450}
                className="h-auto max-h-48 w-full object-contain bg-slate-950"
                unoptimized
              />
            </a>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">POV na YouTube</p>
          {isAdmin ? (
            <div className="flex flex-wrap items-end gap-2">
              <Input
                type="url"
                placeholder="https://youtube.com/..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="max-w-md"
              />
              <Button size="sm" onClick={saveYoutube} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz link"}
              </Button>
            </div>
          ) : round.youtubeUrl ? (
            <a
              href={round.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
            >
              Obejrzyj POV
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-sm text-slate-500">Brak linku POV.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
