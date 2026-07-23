import type { ProposalVoteChoice } from "@/types";

/** Etykiety propozycji reshuffle (wewnętrznie nadal A/B/C). */
export const PROPOSAL_LABELS: Record<ProposalVoteChoice, string> = {
  A: "Ł",
  B: "O",
  C: "Ś",
};

export function getProposalLabel(choice: ProposalVoteChoice): string {
  return PROPOSAL_LABELS[choice];
}
