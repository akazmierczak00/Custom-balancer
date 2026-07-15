import { REVEAL_ROLE_ORDER } from "@/lib/constants/roles";
import { TeamColumnLabel } from "@/components/lobby/team-column-label";
import { PlayerAssignment } from "@/types";

interface RoundLineupCompactProps {
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  winnerTeam: 1 | 2;
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
}: RoundLineupCompactProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4 text-center">
        <TeamColumnLabel team={1} winnerTeam={winnerTeam} compact />
        <TeamColumnLabel team={2} winnerTeam={winnerTeam} compact />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[team1, team2].map((team, index) => (
          <ul key={index} className="space-y-1">
            {sortByRole(team).map((player) => (
              <li
                key={player.uid}
                className="lobby-lineup-nick rounded-md border border-slate-700/80 bg-slate-800/50 px-2 py-1 text-sm text-slate-200"
              >
                {player.nick}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
