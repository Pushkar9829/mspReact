import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getProduct } from "../data/catalog.js";
import { api } from "../../shared/api.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";

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
      fulfillmentMode: i.fulfillmentMode || "delivery_partner",
      easyReturn: Boolean(i.easyReturn),
    }))
  );
}

function wishId(entry) {
  return typeof entry === "string" ? entry : entry?.id;
}

function wishSnapshot(product) {
  if (!product || typeof product !== "object" || !product.id) return null;
  return {
    id: product.id,
    name: product.name,
    brand: product.brand || "",
    category: product.category || "",
    image: product.image,
    price: product.price,
    mrp: product.mrp,
    weight: product.weight || "",
    rating: product.rating,
    reviews: product.reviews,
    stock: product.stock,
    deal: Boolean(product.deal),
    newLaunch: Boolean(product.newLaunch),
    bestseller: Boolean(product.bestseller),
    badge: product.badge || "",
  };
}

const emptyQuote = {
  groups: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  deliveryFee: 0,
  platformFee: 0,
  partnerFee: 0,
  couponDiscount: 0,
  grandTotal: 0,
  couponCode: "",
  deliveryPartner: null,
  deliveryPartners: [],
  deliveryPartnerChoiceEnabled: false,
  platformFeeEnabled: false,
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
    const platformFee = live ? quote.platformFee || 0 : 0;
    const partnerFee = live ? quote.partnerFee || 0 : 0;
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
      platformFee,
      partnerFee,
      deliveryPartner: quote.deliveryPartner || null,
      deliveryPartners: quote.deliveryPartners || [],
      deliveryPartnerChoiceEnabled: Boolean(quote.deliveryPartnerChoiceEnabled),
      tax,
      total,
      couponCode: quote.couponCode || "",
      refresh,
      add: async (product, qty = 1, pack, fulfillmentMode) => {
        const packSize = pack || product.weight;
        try {
          const looked = await api.lookupProduct(product.id, packSize);
          const next = await api.addCartItem({
            variantId: looked.variant._id,
            qty,
            fulfillmentMode: fulfillmentMode || product.fulfillmentMode,
          });
          applyQuote(next);
        } catch (err) {
          const message = err.message || "Could not add to cart";
          setError(message);
          throw err;
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
      isWished: (id) => wishlist.some((entry) => wishId(entry) === id),
      toggleWish: (productOrId) => {
        const id = wishId(productOrId);
        if (!id) return;
        setWishlist((prev) => {
          if (prev.some((entry) => wishId(entry) === id)) return prev.filter((entry) => wishId(entry) !== id);
          const snap = wishSnapshot(productOrId) || getProduct(id);
          return snap ? [...prev, snap] : prev;
        });
      },
      wishedProducts: wishlist.map((entry) => (typeof entry === "string" ? getProduct(entry) : entry)).filter(Boolean),
    };
  }, [items, quote, live, error, wishlist, refresh, applyQuote]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
