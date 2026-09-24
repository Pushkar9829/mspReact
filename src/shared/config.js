// Windows resolves "localhost" to IPv6 first. Another app can own [::]:5000 while
// this API is on 127.0.0.1:5000, so keep local calls on IPv4.
function localApiBase(value) {
  return String(value || "")
    .replace(/\/$/, "")
    .replace(/^(https?:\/\/)localhost(?=:\d+)/i, "$1127.0.0.1");
}

export const API_BASE = localApiBase(import.meta.env.VITE_API_URL);

export function apiUrl(path = "") {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
