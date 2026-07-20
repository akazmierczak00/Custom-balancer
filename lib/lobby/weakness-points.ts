import { Lobby } from "@/types";

const WEAKNESS_BASE_POINTS = 3;
const MAX_ADRIAN_WIN_BONUS = 3;

export function getAdrianTeamNumber(lobby: Lobby): 1 | 2 | null {
  if (lobby.team1.some((player) => player.uid === lobby.createdBy)) return 1;
  if (lobby.team2.some((player) => player.uid === lobby.createdBy)) return 2;
  return null;
}

export function countAdrianWinsInSession(lobby: Lobby): number {
  const adrianTeam = getAdrianTeamNumber(lobby);
  if (!adrianTeam) return 0;

  return (lobby.roundHistory ?? []).filter((round) => round.winnerTeam === adrianTeam)
    .length;
}

/** 3 pkt bazowe + 1 za każdą wygraną Adriana w sesji (max +3, czyli 6 pkt). */
export function getWeaknessPointsBase(lobby: Lobby): number {
  return WEAKNESS_BASE_POINTS + Math.min(countAdrianWinsInSession(lobby), MAX_ADRIAN_WIN_BONUS);
}

export function getWeaknessPointsTotal(lobby: Lobby): number {
  return getWeaknessPointsBase(lobby) + (lobby.reshuffleBonusGranted ? 1 : 0);
}
