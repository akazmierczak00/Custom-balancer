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
  subscribeToCompletedLobbies,
  subscribeToAllUsers,
  subscribeToUsers,
} from "@/lib/firebase/firestore";
import { createLobby } from "@/lib/lobby/service";
import { getRankLabel } from "@/lib/constants/ranks";
import { CustomBalancerTitle } from "@/components/brand/custom-balancer-title";
import { useTheme } from "@/components/providers/theme-provider";
import { LobbyTile } from "@/components/lobby/lobby-tile";
import { DashboardY2kDecorations } from "@/components/dashboard/dashboard-y2k-decorations";
import { isTestBotUid } from "@/lib/lobby/test-bots";
import { cn } from "@/lib/utils";
import { Lobby, UserProfile } from "@/types";

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { theme, ready: themeReady } = useTheme();
  const router = useRouter();
  const [activeLobbies, setActiveLobbies] = useState<Lobby[]>([]);
  const [completedLobbies, setCompletedLobbies] = useState<Lobby[]>([]);
  const [users, setUsers] = useState<Record<string, UserProfile>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [creating, setCreating] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile && !profile.profileComplete) router.replace("/profile");
  }, [user, profile, loading, router]);

  useEffect(() => {
    return subscribeToActiveLobbies(setActiveLobbies);
  }, []);

  useEffect(() => {
    return subscribeToCompletedLobbies(setCompletedLobbies);
  }, []);

  const allUids = useMemo(
    () => [...new Set(activeLobbies.flatMap((l) => l.slots.filter(Boolean) as string[]))],
    [activeLobbies]
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

  const isY2kTheme = themeReady && theme === "y2k";

  const headerButtons = (
    <div className={cn("flex flex-wrap gap-2", isY2kTheme && "justify-center")}>
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
      <Button variant="outline" onClick={() => logout()}>
        Wyloguj
      </Button>
    </div>
  );

  return (
    <div className="dashboard-screen min-h-screen w-full">
      {isY2kTheme && <DashboardY2kDecorations />}
      <div className="dashboard-content relative mx-auto max-w-4xl space-y-6 p-4">
      {isY2kTheme ? (
        <div className="flex flex-col items-center gap-4">
          <CustomBalancerTitle />
          {headerButtons}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CustomBalancerTitle />
            <p className="text-slate-400">Cześć, {profile.nick}.</p>
          </div>
          {headerButtons}
        </div>
      )}

      {profile.role === "admin" && (
        <div className="dashboard-panel overflow-hidden rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setUsersOpen((open) => !open)}
            className="dashboard-panel-header flex w-full items-center justify-between rounded-none px-4 py-3 text-left"
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
            <div className="dashboard-panel-body border-t border-slate-700 px-4 pb-4 pt-3">
              {manageableUsers.length === 0 ? (
                <p className="text-sm text-slate-400">Brak użytkowników.</p>
              ) : (
                <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {manageableUsers.map((entry) => (
                    <Link
                      key={entry.uid}
                      href={`/profile/${entry.uid}`}
                      className="dashboard-user-row flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3 transition-colors hover:border-indigo-500/50"
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
        <h2 className="dashboard-section-title text-lg font-semibold">Aktywne lobby</h2>
        {activeLobbies.length === 0 ? (
          <p className="text-slate-400">Brak aktywnych lobby.</p>
        ) : (
          activeLobbies.map((lobby) => (
            <LobbyTile
              key={lobby.id}
              lobby={lobby}
              currentUser={profile}
              users={users}
            />
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="dashboard-section-title text-lg font-semibold">Zakończone lobby</h2>
        {completedLobbies.length === 0 ? (
          <p className="text-slate-400">Brak zakończonych lobby.</p>
        ) : (
          completedLobbies.map((lobby) => (
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
    </div>
  );
}
