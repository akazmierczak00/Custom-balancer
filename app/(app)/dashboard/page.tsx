"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { logout } from "@/lib/firebase/auth";
import {
  subscribeToActiveLobbies,
  subscribeToAllUsers,
  subscribeToUsers,
} from "@/lib/firebase/firestore";
import { createLobby } from "@/lib/lobby/service";
import { getRankLabel } from "@/lib/constants/ranks";
import { LobbyTile } from "@/components/lobby/lobby-tile";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { Lobby, UserProfile } from "@/types";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [creating, setCreating] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

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

  useEffect(() => {
    if (profile?.role !== "admin") return;
    return subscribeToAllUsers(setAllUsers);
  }, [profile?.role]);

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

  const manageableUsers = useMemo(
    () =>
      allUsers
        .filter((entry) => !isTestBotUid(entry.uid) && !entry.isTestBot)
        .sort((a, b) => a.nick.localeCompare(b.nick, "pl")),
    [allUsers]
  );

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

      {profile.role === "admin" && (
        <div className="rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setUsersOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-lg font-semibold">
              Użytkownicy ({manageableUsers.length})
            </span>
            {usersOpen ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {usersOpen && (
            <div className="border-t border-slate-700 px-4 pb-4 pt-3">
              {manageableUsers.length === 0 ? (
                <p className="text-sm text-slate-400">Brak użytkowników.</p>
              ) : (
                <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {manageableUsers.map((entry) => (
                    <Link
                      key={entry.uid}
                      href={`/profile/${entry.uid}`}
                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 transition-colors hover:border-indigo-500/50 hover:bg-slate-800/60"
                    >
                      <span className="font-medium text-slate-100">
                        {entry.nick || "Bez nicku"}
                      </span>
                      <span className="text-sm text-slate-400">
                        {entry.rank ? getRankLabel(entry.rank) : "Brak rangi"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
