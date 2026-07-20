import { BalanceMode } from "@/types";

export const BALANCE_MODES: {
  value: BalanceMode;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Klasyczny",
    description: "Obecny algorytm — wyrównanie po randze (±2 pkt), role potem.",
  },
  {
    value: "roles",
    label: "Role",
    description: "Preferuje priorytety ról przy podziale drużyn (P1–P2).",
  },
  {
    value: "score",
    label: "Zbalansowany",
    description: "Łączy równość rang i jakość ról w jeden wynik.",
  },
  {
    value: "fair_lanes",
    label: "Fair lanes",
    description: "Wyrównuje linie (mid vs mid, jungle vs jungle itd.).",
  },
  {
    value: "chaos",
    label: "Chaos",
    description: "Większa losowość — zabawniejsze, mniej „idealne” składy.",
  },
];

export function getBalanceModeLabel(mode: BalanceMode | undefined): string {
  return BALANCE_MODES.find((entry) => entry.value === (mode ?? "classic"))?.label ?? "Klasyczny";
}

export function normalizeBalanceMode(mode: unknown): BalanceMode {
  if (
    mode === "classic" ||
    mode === "roles" ||
    mode === "score" ||
    mode === "fair_lanes" ||
    mode === "chaos"
  ) {
    return mode;
  }
  return "classic";
}
