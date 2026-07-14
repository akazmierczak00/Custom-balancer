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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && profile && !profile.profileComplete) router.replace("/profile");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!lobbyId) return;
    return subscribeToLobby(lobbyId, setLobby);
  }, [lobbyId]);

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  if (!lobby) {
    return <div className="flex min-h-screen items-center justify-center">Lobby nie znalezione</div>;
  }

  const isParticipant = lobby.slots.includes(profile.uid);
  const isAdmin = profile.role === "admin";

  if (!isParticipant && !isAdmin) {
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
