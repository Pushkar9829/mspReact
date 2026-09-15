export const API_BASE = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path = "") {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
