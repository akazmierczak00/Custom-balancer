"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { loginWithEmail, loginWithGoogle, registerWithEmail } from "@/lib/firebase/auth";

export default function LoginPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(profile?.profileComplete ? "/dashboard" : "/profile");
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd logowania");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd Google");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Ładowanie...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegister ? "Rejestracja" : "Logowanie"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {isRegister ? "Zarejestruj się" : "Zaloguj się"}
            </Button>
          </form>
          <div className="my-4 text-center text-sm text-slate-500">lub</div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            Kontynuuj z Google
          </Button>
          <p className="mt-4 text-center text-sm text-slate-400">
            {isRegister ? "Masz konto?" : "Nie masz konta?"}{" "}
            <button
              type="button"
              className="text-indigo-400 hover:underline"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Zaloguj się" : "Zarejestruj się"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
