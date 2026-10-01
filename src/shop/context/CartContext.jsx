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

function lineFromQuote(i) {
  return {
    id: i.slug || String(i.sku || "").toLowerCase(),
    cartItemId: i.cartItemId,
    variantId: i.variantId,
    name: i.name,
    image: i.image,
    pack: i.pack || i.attributes?.packSize || i.attributes?.size || "",
    qty: i.qty,
    price: i.unitPrice ?? 0,
    basePrice: i.baseUnitPrice ?? i.unitPrice ?? 0,
    mrp: i.listPrice ?? i.unitPrice ?? 0,
    lineSubtotal: i.lineSubtotal ?? (i.unitPrice || 0) * i.qty,
    couponShare: i.couponShare || 0,
    taxRate: i.taxRate || 0,
    taxableValue: i.taxableValue ?? 0,
    tax: i.tax ?? 0,
    lineTotal: i.lineTotal ?? 0,
    fulfillmentMode: i.fulfillmentMode || "delivery_partner",
    easyReturn: Boolean(i.easyReturn),
    wholesale: i.wholesale || {},
    tierPrices: i.tierPrices || [],
    moq: i.wholesale?.moq || 1,
    orderLimit: i.wholesale?.maxQty ?? null,
    packMultiple: i.wholesale?.packMultiple || 1,
    bulk: Boolean(i.bulk),
    bulkEligible: Boolean(i.bulk),
    issue: i.issue || "",
  };
}

function flattenQuote(quote) {
  if (!quote?.groups) return [];
  return [
    ...quote.groups.flatMap((g) => (g.items || []).map(lineFromQuote)),
    ...(quote.unavailable || []).map(lineFromQuote),
  ];
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
  hasBulk: false,
  unavailable: [],
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
    const buyable = items.filter((i) => !i.issue);
    const count = items.reduce((n, i) => n + i.qty, 0);
    const mrp = buyable.reduce((n, i) => n + (i.mrp || i.price) * i.qty, 0);
    const subtotal = live ? quote.subtotal : buyable.reduce((n, i) => n + i.price * i.qty, 0);
    const discount = live ? quote.couponDiscount || 0 : 0;
    // The cart quote has no address, so the zone delivery fee is only known at checkout.
    const delivery = live ? quote.deliveryFee || 0 : 0;
    const platformFee = live ? quote.platformFee || 0 : 0;
    const partnerFee = live ? quote.partnerFee || 0 : 0;
    const tax = live ? quote.tax : 0;
    const total = live ? quote.grandTotal : subtotal;

    async function recover(err) {
      setError(err.message || "Could not update cart");
      if (live) {
        try {
          const next = await api.getCart();
          setQuote(next || emptyQuote);
          setItems(flattenQuote(next));
        } catch {
          /* keep the last good cart */
        }
      }
    }

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
      hasBulk: Boolean(quote.hasBulk) || items.some((i) => i.bulk),
      /** Cart line for a product pack; bulk and regular lines of the same pack are separate. */
      findLine: (id, pack, bulk = false) =>
        items.find((i) => i.id === id && i.pack === pack && Boolean(i.bulk) === Boolean(bulk)),
      hasIssues: items.some((i) => i.issue),
      clearError: () => setError(""),
      refresh,
      add: async (product, qty = 1, pack, fulfillmentMode, { bulk = false } = {}) => {
        const packSize = pack || product.weight;
        try {
          let variantId = product.packPrices?.find((row) => row.pack === packSize)?.variantId;
          if (!variantId) {
            const looked = await api.lookupProduct(product.id, packSize);
            variantId = looked.variant._id;
          }
          const next = await api.addCartItem({
            variantId,
            qty,
            fulfillmentMode: fulfillmentMode || product.fulfillmentMode,
            bulk: Boolean(bulk),
          });
          applyQuote(next);
        } catch (err) {
          setError(err.message || "Could not add to cart");
          throw err;
        }
      },
      setQty: async (id, pack, qty, bulk = false) => {
        const match = (i) => i.id === id && i.pack === pack && Boolean(i.bulk) === Boolean(bulk);
        const row = items.find(match);
        if (live && row?.cartItemId) {
          try {
            if (qty < 1) applyQuote(await api.removeCartItem(row.cartItemId));
            else applyQuote(await api.updateCartItem(row.cartItemId, qty));
          } catch (err) {
            await recover(err);
            throw err;
          }
          return;
        }
        setItems((prev) =>
          prev
            .map((i) => (match(i) ? { ...i, qty } : i))
            .filter((i) => i.qty > 0)
        );
      },
      remove: async (id, pack, bulk = false) => {
        const match = (i) => i.id === id && i.pack === pack && Boolean(i.bulk) === Boolean(bulk);
        const row = items.find(match);
        if (live && row?.cartItemId) {
          try {
            applyQuote(await api.removeCartItem(row.cartItemId));
          } catch (err) {
            await recover(err);
            throw err;
          }
          return;
        }
        setItems((prev) => prev.filter((i) => !match(i)));
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
