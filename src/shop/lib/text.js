/**
 * Display helpers for names typed by admins and sellers. They change only how text is shown, never
 * the stored data.
 */

const SMALL_WORDS = new Set(["and", "or", "of", "the", "for", "in", "with", "&"]);

/**
 * Tidy all-caps or all-lowercase names into title case; mixed-case names are respected as typed.
 *   "pan corner"                    → "Pan Corner"
 *   "READYMADE FASION"              → "Readymade Fasion"
 *   "SURF EXCEL BLUE POWDER MRP10"  → "Surf Excel Blue Powder MRP10"   (codes with digits stay upper)
 *   "britania good day mrp5"        → "Britania Good Day MRP5"
 *   "Tata Tea Premium"              → unchanged
 */
export function displayName(name) {
  const s = String(name || "").trim().replace(/\s+/g, " ");
  const letters = s.replace(/[^A-Za-z]/g, "");
  const shouting = letters.length > 3 && letters === letters.toUpperCase();
  const lower = letters.length > 0 && letters === letters.toLowerCase();
  if (!shouting && !lower) return s;
  return s
    .split(" ")
    .map((word, i) => {
      if (/\d/.test(word) && /[a-z]/i.test(word)) return word.toUpperCase(); // MRP10, 5KG, 1L
      const w = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      if (/^[a-z]{2}$/.test(w) && !SMALL_WORDS.has(w)) return w.toUpperCase(); // "kp group" → "KP Group"
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/** Up to two initials for a monogram: "Tata Tea Premium" → "TT". */
export function initialsOf(name) {
  const words = String(name || "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^\d/.test(w));
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "•";
}
