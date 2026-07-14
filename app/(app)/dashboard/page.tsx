"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { logout } from "@/lib/firebase/auth";
import { subscribeToActiveLobbies, subscribeToUsers } from "@/lib/firebase/firestore";
import { createLobby } from "@/lib/lobby/service";
import { LobbyTile } from "@/components/lobby/lobby-tile";
import { Lobby, UserProfile } from "@/types";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile && !profile.profileComplete) router.replace("/profile");
  }, [user, profile, loading, router]);

  useEffect(() => {
    return subscribeToActiveLobbies(setLobbies);
  }, []);

  const allUids = useMemo(
    () => [...new Set(lobbies.flatMap((l) => l.slots.filter(Boolean) as string[]))],
    [lobbies]
  );

  useEffect(() => {
    return subscribeToUsers(allUids, setUsers);
  }, [allUids]);

  const handleCreateLobby = async () => {
    if (!profile) return;
    setCreating(true);
    try {
      await createLobby(profile.uid);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Błąd tworzenia lobby");
    } finally {
      setCreating(false);
    }
  };

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Custom Balancer</h1>
          <p className="text-slate-400">
            Witaj, {profile.nick} ({profile.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/profile">Profil</Link>
          </Button>
          {profile.role === "admin" && (
            <Button variant="outline" asChild>
              <Link href="/admin/weaknesses">Osłabienia Adriana</Link>
            </Button>
          )}
          {profile.role === "admin" && (
            <Button onClick={handleCreateLobby} disabled={creating}>
              {creating ? "Tworzenie..." : "Utwórz lobby"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => logout()}>
            Wyloguj
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Aktywne lobby</h2>
        {lobbies.length === 0 ? (
          <p className="text-slate-400">Brak aktywnych lobby.</p>
        ) : (
          lobbies.map((lobby) => (
            <LobbyTile
              key={lobby.id}
              lobby={lobby}
              currentUser={profile}
              users={users}
            />
          ))
        )}
      </div>
    </div>
  );
}
