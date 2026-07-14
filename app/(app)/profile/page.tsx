"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { logout } from "@/lib/firebase/auth";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

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
          <Button variant="ghost" onClick={() => logout()}>
            Wyloguj
          </Button>
        </div>
      </div>
      <ProfileForm
        profile={profile}
        onSaved={() => router.push("/dashboard")}
      />
    </div>
  );
}
