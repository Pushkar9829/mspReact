import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, MessageSquareText, MoreHorizontal, Trash2, X } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useInvalidate } from "../../shared/hooks/useApiMutation.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { REVIEW_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DateTime,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  PageHeader,
  RelativeTime,
  StatusPill,
  toast,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, useTenantScope } from "./lib/tenantScope.jsx";
import { BulkResultDialog, Stars, runBulk } from "./lib/catalogShared.jsx";

const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }));
const VERIFIED = [
  { value: "true", label: "Verified purchase" },
  { value: "false", label: "Not verified" },
];
const idOf = (v) => (v && typeof v === "object" ? String(v.id || v._id || "") : v ? String(v) : "");

const ACTION_COPY = {
  hidden: {
    title: (n) => (n === 1 ? "Hide this review?" : `Hide ${n} reviews?`),
    description: "Hidden reviews disappear from the product page and stop counting towards its rating. You can publish them again later.",
    cta: "Hide",
  },
  published: {
    title: (n) => (n === 1 ? "Publish this review?" : `Publish ${n} reviews?`),
    description: "The review is shown on the product page again and counts towards its rating.",
    cta: "Publish",
  },
};

function excerpt(text, n = 140) {
  const s = String(text || "").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function Reviews() {
  const can = useCan();
  const invalidate = useInvalidate();
  const scope = useTenantScope();
  const table = useUrlTableState({ filters: ["status", "productId", "userId", "rating", "verified"], defaults: { limit: 20 } });
  const productId = table.filters.productId;
  const userId = table.filters.userId;

  const q = useQuery({
    queryKey: keys.reviews.list({ ...table.query, tenant: scope.tenantId }),
    queryFn: () => scope.api.listReviewsForModeration(table.query),
    ...listQueryOptions,
  });
  const product = useQuery({
    queryKey: keys.products.detail(productId),
    queryFn: () => api.withTenant(null).getStaffProduct(productId),
    enabled: Boolean(productId) && can("products.view"),
    staleTime: 60_000,
  });
  const productName = product.data?.name || q.data?.data?.find((r) => idOf(r.product) === productId)?.product?.name;
  const buyerName = q.data?.data?.find((r) => idOf(r.buyer) === userId)?.buyer?.name;

  const [pending, setPending] = useState(null); // { status: "hidden"|"published"|"delete", rows, clear? }
  const [result, setResult] = useState(null);

  async function apply(note) {
    const { status, rows, clear } = pending;
    const call = (r) =>
      status === "delete" ? scope.api.deleteReview(r.id) : scope.api.moderateReview(r.id, { status, ...(note ? { note } : {}) });
    if (rows.length === 1) {
      await call(rows[0]); // errors show inside the dialog
      await invalidate(keys.reviews.all, keys.products.all);
      toast.success(status === "delete" ? "Review deleted" : status === "hidden" ? "Review hidden" : "Review published");
      return;
    }
    const res = await runBulk(rows, call, { skip: (r) => (status !== "delete" && r.status === status ? `Already ${status}` : null) });
    await invalidate(keys.reviews.all, keys.products.all);
    clear?.();
    if (res.failed.length || res.skipped.length) setResult({ ...res, title: status === "hidden" ? "Hide finished" : "Publish finished" });
    else toast.success(`${res.ok.length} review${res.ok.length === 1 ? "" : "s"} ${status === "hidden" ? "hidden" : "published"}`);
  }

  const canModerate = can(["reviews.moderate", "products.edit"]);

  const columns = [
    { id: "rating", header: "Rating", sortKey: "rating", cell: (r) => <Stars rating={r.rating} />, csv: (r) => r.rating, mobile: "meta", width: 110 },
    {
      id: "review",
      header: "Review",
      primary: true,
      mobile: "title",
      csv: (r) => r.body,
      cell: (r) => (
        <span className="grid max-w-md gap-0.5">
          <span className={r.body ? "text-fg" : "italic text-fg-subtle"} title={r.body || undefined}>
            {r.body ? excerpt(r.body) : "Rating only"}
          </span>
          {r.verifiedPurchase ? (
            <span>
              <Badge tone="success">Verified purchase</Badge>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "product",
      header: "Product",
      csv: (r) => r.product?.name || "",
      cell: (r) =>
        idOf(r.product) ? (
          <Link to={`/super-admin/catalog/${idOf(r.product)}`} className="grid hover:underline">
            <span className="truncate">{r.product.name}</span>
            {r.product.sku ? <span className="font-mono text-ui-xs text-fg-subtle">{r.product.sku}</span> : null}
          </Link>
        ) : (
          <span className="text-fg-subtle">Deleted product</span>
        ),
    },
    {
      id: "tenant",
      header: "Store",
      csv: (r) => r.tenant?.name || "",
      mobile: "meta",
      cell: (r) => <TenantLink tenant={r.tenant || r.tenantId} fallback="—" />,
    },
    {
      id: "buyer",
      header: "Buyer",
      csv: (r) => (r.buyer?.email ? `${r.buyer.name || r.authorName} <${r.buyer.email}>` : r.authorName),
      mobile: "subtitle",
      cell: (r) =>
        idOf(r.buyer || r.userId) ? (
          <span className="grid min-w-0">
            <Link to={`/super-admin/users/${idOf(r.buyer || r.userId)}`} className="truncate hover:underline">
              {r.buyer?.name || r.authorName || "Buyer"}
            </Link>
            {r.buyer?.email ? <span className="truncate text-ui-xs text-fg-subtle">{r.buyer.email}</span> : null}
          </span>
        ) : (
          <span className="text-fg-muted">{r.authorName || "Deleted account"}</span>
        ),
    },
    { id: "date", header: "Posted", sortKey: "createdAt", csv: (r) => r.createdAt, cell: (r) => <DateTime value={r.createdAt} format="date" /> },
    { id: "status", header: "Status", mobile: "meta", csv: (r) => r.status, cell: (r) => <StatusPill status={r.status} domain="review" /> },
    {
      id: "moderation",
      header: "Moderation",
      sortKey: "moderatedAt",
      csv: (r) => r.moderation?.note || "",
      cell: (r) => {
        const m = r.moderation || {};
        return m.moderatedAt ? (
          <span className="grid max-w-56 gap-0.5 text-ui-xs">
            <span className="text-fg-muted">
              <RelativeTime value={m.moderatedAt} />
              {m.moderatedBy?.name ? ` by ${m.moderatedBy.name}` : ""}
            </span>
            {m.note ? <span className="truncate text-fg" title={m.note}>{m.note}</span> : null}
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
    },
    ...(canModerate
      ? [
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            hideable: false,
            csv: false,
            mobile: "meta",
            width: 48,
            cell: (r) => (
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} size="sm" variant="ghost" label={`Actions for review by ${r.authorName || "buyer"}`} />}>
                {r.status === "hidden" ? (
                  <MenuItem icon={Eye} onSelect={() => setPending({ status: "published", rows: [r] })}>
                    Publish
                  </MenuItem>
                ) : (
                  <MenuItem icon={EyeOff} onSelect={() => setPending({ status: "hidden", rows: [r] })}>
                    Hide
                  </MenuItem>
                )}
                <MenuSeparator />
                <MenuItem tone="danger" icon={Trash2} onSelect={() => setPending({ status: "delete", rows: [r] })}>
                  Delete permanently
                </MenuItem>
              </DropdownMenu>
            ),
          },
        ]
      : []),
  ];

  const n = pending?.rows.length || 0;
  const copy = pending && pending.status !== "delete" ? ACTION_COPY[pending.status] : null;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Moderate buyer reviews across every store. Hidden reviews don’t appear on product pages or count towards ratings."
        breadcrumbs={[{ label: "Reviews" }]}
      />
      <DataTable
        storageKey="sa-reviews"
        exportFilename="reviews-page"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        getRowId={(r) => String(r.id || r._id)}
        columns={columns}
        selectable={canModerate}
        bulkActions={(rows, clear) => (
          <>
            <Button size="xs" leftIcon={EyeOff} onClick={() => setPending({ status: "hidden", rows, clear })}>
              Hide
            </Button>
            <Button size="xs" leftIcon={Eye} onClick={() => setPending({ status: "published", rows, clear })}>
              Publish
            </Button>
          </>
        )}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Review text, product, SKU, buyer"
            facets={[
              { key: "status", title: "Status", options: statusOptions(REVIEW_STATUSES) },
              { key: "rating", title: "Rating", options: RATINGS, multiple: true },
              { key: "verified", title: "Purchase", options: VERIFIED },
            ]}
          >
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} />
            {userId ? (
              <Badge tone="primary" className="gap-1 py-1">
                Buyer: {buyerName || "…"}
                <button type="button" aria-label="Clear buyer filter" className="rounded-xs hover:opacity-70" onClick={() => table.setFilter("userId", "")}>
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            ) : null}
            {productId ? (
              <Badge tone="primary" className="gap-1 py-1">
                Product: {productName || "…"}
                <button type="button" aria-label="Clear product filter" className="rounded-xs hover:opacity-70" onClick={() => table.setFilter("productId", "")}>
                  <X className="size-3" aria-hidden />
                </button>
              </Badge>
            ) : null}
          </FilterBar>
        }
        emptyState={
          <EmptyState
            icon={MessageSquareText}
            title={table.activeCount || scope.tenantId ? "No reviews match" : "No reviews yet"}
            description={table.activeCount ? "Try another status or clear the filters." : "Reviews appear here as buyers rate products."}
            action={
              table.activeCount ? (
                <Button size="sm" onClick={table.reset}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(pending) && pending.status !== "delete"}
        onOpenChange={(o) => !o && setPending(null)}
        title={copy?.title(n)}
        description={copy?.description}
        confirmLabel={copy?.cta}
        tone={pending?.status === "hidden" ? "danger" : "primary"}
        note={{ label: "Moderation note (optional, internal)", maxLength: 500, placeholder: "Why, for the audit trail" }}
        onConfirm={apply}
      />
      <ConfirmDialog
        open={pending?.status === "delete"}
        onOpenChange={(o) => !o && setPending(null)}
        title="Delete this review permanently?"
        description="The review is erased and the product rating is recalculated. This cannot be undone — hide it instead if you might need it later. The buyer can write a new review."
        confirmLabel="Delete review"
        tone="danger"
        onConfirm={() => apply()}
      />
      <BulkResultDialog result={result} labelOf={(r) => `${r.authorName || "Buyer"} on ${r.product?.name || "product"}`} onClose={() => setResult(null)} />
    </>
  );
}
