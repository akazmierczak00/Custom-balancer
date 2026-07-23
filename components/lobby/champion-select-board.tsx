"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Pusta plansza champion select — placeholder pod dalszą logikę. */
export function ChampionSelectBoard() {
  return (
    <Card className="min-h-[28rem] border-slate-700/80 bg-slate-900/60">
      <CardHeader className="border-b border-slate-800/80 pb-4">
        <CardTitle className="text-xl text-slate-100">Champion Select</CardTitle>
        <p className="text-sm text-slate-400">
          Plansza w budowie — na razie pusta.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-[22rem] items-center justify-center p-8">
        <div className="h-full min-h-[18rem] w-full rounded-xl border border-dashed border-slate-700/70 bg-slate-950/40" />
      </CardContent>
    </Card>
  );
}
