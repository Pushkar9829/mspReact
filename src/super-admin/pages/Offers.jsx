import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BadgePercent, CheckCircle2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useInvalidate } from "../../shared/hooks/useApiMutation.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { OFFER_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DateTime,
  DescriptionList,
  EmptyState,
  FilterBar,
  PageHeader,
  RelativeTime,
  Sheet,
  StatusPill,
  Tooltip,
  toast,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, useTenantScope } from "./lib/tenantScope.jsx";
import { offerDiscountLabel, refId } from "./lib/catalogShared.jsx";

const APPLIES_TO = { all: "All purchases", regular: "Regular (non-bulk) purchases", bulk: "Bulk purchases only" };
const APPROVABLE = ["pending_approval", "draft"];

function targeting(o) {
  const parts = [];
  if (o.productIds?.length) parts.push(`${o.productIds.length} product${o.productIds.length === 1 ? "" : "s"}`);
  if (o.categoryIds?.length) parts.push(`${o.categoryIds.length} categor${o.categoryIds.length === 1 ? "y" : "ies"}`);
  if (o.customerIds?.length) parts.push(`${o.customerIds.length} buyer${o.customerIds.length === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "Whole store";
}

export default function Offers() {
  const can = useCan();
  const invalidate = useInvalidate();
  const scope = useTenantScope();
  const tenantId = scope.tenantId;
  const table = useUrlTableState({ filters: ["status"], defaults: { limit: 20, status: "pending_approval" } });
  const canView = can("pricing.view");
  const canApprove = can("pricing.approve");
  // One cross-tenant query (no X-Tenant-Id); `tenantId` narrows it. Rows carry tenantId { _id, name, slug }.
  const query = { ...table.query, tenantId: tenantId || undefined };
  const q = useQuery({
    queryKey: keys.offers.list({ ...query, scope: "platform" }),
    queryFn: () => api.listPlatformOffers(query),
    enabled: canView,
    ...listQueryOptions,
  });
  const rows = q.data?.data;

  const [selected, setSelected] = useState(null);
  const [approving, setApproving] = useState(null);

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Offer",
        primary: true,
        csv: (o) => o.name,
        cell: (o) => (
          <button type="button" onClick={() => setSelected(o)} className="text-left font-medium text-fg hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {o.name}
          </button>
        ),
      },
      {
        id: "tenant",
        header: "Tenant",
        mobile: "subtitle",
        csv: (o) => o.tenantId?.name || refId(o.tenantId),
        cell: (o) => <TenantLink tenant={o.tenantId} />,
      },
      { id: "discount", header: "Discount", csv: (o) => offerDiscountLabel(o), cell: (o) => offerDiscountLabel(o) },
      { id: "target", header: "Targeting", csv: (o) => targeting(o), cell: (o) => <span className="text-fg-muted">{targeting(o)}</span>, mobile: "hidden" },
      {
        id: "window",
        header: "Runs",
        csv: (o) => `${o.startsAt} – ${o.endsAt}`,
        cell: (o) => (
          <span className="grid text-ui-xs">
            <DateTime value={o.startsAt} />
            <span className="text-fg-subtle">
              to <DateTime value={o.endsAt} />
            </span>
          </span>
        ),
      },
      {
        id: "cap",
        header: "Units used",
        align: "right",
        csv: (o) => (o.inventoryCap != null ? `${o.inventoryUsed || 0}/${o.inventoryCap}` : o.inventoryUsed || 0),
        cell: (o) => (o.inventoryCap != null ? `${(o.inventoryUsed || 0).toLocaleString("en-IN")} / ${o.inventoryCap.toLocaleString("en-IN")}` : <span className="text-fg-subtle">No cap</span>),
        defaultHidden: true,
      },
      { id: "status", header: "Status", mobile: "meta", csv: (o) => o.status, cell: (o) => <StatusPill status={o.status} /> },
      { id: "created", header: "Created", mobile: "meta", csv: (o) => o.createdAt, cell: (o) => <RelativeTime value={o.createdAt} /> },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        hideable: false,
        csv: false,
        cell: (o) =>
          APPROVABLE.includes(o.status) ? (
            canApprove ? (
              <Button size="xs" leftIcon={CheckCircle2} onClick={() => setApproving(o)}>
                Approve
              </Button>
            ) : (
              <Tooltip content="Requires pricing.approve">
                <span tabIndex={0} className="inline-flex">
                  <Button size="xs" disabled>
                    Approve
                  </Button>
                </span>
              </Tooltip>
            )
          ) : null,
      },
    ],
    [canApprove]
  );

  const approveTenantName = approving ? approving.tenantId?.name || "this store" : "";

  return (
    <>
      <PageHeader
        title="Offer approvals"
        description="Price offers that stores submitted for approval. Approved offers go live immediately for that store’s buyers."
        breadcrumbs={[{ label: "Offer approvals" }]}
      />
      {!canView ? (
        <Card>
          <EmptyState icon={BadgePercent} title="You can’t view offers" description="Listing offers requires the pricing.view permission." />
        </Card>
      ) : (
        <div className="grid gap-3">
          <DataTable
            storageKey="sa-offers"
            exportFilename="offers"
            table={table}
            data={rows}
            meta={q.data?.meta}
            loading={q.isPending}
            fetching={q.isFetching}
            error={q.error}
            onRetry={q.refetch}
            columns={columns}
            toolbar={
              <FilterBar table={table} searchPlaceholder="Search offer name" facets={[{ key: "status", title: "Status", options: statusOptions(OFFER_STATUSES), multiple: true }]}>
                <TenantFilter value={tenantId} onChange={scope.setTenant} />
              </FilterBar>
            }
            emptyState={
              <EmptyState
                icon={BadgeCheck}
                title={table.filters.status === "pending_approval" ? "Nothing waiting for approval" : "No offers match"}
                description={table.filters.status === "pending_approval" ? "Offers that stores submit for approval show up here." : "Try another status or tenant."}
                action={
                  table.activeCount ? (
                    <Button size="sm" onClick={() => table.setFilter("status", "")}>
                      Show all statuses
                    </Button>
                  ) : null
                }
              />
            }
          />
        </div>
      )}

      <OfferSheet
        offer={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        canApprove={canApprove}
        onApprove={(o) => setApproving(o)}
      />
      <ConfirmDialog
        open={Boolean(approving)}
        onOpenChange={(o) => !o && setApproving(null)}
        title={`Approve “${approving?.name}”?`}
        description={`The offer goes live immediately for buyers of ${approveTenantName} (${offerDiscountLabel(approving)}, ${approving ? targeting(approving).toLowerCase() : ""}). Buyers who watch these products may be notified of a price drop.${approving?.status === "draft" ? " This offer is still a draft — the store hasn’t submitted it for approval." : ""}`}
        confirmLabel="Approve offer"
        onConfirm={async () => {
          try {
            const updated = await api.approvePlatformOffer(approving._id);
            if (selected && selected._id === approving._id) setSelected({ ...selected, ...updated });
            toast.success("Offer approved and live");
          } catch (err) {
            // 409 INVALID_STATE: someone else approved or changed it meanwhile — refresh the list.
            if (err?.code === "INVALID_STATE") await invalidate(keys.offers.all);
            throw err;
          }
          await invalidate(keys.offers.all);
        }}
      />
    </>
  );
}

function OfferSheet({ offer, onOpenChange, canApprove, onApprove }) {
  const tid = refId(offer?.tenantId);
  return (
    <Sheet
      open={Boolean(offer)}
      onOpenChange={onOpenChange}
      size="lg"
      title={offer?.name || "Offer"}
      description={offer ? offerDiscountLabel(offer) : undefined}
      footer={
        offer && APPROVABLE.includes(offer.status) && canApprove ? (
          <Button variant="primary" leftIcon={CheckCircle2} onClick={() => onApprove(offer)}>
            Approve offer
          </Button>
        ) : null
      }
    >
      {offer ? (
        <div className="grid gap-6">
          <DescriptionList
            columns={2}
            items={[
              { label: "Status", value: <StatusPill status={offer.status} /> },
              { label: "Store", value: <TenantLink tenant={offer.tenantId} /> },
              { label: "Type", value: offer.type === "percent" ? "Percentage off" : offer.type === "flash" ? "Flash deal (amount off)" : "Fixed amount off" },
              { label: "Discount", value: offerDiscountLabel(offer) },
              { label: "Applies to", value: APPLIES_TO[offer.appliesTo] || offer.appliesTo },
              { label: "Unit cap", value: offer.inventoryCap != null ? `${(offer.inventoryUsed || 0).toLocaleString("en-IN")} of ${offer.inventoryCap.toLocaleString("en-IN")} used` : "No cap" },
              { label: "Starts (IST)", value: <DateTime value={offer.startsAt} /> },
              { label: "Ends (IST)", value: <DateTime value={offer.endsAt} /> },
              { label: "Created", value: <DateTime value={offer.createdAt} /> },
              { label: "Updated", value: <DateTime value={offer.updatedAt} /> },
            ]}
          />
          <section className="grid gap-2">
            <h3 className="text-ui font-semibold text-fg">Targeting</h3>
            {!offer.productIds?.length && !offer.categoryIds?.length && !offer.customerIds?.length ? (
              <p className="text-ui-sm text-fg-muted">Every product in the store, for every buyer.</p>
            ) : null}
            {offer.productIds?.length ? (
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">Products ({offer.productIds.length})</p>
                <ul className="flex flex-wrap gap-1.5">
                  {offer.productIds.map((pid) => (
                    <li key={refId(pid)}>
                      <Link to={`/super-admin/catalog/${refId(pid)}`} className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-ui-xs text-fg hover:underline">
                        {pid?.name || refId(pid).slice(-8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {offer.categoryIds?.length ? (
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">Categories ({offer.categoryIds.length})</p>
                <ul className="flex flex-wrap gap-1.5">
                  {offer.categoryIds.map((cid) => (
                    <li key={refId(cid)}>
                      <Link to={`/super-admin/catalog?tenant=${tid}&categoryId=${refId(cid)}`} className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-ui-xs text-fg hover:underline">
                        {cid?.name || refId(cid).slice(-8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {offer.customerIds?.length ? (
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">Only these buyers ({offer.customerIds.length})</p>
                <ul className="flex flex-wrap gap-1.5">
                  {offer.customerIds.map((uid) => (
                    <li key={refId(uid)}>
                      <Link to={`/super-admin/users/${refId(uid)}`} className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-ui-xs text-fg hover:underline">
                        {uid?.name || refId(uid).slice(-8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          {offer.status === "draft" ? <Alert tone="info">This offer is a draft: the store hasn’t submitted it for approval yet. Approving makes it live anyway.</Alert> : null}
        </div>
      ) : null}
    </Sheet>
  );
}
