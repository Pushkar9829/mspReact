const KEY = "msr-recent-searches";
const MAX = 8;

export function normalizeSearchTerm(raw) {
  const display = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const term = display.toLowerCase();
  if (term.length < 2) return null;
  return { term, display };
}

export function readRecentSearches() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => (typeof row === "string" ? normalizeSearchTerm(row) : normalizeSearchTerm(row?.display || row?.term)))
      .filter(Boolean)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function writeRecentSearches(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}

export function pushRecentSearch(raw) {
  const parsed = normalizeSearchTerm(raw);
  if (!parsed) return readRecentSearches();
  const next = [parsed, ...readRecentSearches().filter((row) => row.term !== parsed.term)].slice(0, MAX);
  writeRecentSearches(next);
  return next;
}

export function removeRecentSearch(raw) {
  const parsed = normalizeSearchTerm(raw);
  const next = readRecentSearches().filter((row) => row.term !== parsed?.term);
  writeRecentSearches(next);
  return next;
}

export function clearRecentSearches() {
  writeRecentSearches([]);
  return [];
}
