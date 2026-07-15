import { Lobby } from "@/types";

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

export function formatLobbyPlayedDate(lobby: Lobby): string | null {
  const rounds = lobby.roundHistory ?? [];

  if (rounds.length > 0) {
    const first = rounds[0].completedAt?.toDate?.();
    const last = rounds[rounds.length - 1].completedAt?.toDate?.();
    if (first && last) {
      const firstLabel = first.toLocaleDateString("pl-PL", DATE_OPTS);
      const lastLabel = last.toLocaleDateString("pl-PL", DATE_OPTS);
      return firstLabel === lastLabel ? firstLabel : `${firstLabel} – ${lastLabel}`;
    }
  }

  const updated = lobby.updatedAt?.toDate?.();
  return updated ? updated.toLocaleDateString("pl-PL", DATE_OPTS) : null;
}
