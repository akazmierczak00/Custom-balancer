import { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "user";

export type LoLRank =
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "diamond"
  | "master"
  | "grandmaster"
  | "challenger";

export type LoLRole = "top" | "jungle" | "mid" | "adc" | "support";

export type MatchResult = "W" | "L";

export interface RolePriorityGroup {
  priority: number;
  roles: LoLRole[];
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  nick: string;
  rank: LoLRank | "";
  rolePriorities: RolePriorityGroup[];
  wins: number;
  losses: number;
  matchHistory: MatchResult[];
  profileComplete: boolean;
  achievements: string[];
  isTestBot?: boolean;
  riotPuuid?: string;
  createdAt: Timestamp;
}

export interface Weakness {
  id: string;
  name: string;
  tier1?: string;
  tier2?: string;
  tier3?: string;
  rarity: number;
  createdBy: string;
  createdAt: Timestamp;
}

export type LobbyStatus =
  | "open"
  | "confirming"
  | "drafting"
  | "reveal"
  | "overview"
  | "voting_lineup"
  | "locked_lineup"
  | "reshuffle_reveal"
  | "voting_proposals"
  | "locked_proposals"
  | "weakness_reveal"
  | "weakness_pick"
  | "final"
  | "playing"
  | "post_game"
  | "cooldown"
  | "archived";

export interface PlayerAssignment {
  uid: string;
  nick: string;
  rank: LoLRank;
  role: LoLRole;
  matchHistory: MatchResult[];
  rolePrioritiesLabel?: string;
}

export interface TeamProposal {
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
}

export type LineupVoteChoice = "accept" | "reshuffle";
export type ProposalVoteChoice = "A" | "B";

export interface VoteState {
  lineup: Record<string, LineupVoteChoice>;
  proposals: Record<string, ProposalVoteChoice>;
  locked: boolean;
}

export interface WeaknessCell {
  weaknessId: string;
  name: string;
  text: string;
  tier: 1 | 2 | 3;
  rarity: number;
  revealed: boolean;
}

export interface SelectedWeakness {
  weaknessId: string;
  name: string;
  text: string;
  tier: 1 | 2 | 3;
  cost: number;
}

export interface LobbyWeaknesses {
  drawn: WeaknessCell[];
  selected: SelectedWeakness[];
  pointsTotal: number;
  pointsSpent: number;
  selectorUid: string | null;
  confirmed: boolean;
  revealIndex: number;
}

export interface Lobby {
  id: string;
  createdBy: string;
  status: LobbyStatus;
  slots: (string | null)[];
  acceptances: Record<string, boolean>;
  acceptDeadline: Timestamp | null;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  proposalA: TeamProposal | null;
  proposalB: TeamProposal | null;
  votes: VoteState;
  reshuffleBonusGranted: boolean;
  weaknesses: LobbyWeaknesses;
  winnerTeam: 1 | 2 | null;
  cooldownMinutes: number | null;
  cooldownEndsAt: Timestamp | null;
  phaseTimerEndsAt: Timestamp | null;
  revealRoleIndex: number;
  updatedAt: Timestamp;
}

export interface LobbyPlayer {
  uid: string;
  nick: string;
  rank: LoLRank;
  rolePriorities: RolePriorityGroup[];
  wins: number;
  losses: number;
  matchHistory: MatchResult[];
}
