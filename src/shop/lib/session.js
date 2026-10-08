/**
 * Storefront session glue: what happens to cart / wishlist when a buyer signs in or out.
 *
 * Sign in (SignInPage, when coming from the shop):
 *   const before = snapshotGuestCart();
 *   const session = await login(email, password);   // AuthContext merges the guest cart server-side
 *   await afterShopLogin(session, before);           // cart cache = merged server quote, wishlist merged,
 *   navigate(from);                                  // "business prices applied" notice if prices changed
 *
 * Sign out: installShopSessionHooks() clears the guest wishlist, the legacy cart mirror and the guest
 * cart key, so the next visitor on this device starts empty.
 */
import { toast } from "sonner";
import { api, onSessionEnd } from "../../shared/api/index.js";
import { queryClient } from "../../shared/api/queryClient.js";
import { shopKeys } from "../hooks/keys.js";
import { mergeGuestWishlist, clearGuestWishlist } from "../hooks/useWishlist.js";
import { viewCart } from "./cartModel.js";
import { STORAGE, removeKey } from "./storage.js";
import { formatExact } from "./money.js";

export function snapshotGuestCart() {
  return queryClient.getQueryData(shopKeys.cart("guest")) || null;
}

/** Lines whose unit price changed between the guest quote and the signed-in quote. */
export function priceChanges(beforeRaw, afterRaw) {
  if (!beforeRaw || !afterRaw) return [];
  const before = viewCart(beforeRaw);
  const after = viewCart(afterRaw);
  const out = [];
  for (const line of after.lines) {
    const old = before.findLine(line.variantId, line.bulk);
    if (old && old.unitPrice != null && line.unitPrice != null && Number(old.unitPrice) !== Number(line.unitPrice)) {
      out.push({ name: line.name, pack: line.pack, from: old.unitPrice, to: line.unitPrice });
    }
  }
  return out;
}

export async function afterShopLogin(session, before) {
  if (!session?.id) return { changes: [] };
  // AuthContext.login() already merged the guest cart and cached the merged quote (`cartQuote`).
  let quote = session.cartQuote || null;
  if (!quote) {
    try {
      quote = await api.getCart();
      queryClient.setQueryData(shopKeys.cart(String(session.id)), quote);
    } catch {
      /* the cart page will load it */
    }
  }
  try {
    const { merged } = await mergeGuestWishlist();
    if (merged) queryClient.invalidateQueries({ queryKey: shopKeys.wishlist(String(session.id)) });
  } catch {
    /* ignore */
  }
  const changes = priceChanges(before, quote);
  if (changes.length) {
    const lower = changes.filter((c) => c.to < c.from).length;
    toast.info("Your business prices are applied", {
      description:
        changes.length === 1
          ? `${changes[0].name}: ${formatExact(changes[0].from)} → ${formatExact(changes[0].to)} per pack.`
          : `${changes.length} items in your cart now show your account’s prices${lower ? ` (${lower} lower)` : ""}.`,
      duration: 8000,
    });
  }
  return { changes, quote };
}

let installed = false;
/** Idempotent. Clears per-device shop data whenever the session ends (logout, revoked, expired). */
export function installShopSessionHooks() {
  if (installed) return;
  installed = true;
  onSessionEnd(() => {
    clearGuestWishlist();
    removeKey(STORAGE.cart);
    removeKey(STORAGE.guest);
  });
}
