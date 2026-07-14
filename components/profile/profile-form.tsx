"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RANKS } from "@/lib/constants/ranks";
import {
  DEFAULT_ROLE_PRIORITIES,
  normalizeRolePriorities,
  ROLES,
} from "@/lib/constants/roles";
import { saveUserProfile } from "@/lib/lobby/service";
import { LoLRole, RolePriorityGroup, UserProfile } from "@/types";

interface ProfileFormProps {
  profile: UserProfile;
  onSaved?: () => void;
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

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [nick, setNick] = useState(profile.nick);
  const [rank, setRank] = useState(profile.rank);
  const [priorities, setPriorities] = useState<RolePriorityGroup[]>(() =>
    getInitialPriorities(profile)
  );
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const assignedRoles = priorities.flatMap((group) => group.roles);
  const unassignedRoles = ROLES.map((r) => r.value).filter(
    (role) => !assignedRoles.includes(role)
  );

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

  const handleSave = async () => {
    setError("");
    if (!nick.trim()) {
      setError("Nick jest wymagany");
      return;
    }
    if (!rank) {
      setError("Wybierz rangę");
      return;
    }
    if (unassignedRoles.length > 0) {
      setError("Przypisz wszystkie role do kolumn priorytetów");
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile(profile.uid, {
        nick: nick.trim(),
        rank,
        rolePriorities: priorities.filter((group) => group.roles.length > 0),
        profileComplete: true,
      });
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
        <CardTitle>Twój profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="nick">Nick</Label>
          <Input
            id="nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Twój nick w grze"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rank">Ranga (LoL)</Label>
          <select
            id="rank"
            value={rank}
            onChange={(e) => setRank(e.target.value as UserProfile["rank"])}
            className="flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100"
          >
            <option value="">Wybierz rangę</option>
            {RANKS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
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

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Zapisywanie..." : "Zapisz profil"}
        </Button>
      </CardContent>
    </Card>
  );
}
