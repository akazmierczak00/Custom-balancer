"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LobbyWeaknesses } from "@/types";

type ChampionListCollapsibleProps = {
  championPool: NonNullable<LobbyWeaknesses["championPool"]>;
};

export function ChampionListCollapsible({
  championPool,
}: ChampionListCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
      >
        Lista championów Adriana
        {open ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )}
      </Button>

      {open && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {championPool.remaining.map((champion) => (
            <div
              key={champion.id}
              className="flex flex-col items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 p-2 text-center"
            >
              <img
                src={champion.iconUrl}
                alt={champion.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-md object-cover"
              />
              <span className="text-[11px] leading-tight text-slate-200">
                {champion.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
