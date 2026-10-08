import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, MessageSquareText, Star, Trash2, X, XCircle } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useUrlTableState } from "../hooks/useUrlTableState.js";
import { useApiMutation } from "../hooks/useApiMutation.js";
import { useCan } from "../context/AuthContext.jsx";
import { REVIEW_STATUSES, statusOptions } from "../lib/panel.js";
import { Alert, Badge, Button, ConfirmDialog, DataTable, DateTime, Dialog, EmptyState, FilterBar, IconButton, StatusPill, Tooltip } from "../ui/index.js";

const MOD_PERMS = ["reviews.moderate", "products.edit"];

function Stars({ value }) {
  const n = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`} title={`${n}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden className={i < n ? "size-3.5 fill-warning text-warning" : "size-3.5 text-border-strong"} />
      ))}
    </span>
  );
}

const tenantName = (r) => r.tenant?.name || r.tenantId?.name || r.product?.tenantId?.name || "";
const userIdOf = (r) => r.buyer?.id || (r.userId && typeof r.userId === "object" ? r.userId._id : r.userId) || "";
/** product is { id, name, slug, sku } in the API; older callers' productHref read `_id`. */
const productOf = (r) => (r.product ? { ...r.product, _id: r.product._id || r.product.id || r.productId } : null);
const moderationNote = (r) => r.moderation?.note || r.moderationNote || "";
const moderatedAt = (r) => r.moderation?.moderatedAt || r.moderatedAt || null;
const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }));
const VERIFIED_OPTIONS = [
  { value: "true", label: "Verified purchase" },
  { value: "false", label: "Not verified" },
];

/**
 * Review moderation queue (both panels).
 *   <ReviewModeration productHref={(p) => `/tenant/products/${p._id}`} buyerHref={(userId) => `/tenant/customers/${userId}`} />
 *   <ReviewModeration showTenant tenantId={id} tenantFilter={<TenantCombobox …/>} />            // super admin
 *
 * Props: apiClient · tenantId (X-Tenant-Id + cache scope) · scope · productHref(product) · buyerHref(userId) ·
 *        showTenant (store column; shown only when the API returns a tenant on the review or its product) ·
 *        tenantFilter (node in the toolbar) · selectable (default true when allowed: bulk hide/publish with a report).
 * URL state: ?q (text, author, product, buyer), ?status (published | hidden), ?rating (comma list), ?verified, ?productId,
 * ?userId, ?sort (createdAt | rating | moderatedAt), ?order, ?page — all applied server-side.
 */
export default function ReviewModeration({ apiClient: apiClientProp, tenantId, productHref, buyerHref, showTenant = false, tenantFilter = null, scope: scopeProp = "default", selectable = true }) {
  const can = useCan();
  const queryClient = useQueryClient();
  const apiClient = useMemo(() => apiClientProp || (tenantId ? defaultApi.withTenant(tenantId) : defaultApi), [apiClientProp, tenantId]);
  const scope = `${scopeProp}:${tenantId || "all"}`;
  const allowed = can(MOD_PERMS);
  const table = useUrlTableState({ filters: ["status", "rating", "verified", "productId", "userId"], defaults: { limit: 20 } });
  const query = table.query;
  const q = useQuery({ queryKey: keys.reviews.list({ ...query, scope }), queryFn: () => apiClient.listReviewsForModeration(query), ...listQueryOptions });
  const [action, setAction] = useState(null); // { review, kind: "hide" | "publish" | "delete" }
  const [bulk, setBulk] = useState(null); // { rows, status, clear }
  const [report, setReport] = useState(null);

  const moderate = useApiMutation(({ review, status, note }) => apiClient.moderateReview(review.id, { status, ...(note ? { note } : {}) }), {
    invalidate: [keys.reviews.all, keys.products.all],
    success: (_d, v) => (v.status === "hidden" ? "Review hidden" : "Review published"),
    error: false,
  });
  const remove = useApiMutation((review) => apiClient.deleteReview(review.id), { invalidate: [keys.reviews.all, keys.products.all], success: "Review deleted", error: false });

  async function runBulk(note) {
    const { rows, status, clear } = bulk;
    const targets = rows.filter((r) => r.status !== status);
    const results = [];
    for (const r of targets) {
      try {
        await apiClient.moderateReview(r.id, { status, ...(note ? { note } : {}) });
        results.push({ r, ok: true });
      } catch (err) {
        results.push({ r, ok: false, message: err?.message || "Failed" });
      }
    }
    await Promise.all([queryClient.invalidateQueries({ queryKey: keys.reviews.all }), queryClient.invalidateQueries({ queryKey: keys.products.all })]);
    clear?.();
    setReport({ label: status === "hidden" ? "Hide reviews" : "Publish reviews", results, skipped: rows.length - targets.length });
  }

  const rows = q.data?.data;
  const productName = rows?.find((r) => String(productOf(r)?._id) === String(table.filters.productId))?.product?.name;
  const buyerName = rows?.find((r) => String(userIdOf(r)) === String(table.filters.userId))?.buyer?.name;
  const hasTenant = showTenant && (rows || []).some((r) => tenantName(r));

  return (
    <>
      <DataTable
        storageKey={`reviews-${scopeProp}`}
        exportFilename="reviews"
        caption="Reviews"
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        getRowId={(r) => String(r.id || r._id)}
        selectable={selectable && allowed}
        bulkActions={(sel, clear) => (
          <>
            <Button size="xs" leftIcon={EyeOff} variant="danger-ghost" onClick={() => setBulk({ rows: sel, status: "hidden", clear })}>
              Hide ({sel.filter((r) => r.status !== "hidden").length})
            </Button>
            <Button size="xs" leftIcon={Eye} onClick={() => setBulk({ rows: sel, status: "published", clear })}>
              Publish ({sel.filter((r) => r.status !== "published").length})
            </Button>
          </>
        )}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Review text, author, product, SKU or buyer"
            facets={[
              { key: "status", title: "Status", options: statusOptions(REVIEW_STATUSES) },
              { key: "rating", title: "Rating", multiple: true, options: RATING_OPTIONS },
              { key: "verified", title: "Purchase", options: VERIFIED_OPTIONS },
            ]}
          >
            {tenantFilter}
            {table.filters.userId ? (
              <Button size="sm" rightIcon={X} onClick={() => table.setFilter("userId", "")} aria-label="Clear buyer filter">
                Buyer: {buyerName || "selected"}
              </Button>
            ) : null}
            {table.filters.productId ? (
              <Button size="sm" rightIcon={X} onClick={() => table.setFilter("productId", "")} aria-label="Clear product filter">
                Product: {productName || "selected"}
              </Button>
            ) : null}
          </FilterBar>
        }
        columns={[
          {
            id: "product",
            header: "Product",
            cell: (r) => {
              const product = productOf(r);
              return product ? (
                <span className="block max-w-[14rem]">
                  {productHref && product._id ? (
                    <Link to={productHref(product)} className="relative z-[1] block truncate font-medium text-fg hover:underline">
                      {product.name}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium">{product.name}</span>
                  )}
                  {product.sku ? <span className="block font-mono text-ui-2xs text-fg-subtle">{product.sku}</span> : null}
                  {product._id ? (
                    <button type="button" className="relative z-[1] text-ui-xs text-primary-soft-fg hover:underline" onClick={() => table.setFilter("productId", String(product._id))}>
                      Only this product
                    </button>
                  ) : null}
                </span>
              ) : (
                "—"
              );
            },
            csv: (r) => r.product?.name,
            mobile: "title",
          },
          hasTenant ? { id: "tenant", header: "Store", accessorFn: tenantName } : null,
          { id: "rating", header: "Rating", sortKey: "rating", cell: (r) => <Stars value={r.rating} />, csv: (r) => r.rating, mobile: "meta" },
          {
            id: "body",
            header: "Review",
            cell: (r) => {
              const note = moderationNote(r);
              return (
                <span className="block max-w-md">
                  <span className="line-clamp-3 whitespace-pre-line text-fg">{r.body || <span className="text-fg-subtle">No text</span>}</span>
                  <span className="mt-0.5 block text-ui-xs text-fg-subtle">
                    “{r.authorName || "Anonymous"}”{r.verifiedPurchase ? " · Verified purchase" : ""}
                  </span>
                  {note ? (
                    <span className="mt-0.5 flex items-center gap-1 text-ui-xs text-fg-muted">
                      <MessageSquareText aria-hidden className="size-3" /> {note}
                    </span>
                  ) : null}
                </span>
              );
            },
            csv: (r) => r.body,
            mobile: "subtitle",
          },
          {
            id: "buyer",
            header: "Buyer",
            cell: (r) => {
              const uid = userIdOf(r);
              const href = uid && buyerHref ? buyerHref(uid) : null;
              if (!r.buyer) return <span className="text-fg-subtle">—</span>;
              return (
                <span className="block max-w-[12rem]">
                  {href ? (
                    <Link to={href} className="relative z-[1] block truncate font-medium text-fg hover:underline">
                      {r.buyer.name || r.buyer.email}
                    </Link>
                  ) : (
                    <span className="block truncate">{r.buyer.name || r.buyer.email}</span>
                  )}
                  {r.buyer.email ? <span className="block truncate text-ui-xs text-fg-subtle">{r.buyer.email}</span> : null}
                  {uid && !table.filters.userId ? (
                    <button type="button" className="relative z-[1] text-ui-xs text-primary-soft-fg hover:underline" onClick={() => table.setFilter("userId", String(uid))}>
                      Only this buyer
                    </button>
                  ) : null}
                </span>
              );
            },
            csv: (r) => r.buyer?.email || "",
            mobile: "hidden",
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <span className="inline-flex flex-col items-start gap-0.5">
                <StatusPill status={r.status} domain="review" />
                {moderatedAt(r) ? (
                  <span className="text-ui-2xs text-fg-subtle">
                    moderated <DateTime value={moderatedAt(r)} />
                    {r.moderation?.moderatedBy?.name ? ` by ${r.moderation.moderatedBy.name}` : ""}
                  </span>
                ) : null}
              </span>
            ),
            csv: (r) => r.status,
            mobile: "meta",
          },
          { id: "created", header: "Posted", sortKey: "createdAt", cell: (r) => <DateTime value={r.createdAt} format="date" />, csv: (r) => r.createdAt, mobile: "meta" },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            hideable: false,
            csv: false,
            cell: (r) =>
              allowed ? (
                <span className="inline-flex gap-1">
                  {r.status === "hidden" ? (
                    <IconButton icon={Eye} size="xs" label="Publish review" onClick={() => setAction({ review: r, kind: "publish" })} />
                  ) : (
                    <IconButton icon={EyeOff} size="xs" label="Hide review" onClick={() => setAction({ review: r, kind: "hide" })} />
                  )}
                  <IconButton icon={Trash2} size="xs" label="Delete review" className="text-danger-fg" onClick={() => setAction({ review: r, kind: "delete" })} />
                </span>
              ) : (
                <Tooltip content="Requires reviews.moderate">
                  <span tabIndex={0}>
                    <Badge tone="outline">Read only</Badge>
                  </span>
                </Tooltip>
              ),
          },
        ].filter(Boolean)}
        emptyState={
          <EmptyState
            icon={Star}
            title={table.activeCount ? "No reviews match these filters" : "No reviews yet"}
            description={table.activeCount ? "Clear the filters to see every review." : "Buyer reviews of your products appear here for moderation."}
            action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : null}
          />
        }
      />

      <ConfirmDialog
        open={action?.kind === "hide" || action?.kind === "publish"}
        onOpenChange={(o) => !o && setAction(null)}
        title={action?.kind === "hide" ? "Hide this review?" : "Publish this review?"}
        description={action?.kind === "hide" ? "The review disappears from the product page and stops counting toward its rating. The buyer is not notified." : "The review becomes visible on the product page and counts toward its rating."}
        confirmLabel={action?.kind === "hide" ? "Hide review" : "Publish review"}
        tone={action?.kind === "hide" ? "danger" : "primary"}
        note={{ label: "Internal note (optional)", required: false, maxLength: 500 }}
        onConfirm={(note) => moderate.mutateAsync({ review: action.review, status: action.kind === "hide" ? "hidden" : "published", note })}
      />
      <ConfirmDialog
        open={action?.kind === "delete"}
        onOpenChange={(o) => !o && setAction(null)}
        title="Delete this review permanently?"
        description="The review is removed for good and the product rating is recalculated. Prefer hiding if you may need it later."
        confirmLabel="Delete review"
        tone="danger"
        onConfirm={() => remove.mutateAsync(action.review)}
      />
      <ConfirmDialog
        open={Boolean(bulk)}
        onOpenChange={(o) => !o && setBulk(null)}
        title={bulk ? `${bulk.status === "hidden" ? "Hide" : "Publish"} ${bulk.rows.filter((r) => r.status !== bulk.status).length} reviews?` : ""}
        description={bulk?.status === "hidden" ? "Hidden reviews disappear from product pages and stop counting toward ratings." : "Published reviews become visible and count toward ratings."}
        confirmLabel={bulk?.status === "hidden" ? "Hide reviews" : "Publish reviews"}
        tone={bulk?.status === "hidden" ? "danger" : "primary"}
        note={{ label: "Internal note for all (optional)", required: false, maxLength: 500 }}
        onConfirm={runBulk}
      >
        {bulk && bulk.rows.some((r) => r.status === bulk.status) ? <Alert tone="info">{bulk.rows.filter((r) => r.status === bulk.status).length} selected review(s) are already {bulk.status} and will be skipped.</Alert> : null}
      </ConfirmDialog>
      <Dialog open={Boolean(report)} onOpenChange={(o) => !o && setReport(null)} title={report ? `${report.label}: results` : ""} footer={<Button variant="primary" onClick={() => setReport(null)}>Done</Button>}>
        {report ? (
          <div className="grid gap-3 text-ui-sm">
            <p>
              {report.results.filter((x) => x.ok).length} updated · {report.results.filter((x) => !x.ok).length} failed · {report.skipped} skipped
            </p>
            <ul className="grid max-h-80 gap-1 overflow-y-auto">
              {report.results.map((x) => (
                <li key={x.r.id} className="flex items-start gap-2">
                  {x.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 text-success" /> : <XCircle aria-hidden className="mt-0.5 size-4 text-danger" />}
                  <span>
                    {x.r.product?.name || "Review"} · {x.r.authorName}
                    {x.ok ? "" : ` — ${x.message}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
