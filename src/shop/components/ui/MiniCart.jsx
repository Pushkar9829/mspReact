import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { ShopSheet } from "./Overlays.jsx";
import { Button } from "./Button.jsx";
import { CartSellerGroup } from "./Cart.jsx";
import { Money } from "./Price.jsx";
import { EmptyState } from "./Layout.jsx";
import { RowSkeleton } from "./Skeletons.jsx";
import { useCartQuery } from "../../hooks/useCart.js";
import { on } from "../../lib/events.js";

/**
 * Mini-cart drawer. Mounted once in ShopLayout; open it from anywhere with `openMiniCart()`
 * (lib/events.js) — the "Added to cart" toast does. Lines use the same optimistic stepper as the cart.
 */
export function MiniCart() {
  const [open, setOpen] = useState(false);
  const { cart, isPending } = useCartQuery({ enabled: open });
  useEffect(() => on("minicart:open", () => setOpen(true)), []);
  const t = cart.totals;
  return (
    <ShopSheet
      open={open}
      onOpenChange={setOpen}
      side="right"
      title={`Your cart${cart.count ? ` (${cart.count})` : ""}`}
      bodyClassName="bg-shop-page"
      footer={
        cart.count ? (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-shop-sm text-shop-muted">Total incl. GST{cart.raw?.hasDelivery ? " (delivery at checkout)" : ""}</span>
              <Money value={t.grandTotal} pending={cart.pending} className="text-shop-lg font-bold text-shop-ink" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" to="/cart" onClick={() => setOpen(false)}>
                View cart
              </Button>
              <Button to="/checkout" onClick={() => setOpen(false)} disabled={cart.pending || cart.hasIssues}>
                Checkout
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {isPending ? (
        <div className="grid gap-3">
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : !cart.count ? (
        <EmptyState icon={ShoppingCart} title="Your cart is empty" description="Add products and they’ll show up here." action={<Button to="/category/all" onClick={() => setOpen(false)}>Browse products</Button>} compact />
      ) : (
        <div className="grid gap-3">
          {cart.groups.map((g) => (
            <CartSellerGroup key={g.tenantId} group={g} compact />
          ))}
          {cart.unavailable.length ? <p className="text-shop-sm font-medium text-shop-danger-ink">{cart.unavailable.length} item(s) need attention in your cart.</p> : null}
        </div>
      )}
    </ShopSheet>
  );
}

export default MiniCart;
