/**
 * Wishlist for buyers (server) and guests (this device), one API:
 *
 *   const wish = useWishlist();
 *   wish.items            // [{ productId, variantId, slug, name, image, price, listPrice, packSize, available }]
 *   wish.has(product)     // by productId (or slug)
 *   wish.toggle(product)  // product from mapProduct (needs productId), optimistic
 *
 * Server rows are keyed by { productId, variantId } (PUT /wishlist is strict). Guests keep a local
 * list that is merged into the account on sign-in (mergeGuestWishlist), not dropped.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";
import { STORAGE, readJson, writeJson, removeKey } from "../lib/storage.js";

/* ---------------------------------------------------------------- guest store */

const subs = new Set();
let guestCache = null;

function readGuest() {
  if (!guestCache) {
    const raw = readJson(STORAGE.wish, []);
    // Old format: strings (slugs) or snapshots with `id` and no productId. Keep only usable rows.
    guestCache = (Array.isArray(raw) ? raw : []).filter((r) => r && typeof r === "object" && (r.productId || r.slug || r.id)).map((r) => ({ ...r, slug: r.slug || r.id || "" }));
  }
  return guestCache;
}

function writeGuest(rows) {
  guestCache = rows;
  writeJson(STORAGE.wish, rows);
  subs.forEach((fn) => fn());
}

export function clearGuestWishlist() {
  guestCache = [];
  removeKey(STORAGE.wish);
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  const onStorage = (e) => {
    if (e.key === STORAGE.wish) {
      guestCache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subs.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot of a product for the guest list (display only; prices are refreshed from the server after merge). */
export function wishSnapshot(product, variantId) {
  const v = (variantId && product?.variants?.find((x) => x.id === variantId)) || product?.defaultVariant || null;
  return {
    productId: product?.productId || null,
    variantId: v?.id || variantId || null,
    slug: product?.slug || product?.id || "",
    name: product?.name || "",
    image: product?.image || "",
    price: v?.price ?? product?.price ?? null,
    listPrice: v?.mrp ?? product?.mrp ?? null,
    packSize: v?.pack || product?.weight || "",
    available: product?.inStock !== false,
  };
}

/**
 * Merge this device's guest wishlist into the signed-in account, then clear it. Rows without a
 * productId are resolved through the product lookup. Safe to call repeatedly.
 */
export async function mergeGuestWishlist() {
  const rows = readGuest();
  if (!rows.length) return { merged: 0 };
  let merged = 0;
  for (const row of rows) {
    try {
      let productId = row.productId;
      if (!productId && row.slug) productId = (await api.lookupProduct(row.slug))?.product?._id;
      if (!productId) continue;
      await api.saveWish({ productId, ...(row.variantId ? { variantId: row.variantId } : {}) });
      merged += 1;
    } catch {
      /* product unpublished, wishlist full… skip that row */
    }
  }
  clearGuestWishlist();
  return { merged };
}

/* ---------------------------------------------------------------- hook */

export function useWishlist() {
  const qc = useQueryClient();
  const { viewer, signedIn, ready } = useViewer();
  const key = shopKeys.wishlist(viewer);
  const guestRows = useSyncExternalStore(subscribe, readGuest, () => []);

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.listWishlist(),
    enabled: ready && signedIn,
    staleTime: 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []).map((r) => ({ ...r, productId: String(r.productId || ""), variantId: r.variantId ? String(r.variantId) : null })),
  });

  const items = signedIn ? query.data || [] : guestRows;

  const matches = useCallback(
    (row, product) => {
      const pid = typeof product === "string" ? null : product?.productId;
      const slug = typeof product === "string" ? product : product?.slug || product?.id;
      return (pid && String(row.productId) === String(pid)) || (slug && row.slug === slug);
    },
    []
  );

  const save = useMutation({
    mutationFn: ({ product, variantId }) => api.saveWish({ productId: product.productId, ...(variantId ? { variantId } : {}) }),
    onMutate: async ({ product, variantId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur) => [wishSnapshot(product, variantId), ...((Array.isArray(cur) ? cur : cur?.data) || [])]);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(err?.message || "Could not save to wishlist");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const unsave = useMutation({
    mutationFn: ({ product }) => api.removeWish(product.productId || product.slug || product.id),
    onMutate: async ({ product }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (cur) => ((Array.isArray(cur) ? cur : cur?.data) || []).filter((r) => !matches(r, product)));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      qc.setQueryData(key, ctx?.prev);
      toast.error(err?.message || "Could not update wishlist");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const has = useCallback((product) => items.some((r) => matches(r, product)), [items, matches]);

  const toggle = useCallback(
    async (product, variantId) => {
      if (!product) return;
      const on = items.some((r) => matches(r, product));
      if (!signedIn) {
        writeGuest(on ? guestRows.filter((r) => !matches(r, product)) : [wishSnapshot(product, variantId), ...guestRows]);
        if (!on) toast.success("Saved to wishlist on this device", { description: "Sign in to keep it in your account." });
        return;
      }
      let target = product;
      if (!target.productId && (target.slug || target.id)) {
        const looked = await api.lookupProduct(target.slug || target.id).catch(() => null);
        if (looked?.product?._id) target = { ...target, productId: looked.product._id };
      }
      if (on) unsave.mutate({ product: target });
      else if (target.productId) save.mutate({ product: target, variantId });
    },
    [items, matches, signedIn, guestRows, save, unsave]
  );

  return useMemo(
    () => ({ items, count: items.length, has, toggle, isPending: signedIn ? query.isPending : false, error: query.error, refetch: query.refetch, signedIn }),
    [items, has, toggle, signedIn, query.isPending, query.error, query.refetch]
  );
}
