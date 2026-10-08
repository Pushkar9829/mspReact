/**
 * "Buy again" rail for signed-in buyers: products from their delivered orders, newest first,
 * one card per variant. Each card shows what they bought last time (pack, quantity, date, price
 * paid) and adds the same quantity in one tap — the server re-prices and re-checks stock.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, RotateCcw, ShoppingBag } from "lucide-react";
import { Button, cn, Skeleton } from "../../components/ui/index.js";
import { reorderResult, useCartActions, useCartQuery, useMyOrders, useReorder } from "../../hooks/index.js";
import { ReorderSheet } from "../../components/buying/OrderActions.jsx";
import { formatDate } from "../../../shared/lib/format.js";
import { formatExact } from "../../lib/money.js";
import { displayName, initialsOf } from "../../lib/text.js";

const TINTS = ["from-[#fbf3dc] to-[#f3e2b3] text-[#7a5600]", "from-[#e8f4ee] to-[#c9e5d6] text-[#0b5a37]", "from-[#e7eefc] to-[#cfdcf6] text-[#23468f]", "from-[#fdeee5] to-[#f6d2bb] text-[#a63c08]", "from-[#f3ecfb] to-[#e0d0f3] text-[#5b3a8c]"];
function tintFor(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Product photo, or a tinted monogram when there is none / it fails to load. */
function Thumb({ src, name, className }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  if (failed) {
    return (
      <span aria-hidden className={cn("grid place-items-center rounded-xl bg-gradient-to-br font-display text-shop-lg font-bold", tintFor(name), className)}>
        {initialsOf(name)}
      </span>
    );
  }
  return (
    <span className={cn("block overflow-hidden rounded-xl bg-shop-well ring-1 ring-black/5", className)}>
      <img
        src={src}
        alt=""
        decoding="async"
        // An image can fail before React attaches onError (e.g. a cached 404): check on mount too.
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailed(true);
        }}
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </span>
  );
}

function unitWord(qty, pack) {
  const p = String(pack || "").trim();
  return p ? `${qty} × ${p}` : `${qty} unit${qty === 1 ? "" : "s"}`;
}

function BuyAgainCard({ it, inCart, onAdd, adding }) {
  const pack = it.attributes?.packSize || it.attributes?.size || "";
  const href = it.slug ? `/product/${it.slug}?v=${it.variantId}` : null;
  const name = displayName(it.name);
  const removed = it.slug === null;

  return (
    <li className="flex w-[17.5rem] shrink-0 snap-start flex-col rounded-[1.1rem] border border-shop-line bg-shop-card p-3.5 transition-shadow duration-200 hover:shadow-[0_14px_32px_-20px_rgba(11,16,51,0.4)]">
      <div className="flex gap-3">
        {href ? (
          <Link to={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
            <Thumb src={it.image} name={it.name} className="size-[4.5rem]" />
          </Link>
        ) : (
          <Thumb src={it.image} name={it.name} className="size-[4.5rem] shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 min-h-[2.5rem] text-shop-sm font-semibold leading-5 text-shop-ink">
            {href ? (
              <Link to={href} className="hover:text-shop-primary-ink hover:underline">
                {name}
              </Link>
            ) : (
              name
            )}
          </p>
          {pack ? <span className="mt-1 inline-flex rounded-full bg-shop-page px-2 py-0.5 text-shop-xs font-medium text-shop-muted ring-1 ring-shop-line">{pack}</span> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 rounded-xl bg-shop-page px-3 py-2 text-shop-xs">
        <div className="min-w-0">
          <dt className="text-shop-subtle">Last order</dt>
          <dd className="truncate font-semibold tabular-nums text-shop-ink">{unitWord(it.qty, "")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-shop-subtle">Paid each</dt>
          <dd className="truncate font-semibold tabular-nums text-shop-ink">{it.unitPrice != null ? formatExact(it.unitPrice) : "—"}</dd>
        </div>
        <div className="col-span-2 mt-1 truncate text-shop-subtle">Delivered order of {formatDate(it.orderedAt)}</div>
      </dl>

      <div className="mt-3">
        {removed ? (
          <p className="flex min-h-10 items-center justify-center rounded-full bg-shop-well text-shop-xs font-medium text-shop-muted">No longer sold</p>
        ) : inCart ? (
          <Link
            to="/cart"
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-shop-primary-soft text-shop-sm font-semibold text-shop-primary-ink ring-1 ring-shop-primary/25 transition-colors hover:bg-shop-primary hover:text-white pointer-coarse:min-h-11"
          >
            <Check className="size-4" aria-hidden /> In cart · {inCart.qty}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={adding}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full border border-shop-primary text-shop-sm font-semibold text-shop-primary-ink transition-colors hover:bg-shop-primary hover:text-white disabled:opacity-60 pointer-coarse:min-h-11"
            aria-label={`Add ${it.qty} of ${name} to cart`}
          >
            <ShoppingBag className="size-4" aria-hidden /> Add {it.qty} to cart
          </button>
        )}
      </div>
    </li>
  );
}

export function BuyAgain() {
  const orders = useMyOrders({ status: "delivered", limit: 6 });
  const actions = useCartActions();
  const { cart } = useCartQuery();
  const reorder = useReorder();
  const [result, setResult] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const rows = orders.data?.data || [];

  const items = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of rows)
      for (const it of o.items || []) {
        const key = String(it.variantId);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...it, orderNumber: o.orderNumber, orderedAt: o.createdAt });
      }
    return out.slice(0, 12);
  }, [rows]);
  const last = rows.find((o) => o.allowedActions?.reorder !== false) || null;

  // Show arrows / edge fade only when there is more to scroll in that direction.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  const scroll = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (orders.isPending)
    return (
      <section aria-label="Buy again">
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[15.5rem] w-[17.5rem] shrink-0 rounded-[1.1rem]" />
          ))}
        </div>
      </section>
    );
  if (!items.length) return null;

  const arrow = "grid size-10 place-items-center rounded-full border border-shop-line-strong bg-shop-card text-shop-ink transition-colors hover:border-shop-primary disabled:pointer-events-none disabled:opacity-35";

  return (
    <section aria-labelledby="buy-again-h" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="buy-again-h" className="flex items-center gap-2 font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
            <RotateCcw className="size-5 text-shop-primary-ink" strokeWidth={2.2} aria-hidden />
            Buy again
          </h2>
          <p className="mt-0.5 text-shop-sm text-shop-muted">From your delivered orders. Today’s price and stock are checked when you add.</p>
        </div>
        <div className="flex items-center gap-2">
          {last ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={RotateCcw}
              loading={reorder.isPending}
              className="rounded-full"
              onClick={() => reorder.mutate(last._id || last.id, { onSettled: (res, err) => setResult(reorderResult(err || res)) })}
            >
              Reorder {last.orderNumber}
            </Button>
          ) : null}
          <Link to="/account/orders" className="inline-flex min-h-10 items-center rounded-full px-3 text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-primary-soft pointer-coarse:min-h-11">
            All orders
          </Link>
          <div className="hidden gap-1.5 md:flex">
            <button type="button" onClick={() => scroll(-1)} disabled={edges.start} className={arrow} aria-label="Scroll Buy again back">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => scroll(1)} disabled={edges.end} className={arrow} aria-label="Scroll Buy again forward">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <ul ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {items.map((it) => (
            <BuyAgainCard
              key={String(it.variantId)}
              it={it}
              inCart={cart.findLine(String(it.variantId))}
              adding={addingId === String(it.variantId) && actions.add.isPending}
              onAdd={() => {
                setAddingId(String(it.variantId));
                actions.add.mutate({ variantId: String(it.variantId), qty: it.qty, product: { name: it.name, pack: it.attributes?.packSize || "", image: it.image } });
              }}
            />
          ))}
        </ul>
        {/* edge fade hints that the row scrolls */}
        <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-shop-page to-transparent transition-opacity sm:block", edges.end && "opacity-0")} />
        <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-shop-page to-transparent transition-opacity sm:block", edges.start && "opacity-0")} />
      </div>
      <ReorderSheet result={result} open={Boolean(result)} onOpenChange={(v) => !v && setResult(null)} />
    </section>
  );
}
