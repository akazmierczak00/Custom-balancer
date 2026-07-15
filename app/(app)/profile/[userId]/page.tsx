"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { logout } from "@/lib/firebase/auth";
import { subscribeToUser } from "@/lib/firebase/firestore";
import { ProfileForm } from "@/components/profile/profile-form";
import { UserProfile } from "@/types";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [targetLoaded, setTargetLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!userId) return;
    setTargetLoaded(false);
    return subscribeToUser(userId, (next) => {
      setTargetProfile(next);
      setTargetLoaded(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!profile || !targetLoaded) return;
    if (profile.uid !== userId && profile.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [profile, targetLoaded, userId, router]);

  if (loading || !profile || !targetLoaded) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  if (!targetProfile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p>Profil nie znaleziony.</p>
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isOwnProfile = profile.uid === userId;
  const allowRankEdit = profile.role === "admin";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isOwnProfile ? "Twój profil" : `Profil: ${targetProfile.nick || "Gracz"}`}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          {isOwnProfile && (
            <Button variant="ghost" onClick={() => logout()}>
              Wyloguj
            </Button>
          )}
        </div>
      </div>
      <ProfileForm
        profile={targetProfile}
        allowRankEdit={allowRankEdit}
        title={isOwnProfile ? "Twój profil" : `Profil gracza ${targetProfile.nick}`}
        onSaved={() => router.push("/dashboard")}
      />
    </div>
  );
}
