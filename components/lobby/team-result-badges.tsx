import { cn } from "@/lib/utils";

interface TeamResultBadgesProps {
  winnerTeam: 1 | 2;
  className?: string;
}

export function TeamResultBadges({ winnerTeam, className }: TeamResultBadgesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {([1, 2] as const).map((team) => {
        const isWinner = team === winnerTeam;
        return (
          <span
            key={team}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
              team === 1 ? "text-indigo-200" : "text-purple-200",
              isWinner
                ? "bg-emerald-500/20 ring-2 ring-emerald-400/60 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                : "bg-red-500/10 ring-1 ring-red-500/30 opacity-80"
            )}
          >
            Team {team} · {isWinner ? "Winner" : "Loser"}
          </span>
        );
      })}
    </div>
  );
}
