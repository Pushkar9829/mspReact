/**
 * Buyer business types, as the API stores them (POST /auth/register, PATCH /auth/me:
 * kirana | horeca | distributor | institution | other).
 */
export const BUSINESS_TYPES = [
  { value: "kirana", label: "Kirana, general store or supermarket" },
  { value: "horeca", label: "Restaurant, hotel or caterer" },
  { value: "distributor", label: "Wholesaler or distributor" },
  { value: "institution", label: "Office, school or institution" },
  { value: "other", label: "Other" },
];

export function businessTypeLabel(value) {
  return BUSINESS_TYPES.find((t) => t.value === value)?.label || "";
}
