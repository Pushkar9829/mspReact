/**
 * Pack size parsing and unit price (₹/kg, ₹/L, ₹/pc). Display only: derived from a server price and
 * the pack the seller declared, never used for totals.
 */
const UNIT_ALIASES = {
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kgs: "kg", kilo: "kg",
  ml: "ml",
  l: "l", lt: "l", ltr: "l", ltrs: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  pc: "pc", pcs: "pc", piece: "pc", pieces: "pc", n: "pc", nos: "pc", unit: "pc", units: "pc",
};

/**
 * "500 g" → { qty: 500, unit: "g", count: 1 }; "12 x 1 L" → { qty: 1, unit: "l", count: 12 };
 * "Pack of 6" → { qty: 1, unit: "pc", count: 6 }. Returns null when it can't be read.
 */
export function parsePack(input) {
  const text = String(input || "").toLowerCase().replace(/,/g, ".").trim();
  if (!text) return null;
  const packOf = /pack\s*of\s*(\d+)/.exec(text);
  const multi = /(\d+)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*([a-z]+)/.exec(text);
  if (multi) {
    const unit = UNIT_ALIASES[multi[3]];
    if (unit) return { qty: Number(multi[2]), unit, count: Number(multi[1]) };
  }
  const single = /(\d+(?:\.\d+)?)\s*([a-z]+)/.exec(text);
  if (single) {
    const unit = UNIT_ALIASES[single[2]];
    if (unit) return { qty: Number(single[1]), unit, count: packOf ? Number(packOf[1]) : 1 };
  }
  if (packOf) return { qty: 1, unit: "pc", count: Number(packOf[1]) };
  return null;
}

/** Pack from variant attributes ({ packSize, size, unit, weight }) with the pack text as fallback. */
export function packOfVariant(attributes = {}) {
  const fromText = parsePack(attributes.packSize || attributes.size);
  if (fromText) return fromText;
  const unit = UNIT_ALIASES[String(attributes.unit || "").toLowerCase()];
  const qty = Number(attributes.weight);
  if (unit && qty > 0) return { qty, unit, count: 1 };
  return null;
}

/**
 * Unit price for a pack: { value, per: "kg" | "L" | "100 g" | "pc", label: "₹84/kg" } or null.
 * Weight/volume packs show per kg / per L; piece multipacks show per piece.
 */
export function unitPrice(price, pack, format = (n) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0 || !pack) return null;
  const total = pack.qty * (pack.count || 1);
  if (!(total > 0)) return null;
  let value;
  let per;
  if (pack.unit === "g") [value, per] = [(p / total) * 1000, "kg"];
  else if (pack.unit === "kg") [value, per] = [p / total, "kg"];
  else if (pack.unit === "ml") [value, per] = [(p / total) * 1000, "L"];
  else if (pack.unit === "l") [value, per] = [p / total, "L"];
  else if (pack.unit === "pc" && total > 1) [value, per] = [p / total, "pc"];
  else return null;
  const rounded = Math.round(value * 100) / 100;
  return { value: rounded, per, label: `${format(rounded)}/${per}` };
}
