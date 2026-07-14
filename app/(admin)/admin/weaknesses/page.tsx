"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { subscribeToWeaknesses } from "@/lib/firebase/firestore";
import { validateWeaknessForm } from "@/lib/weaknesses/helpers";
import {
  createWeakness,
  deleteWeakness,
  updateWeakness,
} from "@/lib/lobby/service";
import { Weakness } from "@/types";

const EMPTY_FORM = {
  name: "",
  tier1: "",
  tier2: "",
  tier3: "",
  rarity: 50,
};

export default function WeaknessesAdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile?.role !== "admin") router.replace("/dashboard");
  }, [user, profile, loading, router]);

  useEffect(() => subscribeToWeaknesses(setWeaknesses), []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const validationError = validateWeaknessForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await updateWeakness(editingId, form);
      } else {
        await createWeakness({ ...form, createdBy: profile.uid });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (w: Weakness) => {
    setEditingId(w.id);
    setForm({
      name: w.name,
      tier1: w.tier1 ?? "",
      tier2: w.tier2 ?? "",
      tier3: w.tier3 ?? "",
      rarity: w.rarity,
    });
    setError("");
  };

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Osłabienia Adriana</h1>
        <Button variant="outline" asChild>
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edytuj osłabienie" : "Dodaj osłabienie"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rzadkość (1 = najrzadsze, 100 = common)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tier 1 (najsłabsze, opcjonalne)</Label>
              <Input
                value={form.tier1}
                onChange={(e) => setForm({ ...form, tier1: e.target.value })}
                placeholder="Opcjonalnie"
              />
            </div>
            <div className="space-y-2">
              <Label>Tier 2 (średnie, opcjonalne)</Label>
              <Input
                value={form.tier2}
                onChange={(e) => setForm({ ...form, tier2: e.target.value })}
                placeholder="Opcjonalnie"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tier 3 (bardzo mocne, opcjonalne)</Label>
              <Input
                value={form.tier3}
                onChange={(e) => setForm({ ...form, tier3: e.target.value })}
                placeholder="Opcjonalnie"
              />
            </div>
            <p className="text-xs text-slate-400 md:col-span-2">
              Wypełnij tylko tiery, które mają obowiązywać. Puste tiery nie trafią do bazy.
            </p>
            {error && (
              <p className="text-sm text-red-400 md:col-span-2">{error}</p>
            )}
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {editingId ? "Zapisz zmiany" : "Dodaj"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {weaknesses.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">
                  {w.name}{" "}
                  <span className="text-xs text-slate-400">(rzadkość: {w.rarity})</span>
                </p>
                {w.tier1 && <p className="text-sm text-slate-300">T1: {w.tier1}</p>}
                {w.tier2 && <p className="text-sm text-slate-300">T2: {w.tier2}</p>}
                {w.tier3 && <p className="text-sm text-slate-300">T3: {w.tier3}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(w)}>
                  Edytuj
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteWeakness(w.id)}
                >
                  Usuń
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
