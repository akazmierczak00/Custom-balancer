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

export type LoLDivision = "I" | "II" | "III" | "IV";

export type RankSource = "manual" | "riot";

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
  rankDivision?: LoLDivision | "";
  rankLp?: number;
  rankSource?: RankSource;
  rolePriorities: RolePriorityGroup[];
  wins: number;
  losses: number;
  matchHistory: MatchResult[];
  profileComplete: boolean;
  achievements: string[];
  isTestBot?: boolean;
  riotGameName?: string;
  riotTagLine?: string;
  riotPuuid?: string;
  riotLinkedAt?: Timestamp;
  riotRankSyncedAt?: Timestamp;
  riotSyncDisabled?: boolean;
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

export type BalanceMode =
  | "classic"
  | "roles"
  | "score"
  | "fair_lanes"
  | "chaos";

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
  | "champion_select"
  | "playing"
  | "post_game"
  | "session_summary"
  | "archived";

export interface PlayerAssignment {
  uid: string;
  nick: string;
  rank: LoLRank;
  rankDivision?: LoLDivision | "";
  rankLp?: number;
  role: LoLRole;
  wins?: number;
  losses?: number;
  matchHistory: MatchResult[];
  rolePrioritiesLabel?: string;
}

export interface TeamProposal {
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
}

export type LineupVoteChoice = "accept" | "reshuffle";
export type ProposalVoteChoice = "A" | "B" | "C";

/** Dwóch graczy zablokowanych na tej samej linii przeciwko sobie. */
export interface FeaturedMatchup {
  role: LoLRole;
  uidA: string;
  uidB: string;
}

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
  championPool?: {
    role: LoLRole;
    patch: string;
    appliedTiers: (1 | 2 | 3)[];
    startingPool: {
      id: string;
      key: string;
      name: string;
      iconUrl: string;
    }[];
    removedChampionIds: string[];
    remaining: {
      id: string;
      key: string;
      name: string;
      iconUrl: string;
    }[];
    revealedAt: number;
  };
}

export interface LobbyRoundRecord {
  roundNumber: number;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  winnerTeam: 1 | 2;
  selectedWeaknesses: SelectedWeakness[];
  youtubeUrl?: string;
  completedAt: Timestamp;
}

export interface Lobby {
  id: string;
  createdBy: string;
  status: LobbyStatus;
  /** Tryb losowania składów — domyślnie classic dla starych lobby. */
  balanceMode?: BalanceMode;
  /**
   * Opcjonalny „featured matchup”: dwóch graczy zawsze na tej samej linii
   * przeciwko sobie, niezależnie od reszty losowania.
   */
  featuredMatchup?: FeaturedMatchup | null;
  slots: (string | null)[];
  presentUids?: Record<string, boolean>;
  acceptances: Record<string, boolean>;
  acceptDeadline: Timestamp | null;
  team1: PlayerAssignment[];
  team2: PlayerAssignment[];
  proposalA: TeamProposal | null;
  proposalB: TeamProposal | null;
  proposalC: TeamProposal | null;
  votes: VoteState;
  reshuffleBonusGranted: boolean;
  weaknesses: LobbyWeaknesses;
  winnerTeam: 1 | 2 | null;
  roundHistory: LobbyRoundRecord[];
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
  rankDivision?: LoLDivision | "";
  rankLp?: number;
  rolePriorities: RolePriorityGroup[];
  wins: number;
  losses: number;
  matchHistory: MatchResult[];
}
