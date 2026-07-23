import { REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { isChampionPickRef } from "@/lib/lobby/champion-select";
import { TeamColumnLabel } from "@/components/lobby/team-column-label";
import { cn } from "@/lib/utils";
import type { ChampionPickRef, LoLRole, PlayerAssignment } from "@/types";

interface RoundLineupCompactProps {
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  winnerTeam: 1 | 2;
  picks?: {
    team1: Record<LoLRole, ChampionPickRef | null>;
    team2: Record<LoLRole, ChampionPickRef | null>;
  } | null;
}

function sortByRole(team: PlayerAssignment[]) {
  return [...team].sort(
    (a, b) => REVEAL_ROLE_ORDER.indexOf(a.role) - REVEAL_ROLE_ORDER.indexOf(b.role)
  );
}

export function RoundLineupCompact({
  team1,
  team2,
  winnerTeam,
  picks = null,
}: RoundLineupCompactProps) {
  const renderTeam = (team: PlayerAssignment[], teamNum: 1 | 2) => {
    const side = teamNum === 1 ? "team1" : "team2";
    const outsideLeft = teamNum === 1;

    return (
      <ul className="space-y-1">
        {sortByRole(team).map((player) => {
          const pick = picks?.[side]?.[player.role];
          const iconUrl = isChampionPickRef(pick) ? pick.iconUrl : null;
          const champName = isChampionPickRef(pick) ? pick.name : null;

          return (
            <li
              key={player.uid}
              className={cn(
                "lobby-lineup-nick flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/50 px-2 py-1 text-sm text-slate-200",
                outsideLeft ? "flex-row" : "flex-row-reverse"
              )}
            >
              {iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={iconUrl}
                  alt={champName ?? ""}
                  title={champName ?? undefined}
                  className="h-5 w-5 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="h-5 w-5 shrink-0" aria-hidden />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  outsideLeft ? "text-right" : "text-left"
                )}
              >
                {player.nick}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4 text-center">
        <TeamColumnLabel team={1} winnerTeam={winnerTeam} compact />
        <TeamColumnLabel team={2} winnerTeam={winnerTeam} compact />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {renderTeam(team1, 1)}
        {renderTeam(team2, 2)}
      </div>
    </div>
  );
}
