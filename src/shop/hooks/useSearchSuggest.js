/**
 * Data for the search combobox.
 *   const s = useSearchSuggest(term, { category });
 *   s.products   // up to 6 server matches (thumbnails)
 *   s.brands     // brand name matches (from the public brand list)
 *   s.categories // category matches (tree, incl. sub-categories)
 *   s.recent     // this device / account recent terms
 *   s.popular    // popular terms (server)
 *   s.loading
 */
import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";
import { useBrands, useCategories } from "./useCatalog.js";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue.js";
import { mapProduct } from "../lib/mapProduct.js";
import { readRecentSearches } from "../lib/recentSearches.js";

const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, "").trim();

export function useSearchSuggest(term, { category = "", enabled = true } = {}) {
  const { viewer } = useViewer();
  const q = useDebouncedValue(String(term || "").trim(), 180);
  const brands = useBrands();
  const cats = useCategories();

  const products = useQuery({
    queryKey: shopKeys.suggest(`${q}|${category}`, viewer),
    queryFn: ({ signal }) => api.withSignal(signal).searchProducts({ q, limit: 6, ...(category && category !== "all" ? { category } : {}) }),
    enabled: enabled && q.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const history = useQuery({
    queryKey: shopKeys.searchHistory(viewer),
    queryFn: () => api.searchSuggestions(),
    enabled,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    const n = norm(q);
    const brandRows = n ? (brands.data || []).filter((b) => norm(b.name).includes(n)).slice(0, 4) : [];
    const catRows = n ? (cats.data?.list || []).filter((c) => norm(c.name).includes(n)).slice(0, 4) : [];
    const local = readRecentSearches();
    const remoteRecent = (history.data?.recent || []).map((r) => r.display || r.term).filter(Boolean);
    const recent = [...new Set([...remoteRecent, ...local.map((r) => (typeof r === "string" ? r : r.display || r.term))])].filter(Boolean).slice(0, 6);
    const popular = (history.data?.popular || []).map((r) => r.display || r.term).filter(Boolean).slice(0, 8);
    return {
      term: q,
      products: q.length >= 2 ? (products.data?.data || []).map(mapProduct).filter(Boolean) : [],
      total: products.data?.meta?.total ?? null,
      brands: brandRows,
      categories: catRows,
      recent,
      popular,
      loading: q.length >= 2 && products.isFetching,
    };
  }, [q, products.data, products.isFetching, brands.data, cats.data, history.data]);
}
