import { cn } from "@/lib/utils";

interface TeamColumnLabelProps {
  team: 1 | 2;
  winnerTeam?: 1 | 2;
  compact?: boolean;
  className?: string;
}

export function TeamColumnLabel({
  team,
  winnerTeam,
  compact = false,
  className,
}: TeamColumnLabelProps) {
  const isWinner = winnerTeam === team;
  const showResult = winnerTeam !== undefined;

  return (
    <h3
      className={cn(
        "font-bold",
        compact ? "text-sm" : "text-xl",
        !showResult && team === 1 && "text-indigo-300",
        !showResult && team === 2 && "text-purple-300",
        showResult && isWinner && "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]",
        showResult && !isWinner && "text-red-300/85",
        className
      )}
    >
      Team {team}
      {showResult && (
        <span
          className={cn(
            "ml-1.5 text-xs font-semibold uppercase tracking-wide",
            isWinner ? "text-emerald-400" : "text-red-400"
          )}
        >
          · {isWinner ? "Winner" : "Loser"}
        </span>
      )}
    </h3>
  );
}
