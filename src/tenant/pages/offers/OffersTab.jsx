import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, BadgePercent, CircleCheck, MoreHorizontal, Pencil, Plus, Send } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { OFFER_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  Money,
  RadioGroup,
  Select,
  StatusPill,
} from "../../../shared/ui/index.js";
import {
  APPLIES_TO_OPTIONS,
  DateTimeInput,
  FormSheet,
  GatedMenuItem,
  MONEY_MAX,
  MultiPicker,
  ValidityCell,
  appliesToLabel,
  changedFields,
  customerSearch,
  fromLocal,
  generalError,
  localFromNow,
  mapCustomer,
  mapProduct,
  numStr,
  productSearch,
  toLocal,
  toNumber,
  useLookups,
  validityCsv,
} from "./shared.jsx";

const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage off" },
  { value: "fixed", label: "Fixed amount off per unit" },
  { value: "flash", label: "Flash sale (fixed amount off, “price drop” badge)" },
];

export function offerValue(o) {
  if (o.type === "percent") return <span className="tabular-nums">{o.value}% off</span>;
  return (
    <span>
      <Money value={o.value} /> off{o.type === "flash" ? <span className="ml-1 text-ui-xs text-fg-subtle">(flash)</span> : null}
    </span>
  );
}

function targeting(o) {
  const parts = [];
  if (o.productIds?.length) parts.push(`${o.productIds.length} product${o.productIds.length === 1 ? "" : "s"}`);
  if (o.categoryIds?.length) parts.push(`${o.categoryIds.length} categor${o.categoryIds.length === 1 ? "y" : "ies"}`);
  const scope = parts.length ? parts.join(" + ") : "All products";
  const who = o.customerIds?.length ? `${o.customerIds.length} buyer${o.customerIds.length === 1 ? "" : "s"}` : "All buyers";
  return { scope, who };
}

/* ------------------------------------------------------------------ list */

export function OffersTab({ onCreate, onEdit }) {
  const can = useCan();
  const table = useUrlTableState({ filters: ["status"], prefix: "o_", defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.offers.list(table.query), queryFn: () => api.listOffers(table.query), ...listQueryOptions });
  const [confirm, setConfirm] = useState(null); // { kind: "approve" | "deactivate", row }

  const status = useApiMutation(({ id, body }) => api.updateOffer(id, body), {
    invalidate: [keys.offers.all],
    success: (d) => (d?.status === "pending_approval" ? "Submitted for approval" : d?.status === "inactive" ? "Offer deactivated" : "Offer updated"),
  });
  const approve = useApiMutation((id) => api.approveOffer(id), { invalidate: [keys.offers.all], success: "Offer approved and live", error: false });
  const deactivate = useApiMutation((id) => api.updateOffer(id, { status: "inactive" }), { invalidate: [keys.offers.all], success: "Offer deactivated", error: false });

  const canEdit = can("offers.edit");
  const canApprove = can("pricing.approve");

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Offer",
        primary: true,
        mobile: "title",
        cell: (o) =>
          canEdit ? (
            <button type="button" onClick={() => onEdit(o)} className="relative z-[1] rounded-xs text-left font-medium text-fg hover:underline">
              {o.name}
            </button>
          ) : (
            <span className="font-medium">{o.name}</span>
          ),
        csv: (o) => o.name,
      },
      { id: "discount", header: "Discount", cell: offerValue, csv: (o) => `${o.type}:${o.value}`, mobile: "subtitle" },
      {
        id: "targeting",
        header: "Targeting",
        cell: (o) => {
          const t = targeting(o);
          return (
            <div className="grid text-ui-sm">
              <span>{t.scope}</span>
              <span className="text-ui-xs text-fg-subtle">{t.who}</span>
            </div>
          );
        },
        csv: (o) => `${targeting(o).scope}; ${targeting(o).who}`,
      },
      { id: "appliesTo", header: "Applies to", cell: (o) => appliesToLabel(o.appliesTo), csv: (o) => o.appliesTo, mobile: "hidden", defaultHidden: false },
      {
        id: "usage",
        header: "Units used",
        align: "right",
        cell: (o) => (
          <span className="tabular-nums">
            {o.inventoryUsed ?? 0}
            <span className="text-fg-subtle"> / {o.inventoryCap == null ? "∞" : o.inventoryCap}</span>
          </span>
        ),
        csv: (o) => `${o.inventoryUsed ?? 0}/${o.inventoryCap ?? ""}`,
        mobile: "meta",
      },
      { id: "validity", header: "Validity (IST)", cell: (o) => <ValidityCell startsAt={o.startsAt} endsAt={o.endsAt} />, csv: validityCsv, mobile: "meta" },
      { id: "status", header: "Status", cell: (o) => <StatusPill status={o.status} />, csv: (o) => o.status, mobile: "meta" },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        hideable: false,
        align: "right",
        csv: false,
        cell: (o) => (
          <div className="relative z-[1] flex justify-end">
            <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${o.name}`} size="sm" />}>
              <GatedMenuItem icon={Pencil} allowed={canEdit} perm="offers.edit" onSelect={() => onEdit(o)}>
                Edit
              </GatedMenuItem>
              {["draft", "inactive"].includes(o.status) ? (
                <GatedMenuItem icon={Send} allowed={canEdit} perm="offers.edit" onSelect={() => status.mutate({ id: o._id, body: { status: "pending_approval" } })}>
                  Submit for approval
                </GatedMenuItem>
              ) : null}
              {["draft", "pending_approval"].includes(o.status) ? (
                <GatedMenuItem icon={CircleCheck} allowed={canApprove} perm="pricing.approve" onSelect={() => setConfirm({ kind: "approve", row: o })}>
                  Approve &amp; activate
                </GatedMenuItem>
              ) : null}
              {["active", "pending_approval"].includes(o.status) ? (
                <GatedMenuItem icon={Ban} tone="danger" allowed={canEdit} perm="offers.edit" onSelect={() => setConfirm({ kind: "deactivate", row: o })}>
                  Deactivate
                </GatedMenuItem>
              ) : null}
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [canEdit, canApprove, onEdit, status]
  );

  const filtered = table.activeCount > 0;
  return (
    <>
      <DataTable
        storageKey="tenant-offers"
        exportFilename="offers"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        toolbar={<FilterBar table={table} searchPlaceholder="Search offers by name" facets={[{ key: "status", title: "Status", options: statusOptions(OFFER_STATUSES) }]} />}
        columns={columns}
        emptyState={
          filtered ? (
            <EmptyState icon={BadgePercent} title="No offers match" description="Try a different search or status." action={<Button onClick={table.reset}>Clear filters</Button>} />
          ) : (
            <EmptyState
              icon={BadgePercent}
              title="No offers yet"
              description="Offers discount products automatically for a time window — percentage, fixed or flash price drops."
              action={
                <PermissionGate perm="offers.create">
                  <Button variant="primary" leftIcon={Plus} onClick={onCreate}>
                    Create offer
                  </Button>
                </PermissionGate>
              }
            />
          )
        }
      />
      <ConfirmDialog
        open={confirm?.kind === "approve"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Approve “${confirm?.row?.name}”?`}
        description="The offer becomes active and buyers see the discounted price on matching products during its validity window."
        confirmLabel="Approve & activate"
        onConfirm={() => approve.mutateAsync(confirm.row._id)}
      />
      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Deactivate “${confirm?.row?.name}”?`}
        description="The discount stops applying immediately, including for items already in buyers’ carts. To run it again you’ll need to submit it for approval."
        confirmLabel="Deactivate offer"
        tone="danger"
        onConfirm={() => deactivate.mutateAsync(confirm.row._id)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ form */

const PRICE_FIELDS = ["type", "value", "productIds", "categoryIds", "customerIds", "appliesTo"];
const FIELD_NAMES = ["name", "type", "value", "productIds", "categoryIds", "customerIds", "inventoryCap", "appliesTo", "startsAt", "endsAt", "status"];

function initialForm(offer) {
  if (!offer) {
    return {
      name: "",
      type: "percent",
      value: "",
      productIds: [],
      categoryIds: [],
      customerIds: [],
      inventoryCap: "",
      appliesTo: "all",
      startsAt: localFromNow(0),
      endsAt: localFromNow(7),
      status: "draft",
    };
  }
  return {
    name: offer.name || "",
    type: offer.type || "percent",
    value: numStr(offer.value),
    productIds: (offer.productIds || []).map(String),
    categoryIds: (offer.categoryIds || []).map(String),
    customerIds: (offer.customerIds || []).map(String),
    inventoryCap: numStr(offer.inventoryCap),
    appliesTo: offer.appliesTo || "all",
    startsAt: toLocal(offer.startsAt),
    endsAt: toLocal(offer.endsAt),
    status: offer.status,
  };
}

function toBody(f) {
  const cap = toNumber(f.inventoryCap);
  return {
    name: f.name.trim(),
    type: f.type,
    value: toNumber(f.value),
    productIds: f.productIds,
    categoryIds: f.categoryIds,
    customerIds: f.customerIds,
    inventoryCap: cap,
    appliesTo: f.appliesTo,
    startsAt: fromLocal(f.startsAt),
    endsAt: fromLocal(f.endsAt),
  };
}

function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (!name) e.name = "Name is required";
  else if (name.length > 120) e.name = "Use 120 characters or fewer";
  const v = toNumber(f.value);
  if (v == null) e.value = "Enter a discount value";
  else if (Number.isNaN(v) || v < 0) e.value = "Enter a number of 0 or more";
  else if (f.type === "percent" && v > 100) e.value = "Percent offers cannot exceed 100";
  else if (v > MONEY_MAX) e.value = "Value is too large";
  const cap = toNumber(f.inventoryCap);
  if (cap != null && (Number.isNaN(cap) || cap < 0 || !Number.isInteger(cap))) e.inventoryCap = "Enter a whole number of 0 or more, or leave blank";
  if (!f.startsAt) e.startsAt = "Start is required";
  if (!f.endsAt) e.endsAt = "End is required";
  if (f.startsAt && f.endsAt && fromLocal(f.endsAt) <= fromLocal(f.startsAt)) e.endsAt = "End must be after the start";
  if (f.productIds.length > 1000) e.productIds = "At most 1000 products";
  if (f.categoryIds.length > 500) e.categoryIds = "At most 500 categories";
  if (f.customerIds.length > 1000) e.customerIds = "At most 1000 buyers";
  return e;
}

export function OfferForm({ open, offer, onClose }) {
  const can = useCan();
  const canApprove = can("pricing.approve");
  const editing = Boolean(offer);
  const initial = useMemo(() => initialForm(offer), [offer]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const lookups = useLookups({ products: open, categories: open, customers: open });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = useApiMutation((body) => (editing ? api.updateOffer(offer._id, body) : api.createOffer(body)), {
    invalidate: [keys.offers.all],
    success: (d) =>
      editing
        ? d?.status === "pending_approval" && offer.status === "active"
          ? "Offer saved and sent for approval"
          : "Offer saved"
        : d?.status === "active"
          ? "Offer created and live"
          : d?.status === "pending_approval"
            ? "Offer created and submitted for approval"
            : "Offer saved as draft",
    error: false,
    onSuccess: () => onClose(),
  });

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const initialBody = useMemo(() => toBody(initial), [initial]);
  const changes = editing ? changedFields(initialBody, toBody(form)) : null;
  const priceTouched = editing && PRICE_FIELDS.some((k) => k in changes);
  const willNeedApproval = editing && offer.status === "active" && !canApprove && priceTouched;

  function submit(e) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (editing) {
      if (!Object.keys(changes).length) return onClose();
      save.mutate(changes);
    } else {
      const body = toBody(form);
      body.status = form.status === "live" ? (canApprove ? "active" : "pending_approval") : "draft";
      save.mutate(body);
    }
  }

  const err = (name) => errors[name];
  const general = generalError(save.error, FIELD_NAMES);
  const fieldProps = (name) => ({ name, errors: save.error, error: err(name) });

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={editing ? `Edit offer` : "Create offer"}
      description={editing ? offer.name : "Discount products automatically for a time window."}
      dirty={dirty}
      busy={save.isPending}
      footer={(requestClose) => (
        <>
          <Button onClick={requestClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="offer-form" variant="primary" loading={save.isPending} disabled={editing && !dirty}>
            {editing ? "Save changes" : form.status === "live" ? (canApprove ? "Create & activate" : "Create & submit") : "Save draft"}
          </Button>
        </>
      )}
    >
      <form id="offer-form" onSubmit={submit} noValidate className="grid gap-5">
        {willNeedApproval ? (
          <Alert tone="warning" title="This change needs approval">
            You’re changing the discount or targeting of a live offer. Saving moves it to “Pending approval” and it stops applying until someone with pricing.approve approves it.
          </Alert>
        ) : null}

        <Field label="Name" required {...fieldProps("name")}>
          <Input value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Diwali tea 12% off" autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required {...fieldProps("type")}>
            <Select value={form.type} onValueChange={(v) => set({ type: v })} options={TYPE_OPTIONS} />
          </Field>
          <Field label={form.type === "percent" ? "Discount (%)" : "Discount per unit (₹)"} required {...fieldProps("value")}>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              max={form.type === "percent" ? 100 : undefined}
              step="any"
              value={form.value}
              onChange={(e) => set({ value: e.target.value })}
              suffix={form.type === "percent" ? "%" : "₹"}
            />
          </Field>
        </div>

        <fieldset className="grid gap-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-ui-sm font-semibold text-fg">Targeting</legend>
          <p className="-mt-2 text-ui-xs text-fg-subtle">Leave a list empty to include everything. When several lists are set, a line must match all of them.</p>
          <Field label="Products" optional {...fieldProps("productIds")}>
            <MultiPicker
              aria-label="Add product"
              value={form.productIds}
              onChange={(v) => set({ productIds: v })}
              search={productSearch}
              queryKey={["offers", "pick-product"]}
              mapOption={mapProduct}
              nameOf={lookups.productName}
              resolve={lookups.resolveProduct}
              placeholder="All products — search to add"
              searchPlaceholder="Search products"
            />
          </Field>
          <Field label="Categories" optional {...fieldProps("categoryIds")}>
            <MultiPicker
              aria-label="Add category"
              value={form.categoryIds}
              onChange={(v) => set({ categoryIds: v })}
              options={[...lookups.categoryMap.values()].map((c) => ({ value: String(c._id), label: c.name }))}
              nameOf={lookups.categoryName}
              placeholder="All categories — pick to add"
              searchPlaceholder="Search categories"
            />
          </Field>
          <Field
            label="Buyers"
            optional
            hint={lookups.canCustomers ? "Only buyers who have ordered from your store are listed." : "Requires reports.view, orders.view or ledger.view to search buyers."}
            {...fieldProps("customerIds")}
          >
            <MultiPicker
              aria-label="Add buyer"
              value={form.customerIds}
              onChange={(v) => set({ customerIds: v })}
              search={customerSearch}
              queryKey={["offers", "pick-customer"]}
              mapOption={mapCustomer}
              nameOf={lookups.customerName}
              placeholder="All buyers — search to add"
              searchPlaceholder="Search by name, email or phone"
              disabled={!lookups.canCustomers}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Applies to" {...fieldProps("appliesTo")}>
              <Select value={form.appliesTo} onValueChange={(v) => set({ appliesTo: v })} options={APPLIES_TO_OPTIONS} />
            </Field>
            <Field label="Unit cap" optional hint="Total units sold at this price. Blank = unlimited." {...fieldProps("inventoryCap")}>
              <Input type="number" inputMode="numeric" min="0" step="1" value={form.inventoryCap} onChange={(e) => set({ inventoryCap: e.target.value })} placeholder="Unlimited" />
            </Field>
          </div>
          {editing ? (
            <p className="text-ui-xs text-fg-subtle">
              {offer.inventoryUsed ?? 0} unit{offer.inventoryUsed === 1 ? "" : "s"} sold at this offer so far.
            </p>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts (IST)" required {...fieldProps("startsAt")}>
            <DateTimeInput value={form.startsAt} onChange={(v) => set({ startsAt: v })} />
          </Field>
          <Field label="Ends (IST)" required {...fieldProps("endsAt")}>
            <DateTimeInput value={form.endsAt} onChange={(v) => set({ endsAt: v })} min={form.startsAt || undefined} />
          </Field>
        </div>

        {!editing ? (
          <Field label="When saved">
            <RadioGroup
              value={form.status}
              onValueChange={(v) => set({ status: v })}
              options={[
                { value: "draft", label: "Save as draft", description: "Not visible to buyers. Submit or approve it later." },
                canApprove
                  ? { value: "live", label: "Activate", description: "Goes live for its validity window as soon as you save." }
                  : { value: "live", label: "Submit for approval", description: "Someone with pricing.approve must approve it before it applies." },
              ]}
            />
          </Field>
        ) : null}
        {!canApprove && !editing ? (
          <Alert tone="info">You don’t have pricing.approve, so offers you activate are submitted for approval first.</Alert>
        ) : null}

        {general ? <Alert tone="danger">{general}</Alert> : null}
      </form>
    </FormSheet>
  );
}
