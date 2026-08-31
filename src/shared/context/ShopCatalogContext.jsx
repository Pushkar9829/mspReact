import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import {
  brands as staticBrands,
  categories as staticCategories,
  products as staticProducts,
  setLiveCatalog,
} from "../data/catalog.js";
import { mapApiProduct, mapCategory } from "../lib/mapProduct.js";

const ShopCatalogContext = createContext(null);

export function ShopCatalogProvider({ children }) {
  const [categories, setCategories] = useState(staticCategories);
  const [products, setProducts] = useState(staticProducts);
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, search] = await Promise.all([
          api.listCategories({ status: "active", parentId: "null" }),
          api.searchProducts({ limit: 100 }),
        ]);
        if (cancelled) return;
        const catRows = (Array.isArray(catRes) ? catRes : catRes.data || []).map(mapCategory).filter(Boolean);
        const productRows = (search.data || []).map(mapApiProduct).filter(Boolean);
        if (catRows.length) setCategories(catRows);
        if (productRows.length) {
          setProducts(productRows);
          setLiveCatalog(productRows);
        }
        setLive(true);
      } catch {
        setLive(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const brands = uniqueBrands(products, live);
    return {
      ready,
      live,
      categories,
      products,
      brands,
      getProduct: (id) => products.find((p) => p.id === id),
      filterProducts: (opts = {}) => filterRows(products, opts),
    };
  }, [categories, products, live, ready]);

  return <ShopCatalogContext.Provider value={value}>{children}</ShopCatalogContext.Provider>;
}

export function useShopCatalog() {
  const ctx = useContext(ShopCatalogContext);
  if (!ctx) throw new Error("useShopCatalog must be used inside ShopCatalogProvider");
  return ctx;
}

function uniqueBrands(rows, live) {
  if (!live) return staticBrands;
  const seen = new Map();
  for (const p of rows) {
    if (!p.brand) continue;
    const slug = p.brand.toLowerCase().replace(/\s+/g, "-");
    if (!seen.has(slug)) seen.set(slug, { slug, name: p.brand, letter: p.brand[0] });
  }
  return [...seen.values()];
}

function filterRows(rows, { category, brand, q, deal, newLaunch, bestseller, maxPrice } = {}) {
  return rows.filter((p) => {
    if (category && category !== "all" && p.category !== category) return false;
    if (brand && p.brand.toLowerCase() !== String(brand).toLowerCase()) return false;
    if (deal && !p.deal) return false;
    if (newLaunch && !p.newLaunch) return false;
    if (bestseller && !p.bestseller) return false;
    if (maxPrice && p.price > maxPrice) return false;
    if (q) {
      const hay = `${p.name} ${p.brand} ${p.category}`.toLowerCase();
      if (!hay.includes(String(q).toLowerCase())) return false;
    }
    return true;
  });
}
