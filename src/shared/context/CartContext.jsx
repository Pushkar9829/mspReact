import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct } from "../data/catalog.js";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";

const KEY = "msr-cart";
const WISH_KEY = "msr-wish";
const CartContext = createContext(null);

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function flattenQuote(quote) {
  if (!quote?.groups) return [];
  return quote.groups.flatMap((g) =>
    (g.items || []).map((i) => ({
      id: i.slug || String(i.sku || "").toLowerCase(),
      cartItemId: i.cartItemId,
      variantId: i.variantId,
      name: i.name,
      image: i.image,
      pack: i.pack || i.attributes?.packSize || i.attributes?.size || "",
      qty: i.qty,
      price: i.unitPrice,
      mrp: i.listPrice,
      tax: i.tax,
      lineTotal: i.lineTotal,
    }))
  );
}

const emptyQuote = {
  groups: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  deliveryFee: 0,
  couponDiscount: 0,
  grandTotal: 0,
  couponCode: "",
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(() => load(KEY, []));
  const [quote, setQuote] = useState(emptyQuote);
  const [live, setLive] = useState(false);
  const [wishlist, setWishlist] = useState(() => load(WISH_KEY, []));
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const applyQuote = useCallback((next) => {
    setQuote(next || emptyQuote);
    setItems(flattenQuote(next));
    setLive(true);
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getCart();
      applyQuote(next);
      return next;
    } catch (err) {
      setLive(false);
      setError(err.message || "");
      return null;
    }
  }, [applyQuote]);

  useEffect(() => {
    refresh();
  }, [user?.token, refresh]);

  const value = useMemo(() => {
    const count = live ? quote.itemCount || items.reduce((n, i) => n + i.qty, 0) : items.reduce((n, i) => n + i.qty, 0);
    const mrp = items.reduce((n, i) => n + (i.mrp || i.price) * i.qty, 0);
    const subtotal = live ? quote.subtotal : items.reduce((n, i) => n + i.price * i.qty, 0);
    const discount = live ? quote.couponDiscount || 0 : 0;
    const delivery = live ? quote.deliveryFee : subtotal >= 999 ? 0 : 40;
    const tax = live ? quote.tax : 0;
    const total = live ? quote.grandTotal : subtotal + delivery;

    return {
      items,
      quote,
      live,
      error,
      count,
      mrp,
      subtotal,
      discount,
      delivery,
      tax,
      total,
      couponCode: quote.couponCode || "",
      refresh,
      add: async (product, qty = 1, pack) => {
        const packSize = pack || product.weight;
        try {
          const looked = await api.lookupProduct(product.id, packSize);
          const next = await api.addCartItem({ variantId: looked.variant._id, qty });
          applyQuote(next);
        } catch {
          setItems((prev) => {
            const idx = prev.findIndex((i) => i.id === product.id && i.pack === packSize);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], qty: next[idx].qty + qty };
              return next;
            }
            return [
              ...prev,
              {
                id: product.id,
                name: product.name,
                image: product.image,
                price: product.price,
                mrp: product.mrp,
                pack: packSize,
                qty,
              },
            ];
          });
          setLive(false);
        }
      },
      setQty: async (id, pack, qty) => {
        const row = items.find((i) => i.id === id && i.pack === pack);
        if (live && row?.cartItemId) {
          try {
            if (qty < 1) applyQuote(await api.removeCartItem(row.cartItemId));
            else applyQuote(await api.updateCartItem(row.cartItemId, qty));
            return;
          } catch (err) {
            setError(err.message);
          }
        }
        setItems((prev) =>
          prev
            .map((i) => (i.id === id && i.pack === pack ? { ...i, qty } : i))
            .filter((i) => i.qty > 0)
        );
      },
      remove: async (id, pack) => {
        const row = items.find((i) => i.id === id && i.pack === pack);
        if (live && row?.cartItemId) {
          try {
            applyQuote(await api.removeCartItem(row.cartItemId));
            return;
          } catch (err) {
            setError(err.message);
          }
        }
        setItems((prev) => prev.filter((i) => !(i.id === id && i.pack === pack)));
      },
      applyCoupon: async (code) => {
        const next = await api.applyCoupon(code);
        applyQuote(next);
        return next;
      },
      clear: () => {
        setItems([]);
        setQuote(emptyQuote);
      },
      wishlist,
      isWished: (id) => wishlist.includes(id),
      toggleWish: (id) => {
        setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      },
      wishedProducts: wishlist.map(getProduct).filter(Boolean),
    };
  }, [items, quote, live, error, wishlist, refresh, applyQuote]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
