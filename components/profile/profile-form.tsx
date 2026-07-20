"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DIVISIONS,
  RANKS,
  getRankLabel,
  isMasterPlusTier,
} from "@/lib/constants/ranks";
import {
  DEFAULT_ROLE_PRIORITIES,
  normalizeRolePriorities,
  ROLES,
} from "@/lib/constants/roles";
import { postRiotLink, postRiotSync } from "@/lib/riot/browser";
import { saveUserProfile } from "@/lib/lobby/service";
import { LoLRole, LoLDivision, RolePriorityGroup, UserProfile } from "@/types";

interface ProfileFormProps {
  profile: UserProfile;
  onSaved?: () => void;
  allowRankEdit?: boolean;
  title?: string;
}

interface DragState {
  role: LoLRole;
  fromPriority: number;
}

function getInitialPriorities(profile: UserProfile): RolePriorityGroup[] {
  if (profile.rolePriorities.length > 0) {
    return normalizeRolePriorities(profile.rolePriorities);
  }
  return normalizeRolePriorities(DEFAULT_ROLE_PRIORITIES);
}

function formatSyncedAt(profile: UserProfile): string | null {
  const syncedAt = profile.riotRankSyncedAt?.toDate?.();
  if (!syncedAt) return null;
  return syncedAt.toLocaleString("pl-PL");
}

export function ProfileForm({
  profile,
  onSaved,
  allowRankEdit = false,
  title = "Twój profil",
}: ProfileFormProps) {
  const [nick, setNick] = useState(profile.nick);
  const [rank, setRank] = useState(profile.rank);
  const [rankDivision, setRankDivision] = useState<LoLDivision | "">(
    profile.rankDivision ?? ""
  );
  const [useRiotRank, setUseRiotRank] = useState(profile.rankSource !== "manual");
  const [riotSyncDisabled, setRiotSyncDisabled] = useState(
    profile.riotSyncDisabled ?? false
  );
  const [riotGameName, setRiotGameName] = useState(profile.riotGameName ?? "");
  const [riotTagLine, setRiotTagLine] = useState(profile.riotTagLine ?? "");
  const [priorities, setPriorities] = useState<RolePriorityGroup[]>(() =>
    getInitialPriorities(profile)
  );
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkingRiot, setLinkingRiot] = useState(false);
  const [syncingRiot, setSyncingRiot] = useState(false);
  const [riotMessage, setRiotMessage] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setNick(profile.nick);
    setRank(profile.rank);
    setRankDivision(profile.rankDivision ?? "");
    setUseRiotRank(profile.rankSource !== "manual");
    setRiotSyncDisabled(profile.riotSyncDisabled ?? false);
    setRiotGameName(profile.riotGameName ?? "");
    setRiotTagLine(profile.riotTagLine ?? "");
  }, [profile]);

  const assignedRoles = priorities.flatMap((group) => group.roles);
  const unassignedRoles = ROLES.map((r) => r.value).filter(
    (role) => !assignedRoles.includes(role)
  );
  const linkedRiotAccount = !!(profile.riotPuuid || profile.riotGameName);
  const showDivisionSelect = allowRankEdit && rank && !isMasterPlusTier(rank);

  const moveRole = (
    role: LoLRole,
    fromPriority: number,
    toPriority: number
  ) => {
    if (fromPriority === toPriority) return;

    setPriorities((current) =>
      current.map((group) => {
        let roles = [...group.roles];

        if (group.priority === fromPriority) {
          roles = roles.filter((entry) => entry !== role);
        }
        if (group.priority === toPriority && !roles.includes(role)) {
          roles.push(role);
        }

        return { ...group, roles };
      })
    );
  };

  const handleDragStart = (role: LoLRole, fromPriority: number) => {
    setDragging({ role, fromPriority });
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropTarget(null);
  };

  const handleDrop = (toPriority: number) => {
    if (!dragging) return;
    moveRole(dragging.role, dragging.fromPriority, toPriority);
    handleDragEnd();
  };

  const handleSaveRiotAccount = async () => {
    setRiotMessage(null);
    setError("");

    if (!riotGameName.trim() || !riotTagLine.trim()) {
      setError("Podaj nick i tag Riot Games.");
      return;
    }

    setLinkingRiot(true);
    try {
      const result = await postRiotLink(profile.uid, riotGameName, riotTagLine);
      setRiotMessage(`Podpięto konto ${result.gameName}#${result.tagLine}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu konta Riot.");
    } finally {
      setLinkingRiot(false);
    }
  };

  const handleSyncRiotRank = async () => {
    setRiotMessage(null);
    setError("");
    setSyncingRiot(true);

    try {
      const result = await postRiotSync(profile.uid);

      if (result.status === "skipped") {
        setRiotMessage(
          (result as { message?: string }).message ?? "Synchronizacja pominięta."
        );
      } else {
        setRiotMessage(
          result.rankLabel
            ? `Zsynchronizowano rangę: ${result.rankLabel}.`
            : "Ranga została zsynchronizowana."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd synchronizacji rangi.");
    } finally {
      setSyncingRiot(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!nick.trim()) {
      setError("Nick jest wymagany");
      return;
    }
    if (allowRankEdit && !rank) {
      setError("Wybierz rangę");
      return;
    }
    if (allowRankEdit && showDivisionSelect && !rankDivision) {
      setError("Wybierz dywizję rangi");
      return;
    }
    if (unassignedRoles.length > 0) {
      setError("Przypisz wszystkie role do kolumn priorytetów");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<UserProfile> = {
        nick: nick.trim(),
        rolePriorities: priorities.filter((group) => group.roles.length > 0),
        profileComplete: true,
      };

      if (allowRankEdit) {
        payload.rank = rank;
        payload.rankDivision = showDivisionSelect ? rankDivision : "";
        payload.rankSource = useRiotRank ? "riot" : "manual";
        payload.riotSyncDisabled = riotSyncDisabled;
        // Manual rank must not keep previously synced LP value.
        // LP input is not available in our UI for Master+ tiers, so we clear it on manual save.
        if (!useRiotRank) {
          payload.rankLp = 0;
        }
        if (isMasterPlusTier(rank)) {
          payload.rankDivision = "";
        }
      }

      await saveUserProfile(profile.uid, payload);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="nick">Nick</Label>
          <Input
            id="nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Twój nick w aplikacji"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rank">Ranga (LoL)</Label>
          {allowRankEdit ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  id="rank"
                  value={rank}
                  onChange={(e) => {
                    const nextRank = e.target.value as UserProfile["rank"];
                    setRank(nextRank);
                    if (isMasterPlusTier(nextRank)) {
                      setRankDivision("");
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100"
                >
                  <option value="">Wybierz rangę</option>
                  {RANKS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>

                {showDivisionSelect && (
                  <select
                    id="rankDivision"
                    value={rankDivision}
                    onChange={(e) =>
                      setRankDivision(e.target.value as LoLDivision | "")
                    }
                    className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100"
                  >
                    <option value="">Wybierz dywizję</option>
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={useRiotRank}
                  onChange={(e) => setUseRiotRank(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Użyj rangi z Riot (sync może nadpisywać ręczną rangę)
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={riotSyncDisabled}
                  onChange={(e) => setRiotSyncDisabled(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Wyłącz automatyczną aktualizację z Riot
              </label>
            </div>
          ) : (
            <p className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
              {rank
                ? getRankLabel(rank, profile.rankDivision, profile.rankLp)
                : "Nie ustawiona — poproś admina o ustawienie rangi"}
              {profile.rankSource === "manual" && (
                <span className="mt-1 block text-xs text-amber-400/80">
                  Ranga ustawiona ręcznie przez admina
                </span>
              )}
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div>
            <h3 className="font-semibold text-slate-100">Profil Riot Games (EUNE)</h3>
            <p className="mt-1 text-xs text-slate-400">
              Podaj nick i tag, zapisz konto, a następnie zsynchronizuj rangę Solo/Duo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="riotGameName">Nick Riot</Label>
              <Input
                id="riotGameName"
                value={riotGameName}
                onChange={(e) => setRiotGameName(e.target.value)}
                placeholder="SummonerName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riotTagLine">Tag</Label>
              <Input
                id="riotTagLine"
                value={riotTagLine}
                onChange={(e) => setRiotTagLine(e.target.value)}
                placeholder="EUNE"
              />
            </div>
          </div>

          {linkedRiotAccount && (
            <p className="text-sm text-slate-300">
              Podpięte konto:{" "}
              <span className="font-medium text-slate-100">
                {profile.riotGameName}#{profile.riotTagLine}
              </span>
              {formatSyncedAt(profile) && (
                <span className="mt-1 block text-xs text-slate-500">
                  Ostatnia synchronizacja: {formatSyncedAt(profile)}
                </span>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveRiotAccount()}
              disabled={linkingRiot}
            >
              {linkingRiot ? "Zapisywanie..." : "Zapisz konto Riot"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSyncRiotRank()}
              disabled={syncingRiot || !linkedRiotAccount}
            >
              {syncingRiot ? "Synchronizacja..." : "Synchronizuj rangę"}
            </Button>
          </div>

          {riotMessage && (
            <p className="text-sm text-emerald-300">{riotMessage}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Priorytety ról</Label>
          <p className="text-xs text-slate-400">
            Przeciągaj kafelki ról między kolumnami. Priorytet 1 to najwyższy.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {priorities.map((group) => (
              <div
                key={group.priority}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(group.priority);
                }}
                onDragLeave={() =>
                  setDropTarget((current) =>
                    current === group.priority ? null : current
                  )
                }
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(group.priority);
                }}
                className={cn(
                  "min-h-36 rounded-lg border border-slate-700 bg-slate-800/50 p-3 transition-colors",
                  dropTarget === group.priority && "border-indigo-400 bg-indigo-950/30"
                )}
              >
                <p className="mb-3 text-center text-xs font-semibold text-indigo-300">
                  Priorytet {group.priority}
                </p>
                <div className="flex min-h-20 flex-col gap-2">
                  {group.roles.map((role) => (
                    <div
                      key={role}
                      draggable
                      onDragStart={() => handleDragStart(role, group.priority)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "cursor-grab rounded-md border border-indigo-500/40 bg-indigo-600/25 px-3 py-2 text-center text-sm font-medium text-indigo-100 active:cursor-grabbing",
                        dragging?.role === role && "opacity-50"
                      )}
                    >
                      {ROLES.find((entry) => entry.value === role)?.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {unassignedRoles.length > 0 && (
            <p className="text-xs text-amber-400">
              Nieprzypisane role:{" "}
              {unassignedRoles
                .map((role) => ROLES.find((entry) => entry.value === role)?.label)
                .join(", ")}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 p-3">
          <p className="text-sm text-slate-400">Statystyki</p>
          <p className="text-lg font-semibold">
            {profile.wins}W / {profile.losses}P
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={() => void handleSave()} disabled={saving} className="w-full">
          {saving ? "Zapisywanie..." : "Zapisz profil"}
        </Button>
      </CardContent>
    </Card>
  );
}
