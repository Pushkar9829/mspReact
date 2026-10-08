/**
 * /account/credit — credit and purchase-order terms per seller (GET /ledger/me stores[]):
 * totals across sellers, spendable with a used-of-limit meter, limit, outstanding, advance, payment days; account entries per seller (IST), newest
 * first, paged with the `before` cursor (entriesMeta.nextBefore) behind "Load more".
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Store, Wallet } from "lucide-react";
import { Button, EmptyState, Notice, RowSkeleton, ShopPageHeader, Skeleton } from "../components/ui/index.js";
import { CreditMeter } from "../components/account/AccountKit.jsx";
import { displayName } from "../lib/text.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { useLedger, useViewer } from "../hooks/index.js";
import { shopKeys } from "../hooks/keys.js";
import { api } from "../../shared/api/index.js";
import { formatDateTime } from "../../shared/lib/format.js";

const KIND_LABELS = { order: "Order", payment: "Payment received", opening: "Opening balance", adjustment: "Adjustment", refund: "Refund", reversal: "Order reversed", advance: "Advance" };
const PAGE = 20;
const tenantKey = (s) => String(s?.tenantId?._id || s?.tenantId || s?.store?.id || "");

function Entries({ tenantId }) {
  const { viewer } = useViewer();
  const q = useInfiniteQuery({
    queryKey: [...shopKeys.ledger(viewer), tenantId, "entries"],
    queryFn: ({ pageParam }) => api.getLedger({ tenantId, limit: PAGE, ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.entriesMeta?.hasMore && last.entriesMeta.nextBefore ? last.entriesMeta.nextBefore : undefined),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });
  const rows = (q.data?.pages || []).flatMap((p) => p?.entries || []);
  const total = q.data?.pages?.[0]?.entriesMeta?.total;
  if (q.isPending) return <RowSkeleton />;
  if (q.error && !rows.length) return <Notice tone="danger">{q.error.message}</Notice>;
  if (!rows.length) return <p className="text-shop-sm text-shop-muted">No entries yet.</p>;
  return (
    <div className="grid gap-3">
    <ul className="divide-y divide-shop-line">
      {rows.map((e) => {
        const credit = e.type === "credit";
        return (
          <li key={e._id} className="flex items-start gap-3 py-2.5">
            <span aria-hidden className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", credit ? "bg-shop-primary-soft text-shop-primary-ink" : "bg-shop-well text-shop-text")}>
              {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1 text-shop-sm">
              <p className="font-semibold text-shop-ink">{KIND_LABELS[e.kind] || e.kind}</p>
              <p className="text-shop-xs text-shop-muted">
                {formatDateTime(e.createdAt)}
                {e.note ? ` · ${e.note}` : ""}
                {e.reference ? ` · Ref ${e.reference}` : ""}
              </p>
              {e.orderId ? (
                <Link to={`/account/orders/${e.orderId}`} className="inline-flex items-center text-shop-xs font-semibold text-shop-primary-ink hover:underline pointer-coarse:min-h-11">
                  View order
                </Link>
              ) : null}
            </div>
            <div className="shrink-0 text-right text-shop-sm">
              <p className={cn("font-semibold tabular-nums", credit ? "text-shop-primary-ink" : "text-shop-ink")}>
                <span className="sr-only">{credit ? "Credit" : "Debit"} </span>
                {credit ? "+ " : "− "}
                <Money value={e.amount} />
              </p>
              {e.balanceAfter != null ? (
                <p className="text-shop-xs text-shop-muted">
                  Available after <Money value={e.balanceAfter} />
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
      {total != null && total > rows.length ? (
        <div className="grid justify-items-center gap-2">
          <p className="text-shop-xs text-shop-muted">
            Showing {rows.length} of {total}
          </p>
          {q.hasNextPage ? (
            <Button variant="secondary" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
              Load more
            </Button>
          ) : null}
        </div>
      ) : null}
      {q.isFetchNextPageError ? <Notice tone="danger">{q.error?.message || "Could not load more entries"}</Notice> : null}
    </div>
  );
}

function TermChips({ store: s }) {
  const chips = [
    s.creditEnabled ? ["Credit terms", "bg-shop-gold-soft text-shop-gold-ink"] : null,
    s.purchaseOrderEnabled ? ["Purchase orders", "bg-shop-info-soft text-shop-info-ink"] : null,
    s.paymentDays ? [`Pay within ${s.paymentDays} days`, "bg-shop-well text-shop-text"] : null,
  ].filter(Boolean);
  if (!chips.length) return <span className="rounded-full bg-shop-well px-2.5 py-1 text-shop-xs font-semibold text-shop-muted">No credit terms enabled</span>;
  return chips.map(([label, tint]) => (
    <span key={label} className={cn("rounded-full px-2.5 py-1 text-shop-xs font-semibold", tint)}>
      {label}
    </span>
  ));
}

export default function Credit() {
  const ledger = useLedger();
  const stores = ledger.data?.stores || [];
  const [selected, setSelected] = useState("");
  const current = stores.find((s) => tenantKey(s) === selected) || stores[0];
  const totals = ledger.data || {};

  return (
    <div className="grid gap-5">
      <ShopPageHeader title="Credit and account" description="What you can spend with each seller on credit or purchase order, what is outstanding, and every entry on your account." />
      {ledger.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 rounded-[1.25rem]" />
          <RowSkeleton />
        </div>
      ) : ledger.error ? (
        <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => ledger.refetch()}>Retry</Button>}>
          {ledger.error.message}
        </Notice>
      ) : !stores.length ? (
        <EmptyState
          icon={Wallet}
          title="No seller accounts yet"
          description="When a seller gives you credit or purchase-order terms, your limit, dues and payments show here."
          action={
            <Button to="/account/support?new=1" variant="secondary">
              Ask a seller for terms
            </Button>
          }
        />
      ) : (
        <>
          {stores.length > 1 ? (
            <section aria-label="All sellers" className="grid grid-cols-2 overflow-hidden rounded-[1.25rem] bg-shop-navy text-white shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)] sm:grid-cols-3">
              {[
                ["Available to spend", totals.spendable, "text-white"],
                ["Outstanding", totals.outstanding, Number(totals.outstanding) > 0 ? "text-shop-gold" : "text-white"],
                ["Total credit limit", totals.creditLimit, "text-white"],
              ].map(([label, value, tone], i) => (
                <div key={label} className={cn("px-4 py-3 sm:px-5", i === 2 && "col-span-2 border-t border-white/10 sm:col-span-1 sm:border-0")}>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-shop-on-navy-muted">{label}</p>
                  <p className={cn("mt-0.5 font-display text-shop-lg font-bold tabular-nums", tone)}>
                    <Money value={value} />
                  </p>
                </div>
              ))}
              <p className="col-span-2 border-t border-white/10 px-4 py-2 text-shop-xs text-shop-on-navy-muted sm:col-span-3 sm:px-5">
                Across {stores.length} sellers. Credit with one seller can’t be used with another.
              </p>
            </section>
          ) : null}

          {stores.length > 1 ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Seller">
              {stores.map((s) => {
                const active = tenantKey(s) === tenantKey(current);
                return (
                  <button
                    key={tenantKey(s)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="credit-panel"
                    onClick={() => setSelected(tenantKey(s))}
                    className={cn(
                      "flex min-h-11 shrink-0 flex-col items-start justify-center rounded-2xl border px-4 py-1.5 text-left transition-colors",
                      active ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong"
                    )}
                  >
                    <span className="text-shop-sm font-semibold">{displayName(s.store?.name) || "Seller"}</span>
                    <span className={cn("text-shop-xs tabular-nums", active ? "text-shop-on-navy-muted" : "text-shop-muted")}>
                      <Money value={s.spendable} mode="listing" /> available
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {current ? (
            <div id="credit-panel" role={stores.length > 1 ? "tabpanel" : undefined} className="grid gap-5">
              <section aria-label="Credit line" className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                  <div className="min-w-0">
                    <h2 className="font-display text-shop-lg font-bold text-shop-ink">{displayName(current.store?.name) || "Seller"}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <TermChips store={current} />
                    </div>
                  </div>
                  {current.store?.slug ? (
                    <Button to={`/store/${current.store.slug}`} variant="secondary" size="sm" leftIcon={Store}>
                      Shop this seller
                    </Button>
                  ) : null}
                </div>
                <div className="px-4 py-4 sm:px-5">
                  <CreditMeter store={current} />
                </div>
                <div className="border-t border-shop-line bg-shop-page/60 px-4 py-3 text-shop-xs text-shop-muted sm:px-5">
                  “Available to spend” = credit limit − outstanding + any advance you paid.{" "}
                  {current.paymentDays ? `Each order on credit is due ${current.paymentDays} days after its invoice. ` : ""}
                  Payments you make to the seller are recorded by them and show up below.{" "}
                  <Link to="/account/support?new=1" className="font-semibold text-shop-primary-ink hover:underline">
                    Question about your account?
                  </Link>
                </div>
              </section>
              <section aria-labelledby="credit-entries-h" className="rounded-[1.25rem] border border-shop-line bg-shop-card px-4 py-4 sm:px-5">
                <h2 id="credit-entries-h" className="mb-2 font-display text-shop-md font-bold text-shop-ink">
                  Account entries
                </h2>
                <Entries tenantId={tenantKey(current)} />
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
