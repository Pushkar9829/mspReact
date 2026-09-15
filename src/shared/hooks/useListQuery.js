import { useEffect, useMemo, useState } from "react";

export function useListQuery(defaults = {}, limit = 20) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(defaults);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = q.trim();
      setDebouncedQ((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function reset() {
    setQ("");
    setDebouncedQ("");
    setPage(1);
    setFilters(defaults);
  }

  const query = useMemo(() => {
    const out = { page, limit };
    if (debouncedQ) out.q = debouncedQ;
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== "") out[key] = value;
    });
    return out;
  }, [debouncedQ, page, limit, filters]);

  return { q, setQ, page, setPage, filters, setFilter, reset, query };
}
