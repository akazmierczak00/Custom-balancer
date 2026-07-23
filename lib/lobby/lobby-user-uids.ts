import { Lobby, PlayerAssignment } from "@/types";

function addTeamPlayers(uids: Set<string>, players: PlayerAssignment[]) {
  for (const player of players) {
    uids.add(player.uid);
  }
}

export function getLobbyUserUids(lobby: Lobby): string[] {
  const uids = new Set<string>();

  for (const uid of lobby.slots) {
    if (uid) uids.add(uid);
  }

  addTeamPlayers(uids, lobby.team1);
  addTeamPlayers(uids, lobby.team2);

  if (lobby.proposalA) {
    addTeamPlayers(uids, lobby.proposalA.team1);
    addTeamPlayers(uids, lobby.proposalA.team2);
  }

  if (lobby.proposalB) {
    addTeamPlayers(uids, lobby.proposalB.team1);
    addTeamPlayers(uids, lobby.proposalB.team2);
  }

  if (lobby.proposalC) {
    addTeamPlayers(uids, lobby.proposalC.team1);
    addTeamPlayers(uids, lobby.proposalC.team2);
  }

  return [...uids];
}
