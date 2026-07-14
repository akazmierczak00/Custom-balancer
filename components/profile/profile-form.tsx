"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RANKS } from "@/lib/constants/ranks";
import { ROLES } from "@/lib/constants/roles";
import { saveUserProfile } from "@/lib/lobby/service";
import { LoLRole, RolePriorityGroup, UserProfile } from "@/types";

interface ProfileFormProps {
  profile: UserProfile;
  onSaved?: () => void;
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [nick, setNick] = useState(profile.nick);
  const [rank, setRank] = useState(profile.rank);
  const [priorities, setPriorities] = useState<RolePriorityGroup[]>(
    profile.rolePriorities.length > 0
      ? profile.rolePriorities
      : [{ priority: 1, roles: ["mid"] }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const unassignedRoles = ROLES.map((r) => r.value).filter(
    (role) => !priorities.some((g) => g.roles.includes(role))
  );

  const addPriorityGroup = () => {
    const nextPriority =
      priorities.length > 0
        ? Math.max(...priorities.map((p) => p.priority)) + 1
        : 1;
    setPriorities([...priorities, { priority: nextPriority, roles: [] }]);
  };

  const assignRole = (groupIndex: number, role: LoLRole) => {
    const cleaned = priorities.map((g, i) =>
      i === groupIndex
        ? { ...g, roles: [...g.roles, role] }
        : { ...g, roles: g.roles.filter((r) => r !== role) }
    );
    setPriorities(cleaned);
  };

  const removeFromGroup = (groupIndex: number, role: LoLRole) => {
    setPriorities(
      priorities.map((g, i) =>
        i === groupIndex
          ? { ...g, roles: g.roles.filter((r) => r !== role) }
          : g
      )
    );
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
      setError("Przypisz wszystkie role do priorytetów");
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile(profile.uid, {
        nick: nick.trim(),
        rank,
        rolePriorities: priorities.filter((p) => p.roles.length > 0),
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
          <div className="flex items-center justify-between">
            <Label>Priorytety ról</Label>
            <Button type="button" variant="outline" size="sm" onClick={addPriorityGroup}>
              Dodaj kolumnę priorytetu
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {priorities.map((group, groupIndex) => (
              <div
                key={group.priority}
                className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
              >
                <p className="mb-2 text-xs font-semibold text-indigo-300">
                  Priorytet {group.priority}
                </p>
                <div className="mb-2 flex min-h-16 flex-wrap gap-1">
                  {group.roles.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => removeFromGroup(groupIndex, role)}
                      className="rounded bg-indigo-600/30 px-2 py-1 text-xs text-indigo-200"
                    >
                      {ROLES.find((r) => r.value === role)?.label}
                    </button>
                  ))}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      assignRole(groupIndex, e.target.value as LoLRole);
                    }
                  }}
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                >
                  <option value="">Dodaj rolę...</option>
                  {[...unassignedRoles, ...group.roles].map((role) => (
                    <option key={role} value={role}>
                      {ROLES.find((r) => r.value === role)?.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {unassignedRoles.length > 0 && (
            <p className="text-xs text-amber-400">
              Nieprzypisane role:{" "}
              {unassignedRoles
                .map((r) => ROLES.find((x) => x.value === r)?.label)
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
