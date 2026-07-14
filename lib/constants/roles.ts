import { LoLRole } from "@/types";

export const ROLES: { value: LoLRole; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "jungle", label: "Jungle" },
  { value: "mid", label: "Mid" },
  { value: "adc", label: "ADC" },
  { value: "support", label: "Support" },
];

export const REVEAL_ROLE_ORDER: LoLRole[] = [
  "top",
  "jungle",
  "mid",
  "adc",
  "support",
];

export const DEFAULT_ROLE_PRIORITIES = [
  { priority: 1, roles: ["mid" as LoLRole] },
  { priority: 2, roles: ["jungle" as LoLRole, "top" as LoLRole] },
  { priority: 3, roles: ["support" as LoLRole] },
  { priority: 4, roles: ["adc" as LoLRole] },
];

export function getRoleLabel(role: LoLRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function formatRolePriorities(
  priorities: { priority: number; roles: LoLRole[] }[]
): string {
  return [...priorities]
    .sort((a, b) => a.priority - b.priority)
    .map((group) => group.roles.map((r) => getRoleLabel(r).toUpperCase()).join(" = "))
    .join(" > ");
}
