import { memo } from "react";
import { Link } from "react-router-dom";
import { Boxes, Heart, Plus, Star } from "lucide-react";
import { cn } from "./cn.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { ImageWithFallback } from "./Media.jsx";
import { Price } from "./Price.jsx";
import { QtyStepper } from "./QtyStepper.jsx";
import { SellerBadge } from "./Seller.jsx";
import { SlabHint } from "./Slabs.jsx";
import { NotifyMeButton } from "./RestockNotify.jsx";
import { useCartActions, useCartQuery } from "../../hooks/useCart.js";
import { useWishlist } from "../../hooks/useWishlist.js";
import { usePrefetchProduct } from "../../hooks/useCatalog.js";
import { bestSlab, sortSlabs } from "../../lib/slabs.js";
import { formatListing } from "../../lib/money.js";
import { displayName } from "../../lib/text.js";

/** The one badge a card may show, in priority order. */
function cardBadge(product, variant) {
  if (variant?.inStock === false || product.inStock === false) return { tone: "neutral", label: "Out of stock" };
  if (variant?.discountPct >= 5) return { tone: "deal", label: `${variant.discountPct}% off` };
  if (product.wholesale?.bulkEligible && variant?.slabs?.length) return { tone: "business", label: "Bulk price" };
  if (product.flags?.newLaunch) return { tone: "neutral", label: "New" };
  return null;
}

/** Real rating only (never a placeholder): "★ 4.3 (12)". */
function RatingInline({ value, count }) {
  if (!(count > 0) || !(value > 0)) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-shop-xs font-semibold text-shop-ink" aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} review${count === 1 ? "" : "s"}`}>
      <Star className="size-3 fill-shop-gold text-shop-gold" aria-hidden />
      {value.toFixed(1)}
      <span className="font-normal text-shop-subtle">({count})</span>
    </span>
  );
}

/**
 * One line under the price that tells a business buyer how to save:
 *   in cart and a better slab is close → "Add 49 more for ₹198 each"
 *   otherwise, bulk slabs exist        → "₹102 each at 200+"
 * Always rendered (empty when there is nothing to say) so cards in a row stay aligned.
 */
function SaveLine({ product, variant, line }) {
  let body = null;
  if (line && product.wholesale?.bulkEligible) body = <SlabHint slabs={variant?.slabs} qty={line.qty} next={line.nextSlab} compact className="block truncate whitespace-nowrap" />;
  if (!body && product.wholesale?.bulkEligible) {
    const best = bestSlab(sortSlabs(variant?.slabs || []));
    if (best && best.unitPrice < (variant?.price ?? Infinity))
      body = (
        <p className="inline-flex items-center gap-1 text-shop-xs font-medium text-shop-gold-ink">
          <Boxes className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate tabular-nums">
            {formatListing(best.unitPrice)} each at {best.minQty}+
          </span>
        </p>
      );
  }
  return <div className="h-5 overflow-hidden">{body}</div>;
}

/**
 * Product card (grid or dense list row).
 *
 *   <ProductCard product={p} />                 // grid
 *   <ProductCard product={p} variant="list" />  // list row with stepper
 *
 * Grid layout has fixed rows so every card in a rail/grid lines up:
 *   photo (1:1, fills the frame; tinted monogram when missing) · brand + rating · name (2 lines) ·
 *   pack · price + MRP + unit price · save line · seller · full-width action.
 * - Not in cart: "Add to cart" (bulk rails: "Add 10 packs"). In cart: full-width −/+ stepper.
 *   Out of stock: Notify me.
 * - `bulk` (bulk screens): the first add starts at the bulk quantity (`rules.bulkFrom`, mode "bulk").
 *   The cart has one line per variant; the server derives bulk pricing from the qty.
 */
export const ProductCard = memo(function ProductCard({ product, variant = "grid", bulk = false, priority = false, showSeller = true, className }) {
  const { cart } = useCartQuery();
  const actions = useCartActions();
  const wish = useWishlist();
  const prefetch = usePrefetchProduct();
  if (!product) return null;

  const v = product.defaultVariant;
  const line = v ? cart.findLine(v.id) : null;
  const href = `/product/${product.slug}`;
  const wished = wish.has(product);
  const badge = cardBadge(product, v);
  const dealBadge = badge?.tone === "deal"; // the price then skips its own "% off" text
  const outOfStock = v?.inStock === false || product.inStock === false;
  const rules = v?.rules || product.rules || null;
  const bulkFrom = rules?.bulkEligible ? rules.bulkFrom || rules.bulk?.min || 1 : null;
  const isBulk = Boolean(bulk && bulkFrom && bulkFrom > 1);
  const firstQty = isBulk ? bulkFrom : 1;
  const name = displayName(product.name);
  const brand = product.brand ? displayName(product.brand) : "";
  const list = variant === "list";

  const add = () =>
    actions.add.mutate({
      variantId: v?.id,
      slug: v ? undefined : product.slug,
      qty: firstQty,
      ...(isBulk ? { mode: "bulk" } : {}),
      product: { ...product, pack: v?.pack, price: v?.price, mrp: v?.mrp },
    });

  const action = outOfStock ? (
    <NotifyMeButton product={product} variantId={v?.id} size={list ? "sm" : "md"} block={!list} />
  ) : line ? (
    <QtyStepper
      value={line.qty}
      rules={line.rules || rules}
      disabled={!line.cartItemId || line.cartItemId.startsWith("pending")}
      onChange={(qty) => actions.setQty.mutate({ cartItemId: line.cartItemId, qty })}
      label={`Quantity of ${name}`}
      size={list ? "sm" : "md"}
      block={!list}
      showHint={list}
    />
  ) : (
    <Button
      variant="outline"
      size={list ? "sm" : "md"}
      block={!list}
      leftIcon={Plus}
      onClick={add}
      disabled={!v && !product.slug}
      className={list ? undefined : "rounded-full"}
      aria-label={isBulk ? `Add ${firstQty} packs of ${name} to cart` : `Add ${name} to cart`}
    >
      {isBulk ? `Add ${firstQty} packs` : list ? "Add" : "Add to cart"}
    </Button>
  );

  const heart = (
    <button
      type="button"
      onClick={() => wish.toggle(product, v?.id)}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors pointer-coarse:size-11",
        wished ? "text-shop-danger" : "text-shop-muted hover:text-shop-danger"
      )}
      aria-label={wished ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      aria-pressed={wished}
    >
      <Heart className={cn("size-[18px]", wished && "fill-current")} strokeWidth={1.75} aria-hidden />
    </button>
  );

  const titleLink = (
    <Link to={href} className="after:absolute after:inset-0 after:content-[''] hover:text-shop-primary-ink focus-visible:outline-none" onMouseEnter={() => prefetch(product.slug)} onFocus={() => prefetch(product.slug)}>
      {name}
    </Link>
  );
  const packLine = (
    <p className="truncate text-shop-xs text-shop-muted">
      {v?.pack || " "}
      {product.variants.length > 1 ? <span className="text-shop-subtle"> · {product.variants.length} sizes</span> : null}
    </p>
  );

  if (list) {
    return (
      <article className={cn("group relative flex gap-3 rounded-[1rem] border border-shop-line bg-shop-card p-3 transition-shadow hover:shadow-shop-hover has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-shop-primary", className)}>
        <ImageWithFallback src={product.image} alt="" fit="cover" fallbackName={name} className="size-24 shrink-0 rounded-xl sm:size-28" priority={priority} />
        <div className="grid min-w-0 flex-1 content-start gap-0.5">
          <div className="flex items-center gap-2">
            {brand ? <p className="truncate text-shop-xs font-medium uppercase tracking-wide text-shop-subtle">{brand}</p> : null}
            <RatingInline value={product.ratingAvg} count={product.ratingCount} />
          </div>
          <h3 className="line-clamp-2 text-shop-base font-semibold leading-5 text-shop-ink">{titleLink}</h3>
          {packLine}
          {showSeller ? <SellerBadge seller={product.seller} /> : null}
          <SaveLine product={product} variant={v} line={line} />
        </div>
        <div className="relative z-10 flex shrink-0 flex-col items-end justify-between gap-2">
          <Price price={v?.price} mrp={v?.mrp} unitPrice={v?.unitPrice} showDiscount={!dealBadge} align="end" />
          {badge ? <Badge tone={badge.tone} soft>{badge.label}</Badge> : null}
          {action}
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-shop-line bg-shop-card transition-[box-shadow,border-color] duration-200 hover:border-shop-line-strong hover:shadow-[0_16px_36px_-22px_rgba(11,16,51,0.45)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-shop-primary",
        className
      )}
    >
      <div className="relative">
        <ImageWithFallback
          src={product.image}
          alt=""
          fit="cover"
          fallbackName={name}
          rounded={false}
          priority={priority}
          sizes="(min-width:1280px) 240px, (min-width:768px) 30vw, 45vw"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {badge ? (
          <Badge tone={badge.tone} className="absolute left-2.5 top-2.5 shadow-sm">
            {badge.label}
          </Badge>
        ) : null}
        <div className="absolute right-2 top-2 z-10">{heart}</div>
        {outOfStock ? <div aria-hidden className="absolute inset-0 bg-white/45" /> : null}
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <div className="flex h-4 items-center justify-between gap-2">
          <p className="truncate text-shop-xs font-medium uppercase tracking-wide text-shop-subtle">{brand || " "}</p>
          <RatingInline value={product.ratingAvg} count={product.ratingCount} />
        </div>
        <h3 className="mt-1 line-clamp-2 h-10 text-shop-sm font-semibold leading-5 text-shop-ink sm:text-shop-base">{titleLink}</h3>
        <div className="mt-0.5">{packLine}</div>

        <Price price={v?.price} mrp={v?.mrp} unitPrice={v?.unitPrice} showDiscount={!dealBadge} className="mt-2 min-h-[2.6rem]" />
        <SaveLine product={product} variant={v} line={line} />
        {showSeller ? <SellerBadge seller={product.seller} className="mt-0.5 h-4" /> : null}

        <div className="relative z-10 mt-auto pt-3">{action}</div>
      </div>
    </article>
  );
});

export default ProductCard;
