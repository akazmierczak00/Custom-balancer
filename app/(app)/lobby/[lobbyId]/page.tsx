"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { subscribeToLobby } from "@/lib/firebase/firestore";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { Lobby } from "@/types";

export default function LobbyPage() {
  const params = useParams();
  const lobbyId = params.lobbyId as string;
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [lobbyLoaded, setLobbyLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile && !profile.profileComplete) router.replace("/profile");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!lobbyId) return;
    setLobbyLoaded(false);
    return subscribeToLobby(lobbyId, (next) => {
      setLobby(next);
      setLobbyLoaded(true);
    });
  }, [lobbyId]);

  useEffect(() => {
    if (!lobbyLoaded || !profile || lobby) return;
    if (profile.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [lobby, lobbyLoaded, profile, router]);

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  if (!lobbyLoaded || (!lobby && profile.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Przekierowanie...
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>Lobby nie znalezione.</p>
        <Button asChild>
          <Link href="/dashboard">Wróć do listy lobby</Link>
        </Button>
      </div>
    );
  }

  const isParticipant = lobby.slots.includes(profile.uid);

  if (!isParticipant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>Nie jesteś uczestnikiem tego lobby.</p>
        <Button asChild>
          <Link href="/dashboard">Wróć</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-slate-800 p-4">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
      </div>
      <LobbyRoom lobby={lobby} profile={profile} />
    </div>
  );
}
