"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { deleteAccount, logout } from "@/lib/firebase/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Czy na pewno chcesz trwale usunąć konto? Tej operacji nie można cofnąć."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/login");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Nie udało się usunąć konta");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil gracza</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={() => logout()}>
            Wyloguj
          </Button>
        </div>
      </div>
      <ProfileForm
        profile={profile}
        allowRankEdit={profile.role === "admin"}
        onSaved={() => router.push("/dashboard")}
      />

      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4">
        <h2 className="font-semibold text-red-300">Usuń konto</h2>
        <p className="mt-2 text-sm text-slate-400">
          Trwale usuwa profil i konto logowania. Nie można tego cofnąć.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? "Usuwanie..." : "Usuń konto"}
        </Button>
      </div>
    </div>
  );
}
