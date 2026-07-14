import { deleteField, FieldValue } from "firebase/firestore";
import { Weakness } from "@/types";

export type WeaknessTierField = "tier1" | "tier2" | "tier3";

export interface WeaknessFormInput {
  name: string;
  tier1: string;
  tier2: string;
  tier3: string;
  rarity: number;
  createdBy?: string;
}

const TIER_FIELDS: WeaknessTierField[] = ["tier1", "tier2", "tier3"];

export function getWeaknessTierText(
  weakness: Weakness,
  tier: 1 | 2 | 3
): string | null {
  const text =
    tier === 1 ? weakness.tier1 : tier === 2 ? weakness.tier2 : weakness.tier3;
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

export function weaknessHasTier(weakness: Weakness, tier: 1 | 2 | 3): boolean {
  return getWeaknessTierText(weakness, tier) !== null;
}

export function sanitizeWeaknessForm(
  form: WeaknessFormInput,
  options?: { isUpdate?: boolean }
): Record<string, string | number | FieldValue> {
  const payload: Record<string, string | number | FieldValue> = {
    name: form.name.trim(),
    rarity: form.rarity,
  };

  if (form.createdBy) {
    payload.createdBy = form.createdBy;
  }

  for (const field of TIER_FIELDS) {
    const value = form[field].trim();
    if (value) {
      payload[field] = value;
    } else if (options?.isUpdate) {
      payload[field] = deleteField();
    }
  }

  return payload;
}

export function validateWeaknessForm(form: WeaknessFormInput): string | null {
  if (!form.name.trim()) {
    return "Nazwa jest wymagana";
  }
  if (form.rarity < 1 || form.rarity > 100) {
    return "Rzadkość musi być między 1 a 100";
  }
  if (!TIER_FIELDS.some((field) => form[field].trim())) {
    return "Wypełnij przynajmniej jeden tier";
  }
  return null;
}
