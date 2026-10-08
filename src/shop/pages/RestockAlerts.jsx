/**
 * /account/alerts — the buyer's restock alerts (GET /products/restock-alerts/mine), with current
 * stock (back-in-stock items first on the page, with a Buy button), and unsubscribe
 * (DELETE /products/restock-alerts/:id).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, BellRing, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Button, EmptyState, ImageWithFallback, Notice, RowSkeleton, ShopPageHeader, toast } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { api } from "../../shared/api/index.js";
import { useViewer } from "../hooks/index.js";
import { formatDate } from "../../shared/lib/format.js";
import { displayName } from "../lib/text.js";

const STATUS = {
  active: ["Watching", "bg-shop-info-soft text-shop-info-ink"],
  pending_confirmation: ["Confirm by email", "bg-shop-warning-soft text-shop-warning-ink"],
  notified: ["Notified", "bg-shop-primary-soft text-shop-primary-ink"],
};

function AlertRow({ alert: a, remove }) {
  const [label, tint] = STATUS[a.status] || [a.status, "bg-shop-well text-shop-text"];
  const p = a.product;
  const name = p?.name ? displayName(p.name) : "Product no longer listed";
  const busy = remove.isPending && remove.variables === a.id;
  const href = p?.slug ? `/product/${p.slug}${a.variant?.id || a.variantId ? `?v=${a.variant?.id || a.variantId}` : ""}` : null;
  return (
    <li className={cn("flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border bg-shop-card", a.inStock ? "border-shop-primary/60" : "border-shop-line")}>
      <div className="flex flex-1 gap-3 p-3 sm:p-4">
        <ImageWithFallback src={p?.image} alt="" fit="cover" fallbackName={name} className={cn("size-16 shrink-0 rounded-xl sm:size-20", !a.inStock && "opacity-80")} />
        <div className="min-w-0 flex-1">
          {href ? (
            <Link to={href} className="line-clamp-2 text-shop-sm font-semibold text-shop-ink hover:text-shop-primary-ink hover:underline sm:text-shop-base">
              {name}
            </Link>
          ) : (
            <p className="text-shop-sm font-semibold text-shop-ink">{name}</p>
          )}
          <p className="mt-0.5 text-shop-xs text-shop-muted">
            {a.variant?.packSize ? `${a.variant.packSize} · ` : "Any pack · "}
            Since {formatDate(a.createdAt)}
            {a.notifiedAt ? ` · notified ${formatDate(a.notifiedAt)}` : ""}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-shop-xs font-semibold", tint)}>{label}</span>
            {a.inStock ? (
              <span className="text-shop-xs font-semibold text-shop-primary-ink">
                In stock now
                {a.variant?.sellingPrice != null ? (
                  <>
                    {" "}
                    · <Money value={a.variant.sellingPrice} mode="listing" />
                  </>
                ) : null}
              </span>
            ) : (
              <span className="text-shop-xs text-shop-muted">Still out of stock</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-shop-line bg-shop-page/60 px-3 py-2 sm:px-4">
        <Button variant="ghost" size="sm" leftIcon={BellOff} loading={busy} onClick={() => remove.mutate(a.id)} aria-label={`Stop alerts for ${name}`} className="text-shop-muted">
          Stop alert
        </Button>
        {a.inStock && href ? (
          <Button to={href} size="sm" leftIcon={ShoppingCart} className="ml-auto">
            Buy now
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export default function RestockAlerts() {
  const { viewer } = useViewer();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const key = ["shop", "restock-alerts", viewer, page];
  const q = useQuery({ queryKey: key, queryFn: () => api.listMyRestockAlerts({ page, limit: 20 }) });
  const remove = useMutation({
    mutationFn: (id) => api.deleteRestockAlert(id),
    onSuccess: () => toast.success("Alert removed"),
    onError: (err) => toast.error(err?.message || "Could not remove the alert"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["shop", "restock-alerts", viewer] }),
  });
  const rows = q.data?.data || [];
  const meta = q.data?.meta || {};
  // Back-in-stock first (stable within each group).
  const sorted = [...rows].sort((x, y) => Number(Boolean(y.inStock)) - Number(Boolean(x.inStock)));
  const backInStock = rows.filter((a) => a.inStock).length;

  return (
    <div className="grid gap-5">
      <ShopPageHeader
        title="Restock alerts"
        description="We email you when these items are back in stock."
        meta={
          backInStock ? (
            <span className="rounded-full bg-shop-primary-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-primary-ink">
              {backInStock} back in stock{meta.pages > 1 ? " on this page" : ""}
            </span>
          ) : null
        }
      />
      {q.error ? (
        <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>Retry</Button>}>
          {q.error.message}
        </Notice>
      ) : null}
      {q.isPending ? (
        <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Loading alerts">
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : rows.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {sorted.map((a) => (
            <AlertRow key={a.id} alert={a} remove={remove} />
          ))}
        </ul>
      ) : !q.error ? (
        <EmptyState icon={BellRing} title="No restock alerts" description="On an out-of-stock product, tap “Notify me” and we’ll tell you when it is back." action={<Button to="/category/all">Browse products</Button>} />
      ) : null}
      {meta.pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between">
          <Button variant="secondary" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-shop-sm text-shop-muted">
            Page {meta.page} of {meta.pages}
          </span>
          <Button variant="secondary" rightIcon={ChevronRight} disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
