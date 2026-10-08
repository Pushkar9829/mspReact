import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Table state where the URL is the single source of truth.
 *
 *   const table = useUrlTableState({
 *     filters: ["status", "paymentStatus", "from", "to"],   // the only keys treated as filters
 *     defaults: { limit: 20, sort: "createdAt", order: "desc", status: "" },
 *     prefix: "",                                          // e.g. "inv_" for a 2nd table on a page
 *   });
 *   useQuery({ queryKey: keys.orders.list(table.query), queryFn: () => api.listOrders(table.query), ...listQueryOptions })
 *
 * Returned: { q, search, setSearch, page, limit, sort, order, filters, query,
 *             setPage, setLimit, setSort, toggleSort, setFilter, setFilters, reset, activeCount }
 * - `search` is the live input value (debounced into `q` in the URL with history.replace).
 * - page / limit / sort / filter changes push a history entry (back button works); changing
 *   anything but the page resets page to 1.
 * - Other URL params (e.g. ?tab=) are preserved. Back/forward updates everything, including the
 *   search box.
 * - `filters: "*"` treats every unknown param as a filter (legacy useListQuery behaviour).
 */
export function useUrlTableState(options = {}) {
  const { filters: filterKeys = [], defaults = {}, prefix = "", debounce = 300, reserved = [] } = options;
  const [params, setParams] = useSearchParams();
  const k = useCallback((name) => `${prefix}${name}`, [prefix]);
  const defaultsKey = JSON.stringify(defaults);
  const filterKeysKey = Array.isArray(filterKeys) ? filterKeys.join(",") : filterKeys;
  const reservedKey = reserved.join(",");

  const state = useMemo(() => {
    const d = JSON.parse(defaultsKey);
    const page = Math.max(1, Number(params.get(k("page"))) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get(k("limit"))) || Number(d.limit) || 20));
    const q = params.get(k("q")) || "";
    const sort = params.get(k("sort")) || d.sort || "";
    const order = params.get(k("order")) || d.order || (sort ? "desc" : "");
    const filters = {};
    if (filterKeysKey === "*") {
      Object.entries(d).forEach(([key, value]) => {
        if (!["limit", "sort", "order"].includes(key)) filters[key] = value;
      });
      const skip = new Set(["q", "page", "limit", "sort", "order", ...reservedKey.split(",").filter(Boolean)].map(k));
      params.forEach((value, key) => {
        if (!skip.has(key) && key.startsWith(prefix)) filters[key.slice(prefix.length)] = value;
      });
    } else {
      filterKeysKey
        .split(",")
        .filter(Boolean)
        .forEach((key) => {
          const value = params.get(k(key));
          filters[key] = value != null ? value : d[key] ?? "";
        });
    }
    return { page, limit, q, sort, order, filters };
  }, [params, k, defaultsKey, filterKeysKey, reservedKey, prefix]);

  // Live search input, debounced into the URL.
  const [search, setSearchState] = useState(state.q);
  const lastWritten = useRef(state.q);
  useEffect(() => {
    // URL changed from outside (back/forward, link): reflect it in the input.
    if (state.q !== lastWritten.current) {
      lastWritten.current = state.q;
      setSearchState(state.q);
    }
  }, [state.q]);

  const update = useCallback(
    (mutate, { replace = false, resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (name, value) => {
            const def = JSON.parse(defaultsKey)[name];
            const empty = value == null || value === "";
            if (empty && def != null && def !== "" && !["page", "limit", "sort", "order", "q"].includes(name)) next.set(k(name), "");
            else if (empty || (def != null && String(def) === String(value) && name !== "q")) next.delete(k(name));
            else next.set(k(name), String(value));
          };
          mutate(set, next);
          if (resetPage) next.delete(k("page"));
          return next;
        },
        { replace }
      );
    },
    [setParams, k, defaultsKey]
  );

  useEffect(() => {
    const value = search.trim();
    if (value === state.q) return undefined;
    const timer = setTimeout(() => {
      lastWritten.current = value;
      update((set) => set("q", value), { replace: true });
    }, debounce);
    return () => clearTimeout(timer);
  }, [search, state.q, debounce, update]);

  const setPage = useCallback((page) => update((set) => set("page", page > 1 ? page : ""), { resetPage: false }), [update]);
  const setLimit = useCallback((limit) => update((set) => set("limit", limit)), [update]);
  const setSort = useCallback(
    (sort, order = "desc") =>
      update((set) => {
        set("sort", sort);
        set("order", sort ? order : "");
      }),
    [update]
  );
  const toggleSort = useCallback(
    (column) => {
      if (state.sort !== column) return setSort(column, "asc");
      if (state.order === "asc") return setSort(column, "desc");
      return setSort("", "");
    },
    [state.sort, state.order, setSort]
  );
  const setFilter = useCallback((key, value) => update((set) => set(key, value)), [update]);
  const setFilters = useCallback(
    (obj) => update((set) => Object.entries(obj).forEach(([key, value]) => set(key, value))),
    [update]
  );
  const reset = useCallback(() => {
    lastWritten.current = "";
    setSearchState("");
    update((_set, next) => {
      const names = ["q", "sort", "order", "limit", ...Object.keys(state.filters)];
      names.forEach((name) => next.delete(k(name)));
    });
  }, [update, state.filters, k]);

  const query = useMemo(() => {
    const out = { page: state.page, limit: state.limit };
    if (state.q) out.q = state.q;
    if (state.sort) {
      out.sort = state.sort;
      out.order = state.order || "desc";
    }
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value != null && value !== "") out[key] = value;
    });
    return out;
  }, [state]);

  const activeCount = Object.values(state.filters).filter((v) => v != null && v !== "").length + (state.q ? 1 : 0);

  return {
    ...state,
    search,
    setSearch: setSearchState,
    setPage,
    setLimit,
    setSort,
    toggleSort,
    setFilter,
    setFilters,
    reset,
    query,
    activeCount,
  };
}

export default useUrlTableState;
