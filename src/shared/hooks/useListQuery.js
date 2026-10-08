import { useEffect, useMemo, useState } from "react";
import { useUrlTableState } from "./useUrlTableState.js";

/**
 * Legacy list-state hook (kept for pages not yet migrated). New code: useUrlTableState.
 *
 *   const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery(defaults, limit)
 *
 *   const { ... } = useUrlListQuery(defaults, limit, { reserved })   // URL-synced variant
 *
 * useUrlListQuery is a thin wrapper over useUrlTableState (URL is the source of truth, so
 * back/forward and nav clicks work). useListQuery keeps state local to the component.
 * They are separate hooks so the hook calls never change between renders.
 */
export function useListQuery(defaults = {}, limit = 20) {
  return useLocalList(defaults, limit);
}

export function useUrlListQuery(defaults = {}, limit = 20, options = {}) {
  const table = useUrlTableState({ filters: "*", defaults: { ...defaults, limit }, reserved: options.reserved || [] });
  return {
    q: table.search,
    setQ: table.setSearch,
    page: table.page,
    setPage: table.setPage,
    filters: table.filters,
    setFilter: table.setFilter,
    reset: table.reset,
    query: table.query,
    table,
  };
}

function useLocalList(defaults, limit) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(() => ({ ...defaults }));

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

  const query = useMemo(() => {
    const out = { page, limit };
    if (debouncedQ) out.q = debouncedQ;
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== "") out[key] = value;
    });
    return out;
  }, [debouncedQ, page, limit, filters]);

  return {
    q,
    setQ,
    page,
    setPage,
    filters,
    setFilter: (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    reset: () => {
      setQ("");
      setDebouncedQ("");
      setPage(1);
      setFilters({ ...defaults });
    },
    query,
  };
}

export default useListQuery;
