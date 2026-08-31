export function inr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatEta(from, to) {
  if (!from) return "";
  const a = formatDate(from);
  const b = formatDate(to);
  return b && b !== a ? `${a} – ${b}` : a;
}
