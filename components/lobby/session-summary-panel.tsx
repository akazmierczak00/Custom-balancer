"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamOverview } from "@/components/lobby/team-overview";
import { formatRoundCount } from "@/lib/lobby/format";
import { updateRoundMedia } from "@/lib/lobby/service";
import { Lobby, RoundPov } from "@/types";

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
        <p className="text-slate-400">{formatRoundCount(rounds.length)} w tej sesji</p>
      </div>

      <div className="grid gap-6">
        {rounds.map((round) => (
          <RoundSummaryCard
            key={round.roundNumber}
            lobby={lobby}
            round={round}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

interface RoundSummaryCardProps {
  lobby: Lobby;
  round: Lobby["roundHistory"][number];
  isAdmin: boolean;
}

type DraftPov = {
  playerUid: string;
  youtubeUrl: string;
};

function getRoundPovs(round: Lobby["roundHistory"][number]): RoundPov[] {
  if (round.povs && round.povs.length > 0) return round.povs;
  if (round.youtubeUrl) {
    return [
      {
        youtubeUrl: round.youtubeUrl,
        playerUid: "",
        playerNick: "",
      },
    ];
  }
  return [];
}

function toDraftPovs(round: Lobby["roundHistory"][number]): DraftPov[] {
  const povs = getRoundPovs(round);
  if (povs.length === 0) return [{ playerUid: "", youtubeUrl: "" }];
  return povs.map((pov) => ({
    playerUid: pov.playerUid,
    youtubeUrl: pov.youtubeUrl,
  }));
}

function RoundSummaryCard({ lobby, round, isAdmin }: RoundSummaryCardProps) {
  const savedPovs = getRoundPovs(round);
  const savedKey = JSON.stringify(savedPovs);
  const [draft, setDraft] = useState<DraftPov[]>(() => toDraftPovs(round));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const povs = JSON.parse(savedKey) as RoundPov[];
    setDraft(
      povs.length === 0
        ? [{ playerUid: "", youtubeUrl: "" }]
        : povs.map((pov) => ({
            playerUid: pov.playerUid,
            youtubeUrl: pov.youtubeUrl,
          }))
    );
  }, [savedKey]);

  const players = useMemo(
    () => [...round.team1, ...round.team2],
    [round.team1, round.team2]
  );

  const savePovs = async () => {
    const incomplete = draft.some(
      (row) =>
        (row.youtubeUrl.trim() && !row.playerUid) ||
        (row.playerUid && !row.youtubeUrl.trim())
    );
    if (incomplete) {
      alert("Każdy POV wymaga gracza i linku YouTube.");
      return;
    }

    const povs: RoundPov[] = draft
      .filter((row) => row.youtubeUrl.trim() && row.playerUid)
      .map((row) => {
        const player = players.find((p) => p.uid === row.playerUid);
        return {
          youtubeUrl: row.youtubeUrl.trim(),
          playerUid: row.playerUid,
          playerNick: player?.nick ?? "Nieznany",
        };
      });

    setSaving(true);
    try {
      await updateRoundMedia(lobby.id, round.roundNumber, { povs });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd zapisu POV");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (index: number, patch: Partial<DraftPov>) => {
    setDraft((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (index: number) => {
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ playerUid: "", youtubeUrl: "" }];
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Runda {round.roundNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <TeamOverview
          lobby={lobby}
          team1={round.team1}
          team2={round.team2}
          winnerTeam={round.winnerTeam}
          picks={round.picks}
          useLiveStats={false}
          compact
          showRolePriorities={isAdmin}
          showTeamPoints={isAdmin}
        />

        {round.selectedWeaknesses.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
            <p className="text-sm font-semibold text-amber-300">Osłabienia Adriana</p>
            <ul className="space-y-1">
              {round.selectedWeaknesses.map((weakness) => (
                <li key={`${weakness.weaknessId}-${weakness.tier}`} className="text-sm text-slate-200">
                  Tier {weakness.tier}: <strong>{weakness.name}</strong> — {weakness.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {isAdmin ? (
            <div className="space-y-3">
              {draft.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-3"
                >
                  <label className="space-y-1">
                    <span className="text-xs text-slate-400">Gracz</span>
                    <select
                      value={row.playerUid}
                      onChange={(e) => updateRow(index, { playerUid: e.target.value })}
                      className="flex h-10 w-44 rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                    >
                      <option value="">Wybierz…</option>
                      <optgroup label="Team 1">
                        {round.team1.map((p) => (
                          <option key={p.uid} value={p.uid}>
                            {p.nick} ({p.role})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Team 2">
                        {round.team2.map((p) => (
                          <option key={p.uid} value={p.uid}>
                            {p.nick} ({p.role})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                  <label className="min-w-[16rem] flex-1 space-y-1">
                    <span className="text-xs text-slate-400">Link YouTube</span>
                    <Input
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={row.youtubeUrl}
                      onChange={(e) => updateRow(index, { youtubeUrl: e.target.value })}
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeRow(index)}
                    aria-label="Usuń POV"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((prev) => [...prev, { playerUid: "", youtubeUrl: "" }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Dodaj POV
                </Button>
                <Button size="sm" onClick={savePovs} disabled={saving}>
                  {saving ? "Zapisywanie..." : "Zapisz POV"}
                </Button>
              </div>
            </div>
          ) : savedPovs.length > 0 ? (
            <ul className="space-y-2">
              {savedPovs.map((pov, index) => {
                const nick =
                  pov.playerNick ||
                  players.find((p) => p.uid === pov.playerUid)?.nick ||
                  "Nieznany gracz";
                return (
                  <li key={`${pov.playerUid}-${index}`}>
                    <a
                      href={pov.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
                    >
                      POV: {nick}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Brak linków POV.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
