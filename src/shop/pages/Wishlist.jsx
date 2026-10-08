/**
 * /account/wishlist — saved products as a tile grid. Buyers: server list (GET /wishlist: the
 * buyer's effective price — their price list, then the best live offer — plus MRP, offer and stock).
 * Guests: this device's list (merged into the account on sign-in); prices for guests are shown on
 * the product page, never from the saved snapshot.
 */
import { Link, useLocation } from "react-router-dom";
import { Heart, ShoppingCart, X } from "lucide-react";
import { useCartActions, useCartQuery, useWishlist } from "../hooks/index.js";
import { Button, EmptyState, ImageWithFallback, NotifyMeButton, Notice, PRODUCT_GRID, Price, ProductCardSkeleton, ShopPageHeader } from "../components/ui/index.js";
import { displayName } from "../lib/text.js";

function WishTile({ row, signedIn }) {
  const wish = useWishlist();
  const actions = useCartActions();
  const { cart } = useCartQuery();
  const product = { productId: row.productId, slug: row.slug, id: row.slug, name: row.name };
  const name = displayName(row.name);
  const inCart = row.variantId ? cart.findLine(row.variantId) : null;
  const available = row.available !== false;
  const href = `/product/${row.slug}${row.variantId ? `?v=${row.variantId}` : ""}`;
  const vars = actions.add.variables;
  // Match this row exactly (rows without a variant are added by slug).
  const adding = actions.add.isPending && (row.variantId ? vars?.variantId === row.variantId : !vars?.variantId && vars?.slug === row.slug);

  const moveToCart = () =>
    actions.add.mutate(
      { variantId: row.variantId || undefined, slug: row.variantId ? undefined : row.slug, qty: 1, product: { name: row.name } },
      { onSuccess: () => wish.toggle(product) }
    );

  return (
    <li className="min-w-0">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-shop-line bg-shop-card transition-[box-shadow,border-color] duration-200 hover:border-shop-line-strong hover:shadow-[0_16px_36px_-22px_rgba(11,16,51,0.45)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-shop-primary">
        <div className="relative">
          <ImageWithFallback src={row.image} alt="" fit="cover" fallbackName={name} rounded={false} imgClassName="transition-transform duration-500 group-hover:scale-[1.04]" />
          {!available ? (
            <>
              <div aria-hidden className="absolute inset-0 bg-white/45" />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-shop-well px-2 py-0.5 text-shop-xs font-semibold text-shop-text shadow-sm">Out of stock</span>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => wish.toggle(product)}
            aria-label={`Remove ${name} from wishlist`}
            className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-white/95 text-shop-text shadow-sm ring-1 ring-black/5 transition-colors hover:text-shop-danger-ink pointer-coarse:size-11"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
          <h2 className="line-clamp-2 min-h-10 text-shop-sm font-semibold leading-5 text-shop-ink sm:text-shop-base">
            <Link to={href} className="after:absolute after:inset-0 after:content-[''] hover:text-shop-primary-ink focus-visible:outline-none">
              {name}
            </Link>
          </h2>
          {row.packSize ? <p className="mt-0.5 truncate text-shop-xs text-shop-muted">{row.packSize}</p> : null}
          <div className="mt-2 min-h-[2.6rem]">
            {!available ? (
              <p className="text-shop-sm font-medium text-shop-danger-ink">Out of stock</p>
            ) : signedIn && row.price != null ? (
              <>
                <Price price={row.price} mrp={row.listPrice} size="sm" unitPrice={row.unitPricePerBaseUnit?.label ? { label: row.unitPricePerBaseUnit.label } : null} />
                {row.offer?.name ? <p className="mt-0.5 truncate text-shop-xs font-medium text-shop-saffron-ink">{row.offer.name}</p> : null}
              </>
            ) : (
              <p className="text-shop-sm font-semibold text-shop-primary-ink">See today’s price</p>
            )}
          </div>
          <div className="relative z-10 mt-auto pt-3">
            {!available ? (
              <NotifyMeButton product={product} variantId={row.variantId} size="sm" />
            ) : inCart ? (
              <Button to="/cart" variant="secondary" size="sm" block>
                In cart · {inCart.qty}
              </Button>
            ) : (
              <Button leftIcon={ShoppingCart} size="sm" block loading={adding} onClick={moveToCart}>
                Move to cart
              </Button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

export default function Wishlist() {
  const wish = useWishlist();
  const location = useLocation();
  const rows = wish.items;
  const outOfStock = rows.filter((r) => r.available === false).length;

  return (
    <div className="grid gap-5">
      <ShopPageHeader
        title="Wishlist"
        description={rows.length ? `${rows.length} saved item${rows.length === 1 ? "" : "s"}${outOfStock ? ` · ${outOfStock} out of stock` : ""}` : "Products you saved for later."}
        actions={rows.length ? <Button to="/category/all" variant="secondary">Continue shopping</Button> : null}
      />
      {!wish.signedIn && rows.length ? (
        <Notice tone="info" action={<Button variant="secondary" size="sm" to="/login" state={{ from: location.pathname }}>Sign in</Button>}>
          Saved on this device only. Sign in to keep them in your account and see your prices — we’ll merge this list for you.
        </Notice>
      ) : null}
      {wish.isPending ? (
        <div className={PRODUCT_GRID} role="status" aria-label="Loading wishlist">
          {Array.from({ length: 4 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : wish.error ? (
        <Notice tone="danger" title="We couldn’t load your wishlist" action={<Button variant="secondary" onClick={() => wish.refetch()}>Try again</Button>}>
          {wish.error.message}
        </Notice>
      ) : rows.length ? (
        <ul className={PRODUCT_GRID}>
          {rows.map((row) => (
            <WishTile key={`${row.productId || row.slug}:${row.variantId || ""}`} row={row} signedIn={wish.signedIn} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it for your next order."
          action={
            <>
              <Button to="/category/all">Browse products</Button>
              <Button to="/deals" variant="secondary">
                Today’s deals
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
