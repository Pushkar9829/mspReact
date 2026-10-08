import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, CircleCheck, ListChecks, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { rowsOf } from "../../../shared/auth.js";
import { OFFER_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import {
  Alert,
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  DataTable,
  DateTime,
  DropdownMenu,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  Money,
  RadioGroup,
  StatusPill,
  Switch,
} from "../../../shared/ui/index.js";
import {
  FormSheet,
  GatedMenuItem,
  MONEY_MAX,
  changedFields,
  customerSearch,
  generalError,
  mapCustomer,
  mapProduct,
  productSearch,
  shortId,
  toNumber,
  useLookups,
} from "./shared.jsx";

function variantLabel(v) {
  if (!v) return "";
  const a = v.attributes || {};
  return a.packSize || a.size || [a.color, a.grade].filter(Boolean).join(" / ") || v.sku;
}

/* ------------------------------------------------------------------ list */

export function PriceListsTab({ onCreate, onEdit }) {
  const can = useCan();
  // GET /pricing: q (name) + status (comma list); passing page/limit makes it return {data, meta}.
  const table = useUrlTableState({ filters: ["status"], prefix: "p_", defaults: { limit: 20 } });
  const query = table.query;
  const q = useQuery({ queryKey: keys.priceLists.list(query), queryFn: () => api.listPriceLists(query), ...listQueryOptions });
  const lookups = useLookups({ customers: true });
  const [confirm, setConfirm] = useState(null);

  const status = useApiMutation(({ id, body }) => api.updatePriceList(id, body), {
    invalidate: [keys.priceLists.all],
    success: (d) => (d?.status === "pending_approval" ? "Submitted for approval" : "Price list updated"),
  });
  const approve = useApiMutation((id) => api.approvePriceList(id), { invalidate: [keys.priceLists.all], success: "Price list approved and live", error: false });
  const deactivate = useApiMutation((id) => api.updatePriceList(id, { status: "inactive" }), { invalidate: [keys.priceLists.all], success: "Price list deactivated", error: false });

  const canEdit = can("pricing.edit");
  const canApprove = can("pricing.approve");

  const customerCell = (p) => {
    if (!p.customerId) return <span className="text-fg-muted">{p.isDefault ? "All buyers (default)" : "No buyer assigned"}</span>;
    const name = lookups.customerName(p.customerId);
    return name ? <span>{name}</span> : <span className="font-mono text-ui-xs text-fg-muted" title={String(p.customerId)}>Buyer {shortId(p.customerId)}</span>;
  };

  const columns = [
    {
      id: "name",
      header: "Price list",
      primary: true,
      mobile: "title",
      cell: (p) =>
        canEdit ? (
          <button type="button" onClick={() => onEdit(p)} className="relative z-[1] rounded-xs text-left font-medium text-fg hover:underline">
            {p.name}
          </button>
        ) : (
          <span className="font-medium">{p.name}</span>
        ),
      csv: (p) => p.name,
    },
    { id: "customer", header: "Buyer", cell: customerCell, csv: (p) => lookups.customerName(p.customerId) || p.customerId || (p.isDefault ? "default" : ""), mobile: "subtitle" },
    { id: "items", header: "Items", align: "right", cell: (p) => <span className="tabular-nums">{p.items?.length ?? 0}</span>, csv: (p) => p.items?.length ?? 0, mobile: "meta" },
    { id: "default", header: "Default", cell: (p) => (p.isDefault ? <Badge tone="primary">Default</Badge> : <span className="text-fg-subtle">—</span>), csv: (p) => (p.isDefault ? "yes" : "no"), mobile: "meta" },
    { id: "status", header: "Status", cell: (p) => <StatusPill status={p.status} />, csv: (p) => p.status, mobile: "meta" },
    { id: "updated", header: "Updated", cell: (p) => <DateTime value={p.updatedAt} />, csv: (p) => p.updatedAt, mobile: "hidden" },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      csv: false,
      cell: (p) => (
        <div className="relative z-[1] flex justify-end">
          <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${p.name}`} size="sm" />}>
            <GatedMenuItem icon={Pencil} allowed={canEdit} perm="pricing.edit" onSelect={() => onEdit(p)}>
              Edit
            </GatedMenuItem>
            {["draft", "inactive"].includes(p.status) ? (
              <GatedMenuItem icon={Send} allowed={canEdit} perm="pricing.edit" onSelect={() => status.mutate({ id: p._id, body: { status: "pending_approval" } })}>
                Submit for approval
              </GatedMenuItem>
            ) : null}
            {["draft", "pending_approval"].includes(p.status) ? (
              <GatedMenuItem icon={CircleCheck} allowed={canApprove} perm="pricing.approve" onSelect={() => setConfirm({ kind: "approve", row: p })}>
                Approve &amp; activate
              </GatedMenuItem>
            ) : null}
            {["active", "pending_approval"].includes(p.status) ? (
              <GatedMenuItem icon={Ban} tone="danger" allowed={canEdit} perm="pricing.edit" onSelect={() => setConfirm({ kind: "deactivate", row: p })}>
                Deactivate
              </GatedMenuItem>
            ) : null}
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        storageKey="tenant-price-lists"
        exportFilename="price-lists"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        toolbar={
          <div className="grid w-full gap-2">
            <p className="text-ui-sm text-fg-muted">Contract (B2B) prices per variant for a specific buyer, or a default list for every buyer.</p>
            <FilterBar table={table} searchPlaceholder="Search price lists" facets={[{ key: "status", title: "Status", multiple: true, options: statusOptions(OFFER_STATUSES) }]} />
          </div>
        }
        columns={columns}
        emptyState={
          table.activeCount ? (
            <EmptyState icon={ListChecks} title="No price lists match" description="Try a different search or status." action={<Button onClick={table.reset}>Clear filters</Button>} />
          ) : (
          <EmptyState
            icon={ListChecks}
            title="No price lists yet"
            description="Give a wholesale buyer negotiated per-variant prices, or set a default list that applies to everyone."
            action={
              <PermissionGate perm="pricing.create">
                <Button variant="primary" leftIcon={Plus} onClick={onCreate}>
                  Create price list
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
        description="The list becomes active and its prices apply to the assigned buyer (or every buyer, if it’s the default) on their next cart or checkout."
        confirmLabel="Approve & activate"
        onConfirm={() => approve.mutateAsync(confirm.row._id)}
      />
      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Deactivate “${confirm?.row?.name}”?`}
        description="Buyers on this list go back to your regular prices immediately, including items already in their carts. Re-activating it needs approval."
        confirmLabel="Deactivate list"
        tone="danger"
        onConfirm={() => deactivate.mutateAsync(confirm.row._id)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ form */

const FIELD_NAMES = ["name", "customerId", "isDefault", "status", "items"];

function initialForm(p) {
  if (!p) return { name: "", customerId: "", isDefault: false, status: "draft", items: [] };
  return {
    name: p.name || "",
    customerId: p.customerId ? String(p.customerId) : "",
    isDefault: Boolean(p.isDefault),
    status: p.status,
    items: (p.items || []).map((i) => ({ variantId: String(i.variantId), unitPrice: i.unitPrice == null ? "" : String(i.unitPrice) })),
  };
}

function toBody(f) {
  return {
    name: f.name.trim(),
    customerId: f.customerId || null,
    isDefault: f.isDefault,
    items: f.items.map((i) => ({ variantId: i.variantId, unitPrice: toNumber(i.unitPrice) })),
  };
}

function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (!name) e.name = "Name is required";
  else if (name.length > 120) e.name = "Use 120 characters or fewer";
  if (f.items.length > 5000) e.items = "At most 5000 items";
  f.items.forEach((item, i) => {
    const n = toNumber(item.unitPrice);
    if (n == null) e[`items.${i}.unitPrice`] = "Enter a price";
    else if (Number.isNaN(n) || n < 0 || n > MONEY_MAX) e[`items.${i}.unitPrice`] = "Enter an amount of 0 or more";
  });
  return e;
}

function AddItemRow({ existing, onAdd, productNames }) {
  const [product, setProduct] = useState(null); // { value, label }
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const variantsQ = useQuery({
    queryKey: keys.variants.custom("by-product", product?.value),
    queryFn: () => api.listVariants({ productId: product.value }),
    enabled: Boolean(product?.value),
  });
  const variants = rowsOf(variantsQ.data);
  const taken = new Set(existing);
  const options = variants.map((v) => ({
    value: String(v._id),
    label: `${variantLabel(v)} · ${v.sku}`,
    disabled: taken.has(String(v._id)),
    variant: v,
  }));
  const selected = variants.find((v) => String(v._id) === variantId);

  function pickProduct(id, option) {
    setProduct(id ? { value: id, label: option?.label } : null);
    setVariantId("");
    setError("");
    if (option?.label) productNames.current[id] = option.label;
  }

  function add() {
    if (!selected) return setError("Pick a variant");
    if (taken.has(variantId)) return setError("This variant is already on the list");
    const n = toNumber(price);
    if (n == null || Number.isNaN(n) || n < 0 || n > MONEY_MAX) return setError("Enter a contract price of 0 or more");
    onAdd({ variantId, unitPrice: String(n) }, selected);
    setVariantId("");
    setPrice("");
    setError("");
  }

  return (
    <div className="grid gap-3 rounded-lg border border-dashed border-border-strong p-3">
      <p className="text-ui-sm font-medium text-fg">Add a variant</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Product">
          <Combobox
            value={product?.value || ""}
            onChange={pickProduct}
            search={productSearch}
            queryKey={["price-lists", "pick-product"]}
            mapOption={mapProduct}
            selectedLabel={product?.label}
            placeholder="Search products"
            searchPlaceholder="Product name or SKU"
          />
        </Field>
        <Field label="Variant" hint={product && variantsQ.isFetched && !variants.length ? "This product has no variants" : undefined}>
          <Combobox
            value={variantId}
            onChange={(v) => {
              setVariantId(v);
              setError("");
            }}
            options={options}
            disabled={!product}
            placeholder={product ? (variantsQ.isFetching ? "Loading variants…" : "Pick a variant") : "Pick a product first"}
            renderOption={(o) => (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span className="truncate">{o.label}</span>
                <span className="shrink-0 text-ui-xs text-fg-subtle">
                  {o.disabled ? "Already added" : <Money value={o.variant?.sellingPrice} />}
                </span>
              </span>
            )}
          />
        </Field>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Contract price (₹ per unit)" hint={selected ? <>Current selling price: <Money value={selected.sellingPrice} /></> : undefined}>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            disabled={!selected}
          />
        </Field>
        <Button leftIcon={Plus} onClick={add} disabled={!selected}>
          Add item
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-ui-xs text-danger-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PriceListForm({ open, priceList, onClose }) {
  const can = useCan();
  const canApprove = can("pricing.approve");
  const editing = Boolean(priceList);
  const initial = useMemo(() => initialForm(priceList), [priceList]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [pickedVariants, setPickedVariants] = useState({});
  const productNames = useRef({});
  const lookups = useLookups({ products: open, customers: open, variants: open });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = useApiMutation((body) => (editing ? api.updatePriceList(priceList._id, body) : api.createPriceList(body)), {
    invalidate: [keys.priceLists.all],
    success: (d) =>
      editing
        ? d?.status === "pending_approval" && priceList.status === "active"
          ? "Price list saved and sent for approval"
          : "Price list saved"
        : d?.status === "active"
          ? "Price list created and live"
          : d?.status === "pending_approval"
            ? "Price list created and submitted for approval"
            : "Price list saved as draft",
    error: false,
    onSuccess: () => onClose(),
  });

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const initialBody = useMemo(() => toBody(initial), [initial]);
  const changes = editing ? changedFields(initialBody, toBody(form)) : {};
  const willNeedApproval = editing && priceList.status === "active" && !canApprove && ("items" in changes || "customerId" in changes || "isDefault" in changes);
  const appliesToNobody = !form.customerId && !form.isDefault;

  const variantOf = (id) => pickedVariants[id] || lookups.variantMap.get(String(id));
  const productOf = (v) => (v ? productNames.current[String(v.productId)] || lookups.productName(v.productId) : undefined);

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
      if (!body.customerId) delete body.customerId;
      body.status = form.status === "live" ? (canApprove ? "active" : "pending_approval") : "draft";
      save.mutate(body);
    }
  }

  const general = generalError(save.error, FIELD_NAMES);
  const fieldProps = (name) => ({ name, errors: save.error, error: errors[name] });

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? "Edit price list" : "Create price list"}
      description={editing ? priceList.name : "Negotiated per-variant prices for a buyer."}
      dirty={dirty}
      busy={save.isPending}
      footer={(requestClose) => (
        <>
          <Button onClick={requestClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="price-list-form" variant="primary" loading={save.isPending} disabled={editing && !dirty}>
            {editing ? "Save changes" : form.status === "live" ? (canApprove ? "Create & activate" : "Create & submit") : "Save draft"}
          </Button>
        </>
      )}
    >
      <form id="price-list-form" onSubmit={submit} noValidate className="grid gap-5">
        {willNeedApproval ? (
          <Alert tone="warning" title="This change needs approval">
            Changing the buyer, default flag or prices of a live list moves it to “Pending approval”. Its prices stop applying until someone with pricing.approve approves it.
          </Alert>
        ) : null}

        <Field label="Name" required {...fieldProps("name")}>
          <Input value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Retail Mart contract 2026" autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Buyer"
            optional
            hint={lookups.canCustomers ? "Only buyers who have ordered from your store are listed." : "Requires reports.view, orders.view or ledger.view to search buyers."}
            {...fieldProps("customerId")}
          >
            <Combobox
              value={form.customerId}
              onChange={(v) => set({ customerId: v || "" })}
              search={customerSearch}
              queryKey={["price-lists", "pick-customer"]}
              mapOption={mapCustomer}
              selectedLabel={form.customerId ? lookups.customerName(form.customerId) || `Buyer ${shortId(form.customerId)}` : undefined}
              placeholder="No specific buyer"
              searchPlaceholder="Search by name, email or phone"
              clearable
              disabled={!lookups.canCustomers}
            />
          </Field>
          <div className="grid content-start gap-1.5 pt-6">
            <Switch checked={form.isDefault} onCheckedChange={(v) => set({ isDefault: Boolean(v) })} label="Default list" description="Applies to every buyer, not just the one above." />
          </div>
        </div>
        {appliesToNobody ? <Alert tone="warning">With no buyer and not marked default, this list won’t apply to anyone.</Alert> : null}

        <section className="grid gap-3" aria-labelledby="pl-items">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="pl-items" className="text-ui font-semibold text-fg">
              Items <span className="text-ui-sm font-normal text-fg-subtle">({form.items.length})</span>
            </h3>
            {errors.items || save.error?.fieldError?.("items") ? <p className="text-ui-xs text-danger-fg">{errors.items || save.error.fieldError("items")}</p> : null}
          </div>
          {form.items.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-ui-sm">
                <thead className="bg-surface-2 text-left text-ui-xs text-fg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Product / variant
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Selling price
                    </th>
                    <th scope="col" className="w-40 px-3 py-2 font-medium">
                      Contract price
                    </th>
                    <th scope="col" className="w-10 px-2 py-2">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.items.map((item, i) => {
                    const v = variantOf(item.variantId);
                    const product = productOf(v);
                    const label = v ? `${product || "Product"} — ${variantLabel(v)}` : `Variant ${shortId(item.variantId)}`;
                    return (
                      <tr key={item.variantId}>
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium text-fg">{v ? product || <span className="text-fg-muted">Product {shortId(v.productId)}</span> : <span className="font-mono text-fg-muted">Variant {shortId(item.variantId)}</span>}</div>
                          {v ? (
                            <div className="text-ui-xs text-fg-subtle">
                              {variantLabel(v)} · <span className="font-mono">{v.sku}</span>
                            </div>
                          ) : (
                            <div className="text-ui-xs text-fg-subtle">Variant not found (archived or deleted)</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          <Money value={v?.sellingPrice} />
                        </td>
                        <td className="px-3 py-1.5 align-top">
                          <Field label={`Contract price for ${label}`} labelHidden name={`items.${i}.unitPrice`} errors={save.error} error={errors[`items.${i}.unitPrice`]}>
                            <Input
                              size="sm"
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              prefix="₹"
                              onChange={(e) => set({ items: form.items.map((it, j) => (j === i ? { ...it, unitPrice: e.target.value } : it)) })}
                            />
                          </Field>
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <IconButton icon={Trash2} label={`Remove ${label}`} size="sm" variant="danger-ghost" onClick={() => set({ items: form.items.filter((_, j) => j !== i) })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-lg border border-border bg-surface-2 px-3 py-4 text-center text-ui-sm text-fg-muted">No items yet. Add variants below.</p>
          )}
          <AddItemRow
            existing={form.items.map((i) => i.variantId)}
            productNames={productNames}
            onAdd={(item, variant) => {
              setPickedVariants((m) => ({ ...m, [item.variantId]: variant }));
              setForm((f) => ({ ...f, items: [...f.items, item] }));
            }}
          />
        </section>

        {!editing ? (
          <Field label="When saved">
            <RadioGroup
              value={form.status}
              onValueChange={(v) => set({ status: v })}
              options={[
                { value: "draft", label: "Save as draft", description: "Prices don’t apply until it’s approved." },
                canApprove
                  ? { value: "live", label: "Activate", description: "Prices apply as soon as you save." }
                  : { value: "live", label: "Submit for approval", description: "Someone with pricing.approve must approve it first." },
              ]}
            />
          </Field>
        ) : null}
        {!canApprove && !editing ? <Alert tone="info">You don’t have pricing.approve, so price lists you activate are submitted for approval first.</Alert> : null}

        {general ? <Alert tone="danger">{general}</Alert> : null}
      </form>
    </FormSheet>
  );
}
