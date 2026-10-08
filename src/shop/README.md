# Storefront platform — guide for page authors

Everything a shop page needs lives under `src/shop`. Build pages from these pieces; don't hand-roll
fetches, money formatting, steppers or badges. Admin pages keep using `src/shared` (see
`src/shared/README.md`); the shop has its own look ("Mandi-modern") on top of the same API client.

```
shop/
  components/ui/   component library — import from "../components/ui/index.js"
  components/      shell: Header, CategoryBar (mega-menu), Footer, MobileNav, MobileMenu, ShopNotificationBell; buying/ (order actions, coupons, password field)
  hooks/           data hooks — import from "../hooks/index.js"
  context/         PincodeContext (usePincode), AccountDrawerContext
  lib/             money, units, slabs, qtyRules, cartModel, mapProduct, razorpay, indianAddress, business, storage, session, events
  layouts/         ShopLayout, AccountLayout, ShopAuthLayout
  config/legal.js  legal entity / grievance officer fallbacks (TODO placeholders — fill in)
  routes.jsx       all shop routes
```

## Design tokens (`src/shared/styles/shop-tokens.css`)

Scoped to `html.shop`, which `ShopLayout` / `ShopAuthLayout` turn on with `useShopTheme()`. Admin
panels never set it, so their theme is untouched. Light only.

| Use | Classes |
| --- | --- |
| Page / card / image well | `bg-shop-page` `bg-shop-card` `bg-shop-well` |
| Text | `text-shop-ink` (headings) `text-shop-text` (body) `text-shop-muted` `text-shop-subtle` (smallest, still AA) |
| Primary action (leaf green) | `bg-shop-primary` `hover:bg-shop-primary-hover` `bg-shop-primary-soft` `text-shop-primary-ink` |
| Header / footer only (navy) | `bg-shop-navy` `text-shop-on-navy-muted`; wrap navy areas in `.shop-on-navy` (gold focus ring) |
| Business / bulk only (gold) | `bg-shop-gold` `bg-shop-gold-soft` `text-shop-gold-ink` |
| Deals / urgency only (saffron) | `bg-shop-deal` (white text, AA) `bg-shop-saffron-soft` `text-shop-saffron-ink` |
| Lines | `border-shop-line` `border-shop-line-strong` |
| Status | `bg-shop-danger-soft text-shop-danger-ink`, `-warning-`, `-info-` |
| Type scale | `text-shop-xs` 12 · `-sm` 13 · `-base` 14 · `-md` 16 · `-lg` 18 · `-xl` 22 · `-2xl` 28 · `-3xl` 36 |
| Fonts | `font-display` (Plus Jakarta Sans 600–700, headings) · body/UI is Inter · `tabular-nums` for money |
| Radius | `rounded-card` 12 · `rounded-control` 10 · `rounded-well` 8 · `rounded-full` pills |
| Elevation | flat; `hover:shadow-shop-hover`; `shadow-shop-pop` for popovers/sheets. No translate-on-hover. |

- One focus ring everywhere (2px leaf green, gold on navy). Never remove it.
- One kicker per page at most. Weight 600–700 (legacy `font-extrabold` is capped at 700).
- Legacy `*-msr-*` classes are re-pointed at these tokens, so old pages already look right; don't use them in new code.
- Use `cn()` from `components/ui/cn.js` (it knows the shop scale, so `text-shop-sm text-shop-ink` keeps both).
- Tap targets ≥ 44 px on touch (buttons default to `h-11`; `size="sm"` and dense controls add `pointer-coarse:h-11` / `min-h-11`).
- Text sizes only from the shop scale: no `text-[11px]`-style values (12 px `text-shop-xs` is the floor).

## Components (`components/ui/index.js`)

| Component | Notes |
| --- | --- |
| `Button`, `IconButton`, `buttonClass` | variants `primary` `secondary` `outline` `ghost` `gold` `danger` `navy` `on-navy` `link`; sizes `sm` `md` `lg` `icon`; `to` renders a Link; `loading`, `leftIcon` |
| `Badge` | `tone="neutral" \| "deal" \| "business"`, `soft`. One badge per card. |
| `Price`, `Money` | see Money rules. `<Price price mrp unitPrice taxRate showGst mode size pending />` |
| `QtyStepper` | `<QtyStepper value rules={line.rules} onChange lineTotal pending />` — 44 px, typed entry snapped to the server rules, inline hint, debounced commit (rapid taps → one request) |
| `SlabTable`, `SlabHint` | `<SlabTable slabs={v.slabs} qty pack basePrice />` highlights the active slab; `<SlabHint slabs qty next={line.nextSlab} />` → "Add 6 more for ₹391 each" / "₹391 at 50+" |
| `ProductCard` | `<ProductCard product={p} variant="grid" \| "list" bulk? priority? />` — packshot well, ≤1 badge, rating only with reviews, seller line, slab hint, inline stepper once in cart, "Notify me" when out of stock. Pair with `PRODUCT_GRID` / `ProductGridSkeleton` |
| `ImageWithFallback`, `BrandMonogram`, `CategoryTile` | fixed 1:1 well, lazy, skeleton, icon fallback; monogram until real logos |
| `SellerBadge`, `SellerCard`, `StoreTile` | "Sold by …"; card adds pickup city / zone ETAs; `StoreTile` is one row of the public store directory (`usePublicStores`) |
| `NotifyMeButton`, `useRestockAlert` | restock alert (guests give an email; 202 = confirm via email) |
| `PincodeCheck` | `variant="header"` (already in the header) or `variant="inline" product={p}` on the PDP (ETA, fee, COD from `/products/:slug/serviceability`) |
| `SearchCombobox` | already in the header; WAI-ARIA combobox, products/brands/categories/recent/popular, keeps the category scope. It records searches — pages must not. |
| `FilterPanel`, `FilterSheet`, `FilterChips`, `SortSelect` | all driven by `useShopFilters()` (URL) |
| `CartSellerGroup`, `CartLine`, `FreeDeliveryProgress`, `FulfillmentToggle` | cart grouped by seller, optimistic steppers, server totals |
| `CheckoutStep`, `PaymentOption`, `CreditTermsPanel`, `PAYMENT_GROUPS` | accordion steps; payment rows from `/checkout/payment-options` (disabled methods keep their reason) |
| `AddressCard`, `AddressForm`, `toAddressBody` | the only address form: +91 mobile, 6-digit PIN (state suggested from PIN), state dropdown, optional GSTIN (check digit) — GSTIN/business name are returned separately for the profile. `state` is normalised with `normalizeState(state, stateCode)` (lib/indianAddress.js), so API rows (`state` + `stateCode`) and old two-letter values both land on the dropdown |
| `TrustBar`, `trustFacts` | the single source of trust copy, from public settings only |
| `MiniCart`, `openMiniCart()` | mounted in ShopLayout; the "Added" toast opens it |
| `Skeleton`, `ProductCardSkeleton`, `RowSkeleton`, `PdpSkeleton`, `PageSkeleton`, `RouteSkeleton` | lazy routes already fall back to `RouteSkeleton` |
| `EmptyState`, `Notice`, `Card`, `Breadcrumbs`, `ShopPageHeader`, `SectionHeading` | `ShopPageHeader` sets the document title |
| `Tabs`/`TabPanel` (Radix, `urlParam`), `ShopSheet` (bottom sheet on phones), `Dialog`, `ConfirmDialog`, `Sheet` | |
| `Field`, `Input` (`prefix`), `Select` (native), `Textarea`, `Checkbox`, `Radio` | `Field` wires label/hint/error (`error` may be an `ApiError` + `name`) |
| `toast` | sonner, mounted once at the root |

## Data hooks (`hooks/index.js`)

Query keys: `keys.shop.*` (from `hooks/keys.js`, which also re-exports the shared `keys`). Anything
viewer-dependent (prices from buyer price lists, cart, wishlist, coupons) is keyed by `viewer`
(user id or `"guest"`); the cache is cleared on login/logout.

```jsx
// Catalog
const { data: cats } = useCategories();     // { roots[{…, children}], list, bySlug, byId, pathOf(slug) }
const { data: brands } = useBrands();
const { data: settings } = usePublicSettings();   // codEnabled, freeDeliveryAbove, returnWindowDays, delivery, taxInclusive, feeTaxRate…
const { product, isPending, error } = useProduct(slug);   // lookup: variants (stock, rules, slabs), store, returns, delivery
const s = useProductSearch({ ...f.filters, facets: true }, { pageSize: 24 });
// s.products s.total s.facets { brands[{id,name,slug,count}], priceRange } s.fetchNextPage s.hasNextPage
// s.meta.didYouMean / s.meta.matchedBy ("text" | "synonym" | "fuzzy"): the API corrects typos itself
const stores = usePublicStores({ q, sort: "products", page, limit });   // GET /tenants/public → data.stores, data.meta
const rail = useProducts({ tag: "deal" }, { limit: 12 });

// Listing filters in the URL
const f = useShopFilters({ category: slug });  // f.filters f.set f.setMany f.toggle f.reset f.chips f.removeChip f.activeCount
// Writes chain within one tick (two toggles, min + max price), so none is lost.

// Cart (one query + serialized, optimistic mutations)
const { cart } = useCartQuery();   // cart.groups[].items, cart.lines, cart.totals, cart.pending, cart.findLine(variantId)
const a = useCartActions();
a.add.mutate({ variantId, qty: 1, product });                 // bulk screens: { mode: "bulk", qty: rules.bulkFrom }
a.setQty.mutate({ cartItemId, qty });                          // 0 removes
a.setMode.mutate({ cartItemId, fulfillmentMode: "store_pickup" });
a.applyCoupon.mutate("WELCOME10"); a.removeCoupon.mutate();
const coupons = useCartCoupons({ tenantId });                  // works with an empty cart / guests
const reorder = useReorder();                                  // Buy again → quote goes straight into the cart cache
reorder.mutate(orderId, { onSettled: (res, err) => setResult(reorderResult(err || res)) });
// → { added, adjusted (qty fitted to pack/stock rules, with reason), skipped, error }; 409 REORDER_UNAVAILABLE
// carries the same lists. Show it with <ReorderSheet result> (components/buying/OrderActions.jsx).

// Wishlist (server for buyers, device for guests; merged on sign-in)
const wish = useWishlist();  wish.has(product); wish.toggle(product, variantId);

// Checkout
const co = useCheckout({ addressId, deliveryPartnerId });
co.preview.data            // server totals for this address — render only these
co.paymentOptions.data     // { methods[{ method, label, enabled, reason, requiresPoNumber }], groups[{ store, credit }], defaultMethod }
const r = await co.place({ paymentMethod, poNumber, buyerNotes });   // own busy guard; idempotency key per cart in sessionStorage
// r.status "placed" (r.orders, r.payment.status "paid"|"pending"|"dismissed"|"failed"|"unavailable") | "error" (r.error) | "busy"
const ledger = useLedger();  // /ledger/me: outstanding, available, advance, spendable, stores[]

// Orders
useMyOrders({ status, page }) /* rows carry allowedActions: no per-row detail fetch */; useMyOrder(id); useOrderActions(id); useOrderTracking(id)
// Order lines carry `slug` (null when the product is gone) and `image` for links and thumbnails.
// Credit notes: api.downloadCreditNotePdf(orderId, noteId). Ledger entries page with `before` (entriesMeta.nextBefore).

// Addresses, notifications, pincode
useAddresses(); useAddressActions();
useUnreadCount(); useNotificationList(); useNotificationActions(); useNotificationPreferences();
const { pincode, setPincode, serviceability } = usePincode();  const eta = usePincodeEta(product);
```

## Money rules

- Render only server fields: quote/preview/order totals, line `unitPrice`, `lineTotal`, `fees`,
  `productTax`, `feeTax`, catalog `sellingPrice`/`listPrice`, `unitPricePerBaseUnit`, slab prices.
  Never add up, split GST, or compute fees/slabs on the client.
- While an optimistic cart change is in flight, `line.pending` / `cart.pending` is true: pass
  `pending` to `<Price>`/`<Money>` (renders a skeleton, never a stale amount). Disable "Checkout"
  while `cart.pending`.
- Listings: `formatListing` (₹42, real paise kept). Cart/checkout/invoices: `formatExact` (₹42.00).
  `null` renders "—", never ₹0.
- Unit price: use `variant.unitPrice.label` / `line.unitPricePerBaseUnit.label` ("₹180/kg").
- `expectedGrandTotal` at checkout is the preview total on screen (`useCheckout` does this).

## Quantities

The cart has one line per variant; bulk pricing is derived from qty. Pass the server `rules`
(`line.rules`, `variant.rules`) to `<QtyStepper rules>`: below `bulkFrom` it steps by 1, from
`bulkFrom` by the pack multiple, capped at the order max. Bulk screens add with
`{ mode: "bulk", qty: rules.bulkFrom }`.

## Routing (`routes.jsx`)

| Path | Page |
| --- | --- |
| `/` `/category/:slug` (`all` = everything, sub-categories included) `/product/:slug` | Home, listing, PDP (old SKU links redirect to the slug) |
| `/cart` `/checkout` (signed in) `/order/:id` | cart, checkout, confirmation |
| `/account` `/account/orders` `/account/orders/:id` `/account/addresses` `/account/wishlist` `/account/coupons` `/account/notifications` `/account/support` `/account/help` | account (AccountLayout) |
| `/deals` `/new` `/brands` `/stores` `/store/:slug` `/bulk` `/help` `/legal` `/pages/:slug` (CMS) | content (`/pages/returns` follows the API's `aliasOf` to `/pages/refunds`) |
| `/restock/confirm?token=` `/unsubscribe?token=` `/verify-email?token=` `/reset-password?token=` | email links |
| `/orders/:id` → `/account/orders/:id`, `/search?q=` → `/category/all?q=`, `/privacy` `/terms` → `/pages/…` | redirects |
| `/login` (shop-styled when not coming from a panel) `/register` `/forgot-password` | ShopAuthLayout |

- Pages render inside `ShopLayout` (`<main id="main">`); don't add another header/footer.
- The bottom nav is hidden on `/cart` and `/checkout`; put sticky mobile CTAs there with
  `fixed inset-x-0 bottom-0` and `pb-[env(safe-area-inset-bottom)]`. Elsewhere the layout pads the
  page (`shop-bottom-safe`).
- Signing in from the shop: SignInPage snapshots the guest cart, signs in (server merges), writes the
  merged quote to the cache, merges the guest wishlist and shows "Your business prices are applied"
  when prices changed. Send people to `/login` with `state={{ from: location.pathname }}`.

## Example: listing page

```jsx
import { useParams } from "react-router-dom";
import { useCategories, useBrands, useProductSearch, useShopFilters } from "../hooks/index.js";
import { ShopPageHeader, FilterPanel, FilterSheet, FilterChips, SortSelect, ProductCard, ProductGridSkeleton, PRODUCT_GRID, EmptyState, Button } from "../components/ui/index.js";

export default function Category() {
  const { slug = "all" } = useParams();
  const f = useShopFilters({ category: slug });
  const cats = useCategories();
  const brands = useBrands();
  const s = useProductSearch({ ...f.filters, facets: true });
  const node = cats.data?.bySlug.get(slug);
  return (
    <div className="msr-gutter grid gap-5 py-6">
      <ShopPageHeader title={f.filters.q ? `Results for “${f.filters.q}”` : node?.name || "All products"}
        breadcrumbs={[{ label: "Home", to: "/" }, ...(cats.data?.pathOf(slug) || []).map((c) => ({ label: c.name, to: `/category/${c.slug}` }))]} />
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block"><div className="sticky top-36"><FilterPanel f={f} categories={cats.data} brands={brands.data} facets={s.facets} /></div></aside>
        <section className="grid content-start gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-shop-sm text-shop-muted">{s.total ?? "…"} products</p>
            <div className="flex gap-2"><FilterSheet className="lg:hidden" f={f} total={s.total} categories={cats.data} brands={brands.data} facets={s.facets} /><SortSelect f={f} /></div>
          </div>
          <FilterChips f={f} />
          {s.isPending ? <ProductGridSkeleton /> : s.products.length ? (
            <div className={PRODUCT_GRID}>{s.products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}</div>
          ) : <EmptyState title="No products match" action={<Button variant="secondary" onClick={f.reset}>Clear filters</Button>} />}
          {s.hasNextPage ? <Button variant="secondary" loading={s.isFetchingNextPage} onClick={() => s.fetchNextPage()}>Show more</Button> : null}
        </section>
      </div>
    </div>
  );
}
```

## Example: cart line group + summary

```jsx
const { cart, isPending } = useCartQuery();
{cart.groups.map((g) => <CartSellerGroup key={g.tenantId} group={g} />)}
<TotalsList t={cart.totals} couponCode={cart.couponCode} pending={cart.pending} />   // components/buying/orderUi.jsx
```

## Legal / compliance

`config/legal.js` holds the legal entity, registered address, customer care, GSTIN and grievance
officer used by the footer and `/pages/grievance`. Public settings override it when they carry
these fields. The values are `[placeholders]` (outlined in dev) — the business owner must fill them.
