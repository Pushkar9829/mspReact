/**
 * Listing filters in the URL (shareable, back-button friendly).
 *
 *   const f = useShopFilters({ category: slug });
 *   f.filters            // { q, category, brand: [], seller: [], pack: [], minPrice, maxPrice, discount, inStock, bulk, sort, view }
 *   f.set("sort", "price-asc")      f.setMany({ minPrice, maxPrice })      f.toggle("brand", "tata")      f.clear("brand")      f.reset()
 *   f.chips              // [{ key, value, label }] for <FilterChips>
 *   f.activeCount
 *   useProductSearch(f.filters)     // server search with the same filters
 *
 * Multi-value keys are comma lists in the URL (?brand=tata,mdh). Changing a filter pushes a history
 * entry; typing in search (setQuery) replaces it. `view` (grid|list) is kept in the URL too.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export const MULTI_KEYS = ["brand", "seller", "pack"];
export const SINGLE_KEYS = ["q", "minPrice", "maxPrice", "discount", "inStock", "bulk", "sort", "view", "tag"];

export const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

const split = (v) => (v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []);

export function useShopFilters({ category = "", labels = {} } = {}) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const out = { category: category || "" };
    MULTI_KEYS.forEach((k) => (out[k] = split(params.get(k))));
    SINGLE_KEYS.forEach((k) => (out[k] = params.get(k) || ""));
    out.inStock = params.get("inStock") === "1";
    out.bulk = params.get("bulk") === "1";
    out.sort = params.get("sort") || "relevance";
    out.view = params.get("view") === "list" ? "list" : "grid";
    return out;
  }, [params, category]);

  // React Router's functional setSearchParams reads the params of the last render, so two writes in
  // one tick (two toggles, min + max price) would each start from the same old URL and the first
  // would be lost. Chain them through `pending` until the URL has caught up.
  const pending = useRef(null);
  useEffect(() => {
    pending.current = null;
  }, [params]);
  const write = useCallback(
    (mutate, { replace = false } = {}) => {
      const next = new URLSearchParams(pending.current || params);
      mutate(next);
      next.delete("page");
      pending.current = next;
      setParams(next, { replace });
    },
    [params, setParams]
  );

  const put = (next, key, value) => {
    const v = Array.isArray(value) ? value.join(",") : typeof value === "boolean" ? (value ? "1" : "") : value;
    if (v === "" || v == null || (key === "sort" && v === "relevance") || (key === "view" && v === "grid")) next.delete(key);
    else next.set(key, String(v));
  };
  const set = useCallback((key, value, opts) => write((next) => put(next, key, value), opts), [write]);
  /** Several keys in one history entry: f.setMany({ minPrice: "100", maxPrice: "500" }). */
  const setMany = useCallback((values, opts) => write((next) => Object.entries(values).forEach(([k, v]) => put(next, k, v)), opts), [write]);

  // Reads the list from the pending URL, so two toggles in one tick both land.
  const toggle = useCallback(
    (key, value) =>
      write((next) => {
        const cur = split(next.get(key));
        const out = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
        if (out.length) next.set(key, out.join(","));
        else next.delete(key);
      }),
    [write]
  );

  const clear = useCallback((key) => set(key, ""), [set]);
  const setQuery = useCallback((q) => set("q", q, { replace: true }), [set]);
  const reset = useCallback(
    () =>
      write((next) => {
        [...MULTI_KEYS, ...SINGLE_KEYS].filter((k) => k !== "q" && k !== "view" && k !== "tag").forEach((k) => next.delete(k));
      }),
    [write]
  );

  const chips = useMemo(() => {
    const out = [];
    const name = (key, v) => labels[key]?.[v] || v;
    MULTI_KEYS.forEach((k) => filters[k].forEach((v) => out.push({ key: k, value: v, label: name(k, v) })));
    if (filters.minPrice || filters.maxPrice) {
      const lo = filters.minPrice ? `₹${filters.minPrice}` : "";
      const hi = filters.maxPrice ? `₹${filters.maxPrice}` : "";
      out.push({ key: "price", value: "", label: lo && hi ? `${lo}–${hi}` : lo ? `${lo}+` : `Under ${hi}` });
    }
    if (filters.discount) out.push({ key: "discount", value: filters.discount, label: `${filters.discount}% off or more` });
    if (filters.inStock) out.push({ key: "inStock", value: "1", label: "In stock" });
    if (filters.bulk) out.push({ key: "bulk", value: "1", label: "Bulk eligible" });
    return out;
  }, [filters, labels]);

  const removeChip = useCallback(
    (chip) => {
      if (chip.key === "price")
        write((next) => {
          next.delete("minPrice");
          next.delete("maxPrice");
        });
      else if (MULTI_KEYS.includes(chip.key)) toggle(chip.key, chip.value);
      else clear(chip.key);
    },
    [write, toggle, clear]
  );

  return { filters, set, setMany, toggle, clear, setQuery, reset, chips, removeChip, activeCount: chips.length };
}

export default useShopFilters;
