import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, CircleCheck, MoreHorizontal, Pencil, Plus, TicketPercent } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { COUPON_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import {
  Alert,
  Button,
  ConfirmDialog,
  CopyButton,
  DataTable,
  DropdownMenu,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  Money,
  Select,
  StatusPill,
  Switch,
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
  fromLocal,
  generalError,
  localFromNow,
  mapProduct,
  numStr,
  productSearch,
  toLocal,
  toNumber,
  useLookups,
  validityCsv,
} from "./shared.jsx";

const CODE_RE = /^[A-Za-z0-9_-]+$/;

function couponValue(c) {
  if (c.type === "percent") return <span className="tabular-nums">{c.value}% off</span>;
  return (
    <span>
      <Money value={c.value} /> off
    </span>
  );
}

/* ------------------------------------------------------------------ list */

export function CouponsTab({ onCreate, onEdit }) {
  const can = useCan();
  const table = useUrlTableState({ filters: ["status"], prefix: "c_", defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.coupons.list(table.query), queryFn: () => api.listCoupons(table.query), ...listQueryOptions });
  const [disabling, setDisabling] = useState(null);
  const [enabling, setEnabling] = useState(null);
  const disable = useApiMutation((id) => api.disableCoupon(id), { invalidate: [keys.coupons.all], success: "Coupon disabled", error: false });
  const enable = useApiMutation((id) => api.enableCoupon(id), { invalidate: [keys.coupons.all], success: (c) => `Coupon ${c?.code || ""} re-enabled`, error: false });

  // PATCH /coupons/:id needs coupons.edit or coupons.create; disable needs coupons.disable;
  // re-enable needs coupons.edit or coupons.disable.
  const canEdit = can(["coupons.edit", "coupons.create"]);
  const canDisable = can("coupons.disable");
  const canEnable = can(["coupons.edit", "coupons.disable"]);

  const columns = useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        primary: true,
        mobile: "title",
        cell: (c) => (
          <span className="relative z-[1] inline-flex items-center gap-1">
            <span className="font-mono font-semibold tracking-wide text-fg">{c.code}</span>
            <CopyButton value={c.code} label={`Copy ${c.code}`} />
          </span>
        ),
        csv: (c) => c.code,
      },
      { id: "name", header: "Name", accessorKey: "name", mobile: "subtitle" },
      { id: "discount", header: "Discount", cell: couponValue, csv: (c) => `${c.type}:${c.value}`, mobile: "meta" },
      { id: "minCart", header: "Min. cart", align: "right", cell: (c) => (c.minCartValue ? <Money value={c.minCartValue} /> : <span className="text-fg-subtle">None</span>), csv: (c) => c.minCartValue },
      {
        id: "redemptions",
        header: "Redemptions",
        align: "right",
        cell: (c) => (
          <span className="tabular-nums">
            {c.redemptionCount ?? 0}
            <span className="text-fg-subtle"> / {c.maxRedemptions == null ? "∞" : c.maxRedemptions}</span>
          </span>
        ),
        csv: (c) => `${c.redemptionCount ?? 0}/${c.maxRedemptions ?? ""}`,
        mobile: "meta",
      },
      { id: "perCustomer", header: "Per buyer", align: "right", cell: (c) => <span className="tabular-nums">{c.perCustomerLimit ?? 1}×</span>, csv: (c) => c.perCustomerLimit, mobile: "hidden" },
      {
        id: "rules",
        header: "Rules",
        mobile: "hidden",
        defaultHidden: true,
        cell: (c) => (
          <div className="grid text-ui-xs text-fg-muted">
            <span>{appliesToLabel(c.appliesTo)}</span>
            {c.firstOrderOnly ? <span>First order only</span> : null}
            {c.excludedProductIds?.length ? <span>{c.excludedProductIds.length} excluded product(s)</span> : null}
          </div>
        ),
        csv: (c) => [c.appliesTo, c.firstOrderOnly ? "first-order" : "", c.excludedProductIds?.length ? `${c.excludedProductIds.length} excluded` : ""].filter(Boolean).join("; "),
      },
      { id: "validity", header: "Validity (IST)", cell: (c) => <ValidityCell startsAt={c.startsAt} endsAt={c.endsAt} />, csv: validityCsv, mobile: "meta" },
      { id: "status", header: "Status", cell: (c) => <StatusPill status={c.status} />, csv: (c) => c.status, mobile: "meta" },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        hideable: false,
        align: "right",
        csv: false,
        cell: (c) => (
          <div className="relative z-[1] flex justify-end">
            <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${c.code}`} size="sm" />}>
              <GatedMenuItem icon={Pencil} allowed={canEdit} perm="coupons.edit" onSelect={() => onEdit(c)}>
                Edit
              </GatedMenuItem>
              {c.status === "active" ? (
                <GatedMenuItem icon={Ban} tone="danger" allowed={canDisable} perm="coupons.disable" onSelect={() => setDisabling(c)}>
                  Disable
                </GatedMenuItem>
              ) : (
                <GatedMenuItem icon={CircleCheck} allowed={canEnable} perm="coupons.edit" onSelect={() => setEnabling(c)}>
                  Re-enable
                </GatedMenuItem>
              )}
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [canEdit, canDisable, canEnable, onEdit]
  );

  const filtered = table.activeCount > 0;
  return (
    <>
      <DataTable
        storageKey="tenant-coupons"
        exportFilename="coupons"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        toolbar={<FilterBar table={table} searchPlaceholder="Search code or name" facets={[{ key: "status", title: "Status", options: statusOptions(COUPON_STATUSES) }]} />}
        columns={columns}
        emptyState={
          filtered ? (
            <EmptyState icon={TicketPercent} title="No coupons match" description="Try a different search or status." action={<Button onClick={table.reset}>Clear filters</Button>} />
          ) : (
            <EmptyState
              icon={TicketPercent}
              title="No coupons yet"
              description="Coupons are codes buyers enter at checkout for a percentage or fixed discount."
              action={
                <PermissionGate perm="coupons.create">
                  <Button variant="primary" leftIcon={Plus} onClick={onCreate}>
                    Create coupon
                  </Button>
                </PermissionGate>
              }
            />
          )
        }
      />
      <ConfirmDialog
        open={Boolean(disabling)}
        onOpenChange={(v) => !v && setDisabling(null)}
        title={`Disable coupon ${disabling?.code}?`}
        description="Buyers can no longer apply this code, and carts that already have it applied lose the discount at checkout. You can re-enable it later; redemption counts are kept."
        confirmLabel="Disable coupon"
        tone="danger"
        onConfirm={() => disable.mutateAsync(disabling._id)}
      />
      <ConfirmDialog
        open={Boolean(enabling)}
        onOpenChange={(v) => !v && setEnabling(null)}
        title={`Re-enable coupon ${enabling?.code}?`}
        description={`Buyers can apply this code again${enabling?.endsAt && new Date(enabling.endsAt) < new Date() ? ", but its validity window has already ended — edit the end date or it still won’t apply" : " within its validity window"}. Existing redemptions (${enabling?.redemptionCount ?? 0}${enabling?.maxRedemptions != null ? ` of ${enabling.maxRedemptions}` : ""}) still count toward the limits.`}
        confirmLabel="Re-enable coupon"
        onConfirm={() => enable.mutateAsync(enabling._id)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ form */

const FIELD_NAMES = ["code", "name", "type", "value", "minCartValue", "maxRedemptions", "perCustomerLimit", "excludedProductIds", "appliesTo", "firstOrderOnly", "startsAt", "endsAt"];

function initialForm(c) {
  if (!c) {
    return {
      code: "",
      name: "",
      type: "percent",
      value: "",
      minCartValue: "",
      maxRedemptions: "",
      perCustomerLimit: "1",
      excludedProductIds: [],
      appliesTo: "all",
      firstOrderOnly: false,
      startsAt: localFromNow(0),
      endsAt: "",
    };
  }
  return {
    code: c.code || "",
    name: c.name || "",
    type: c.type || "percent",
    value: numStr(c.value),
    minCartValue: c.minCartValue ? String(c.minCartValue) : "",
    maxRedemptions: numStr(c.maxRedemptions),
    perCustomerLimit: numStr(c.perCustomerLimit ?? 1),
    excludedProductIds: (c.excludedProductIds || []).map(String),
    appliesTo: c.appliesTo || "all",
    firstOrderOnly: Boolean(c.firstOrderOnly),
    startsAt: toLocal(c.startsAt),
    endsAt: toLocal(c.endsAt),
  };
}

function toBody(f) {
  return {
    code: f.code.trim().toUpperCase(),
    name: f.name.trim(),
    type: f.type,
    value: toNumber(f.value),
    minCartValue: toNumber(f.minCartValue) ?? 0,
    maxRedemptions: toNumber(f.maxRedemptions),
    perCustomerLimit: toNumber(f.perCustomerLimit) ?? 1,
    excludedProductIds: f.excludedProductIds,
    appliesTo: f.appliesTo,
    firstOrderOnly: f.firstOrderOnly,
    startsAt: f.startsAt ? fromLocal(f.startsAt) : null,
    endsAt: f.endsAt ? fromLocal(f.endsAt) : null,
  };
}

const isInt = (n) => Number.isInteger(n);

function validate(f) {
  const e = {};
  const code = f.code.trim();
  if (code.length < 2 || code.length > 40) e.code = "Use 2–40 characters";
  else if (!CODE_RE.test(code)) e.code = "Use letters, digits, - or _";
  const name = f.name.trim();
  if (!name) e.name = "Name is required";
  else if (name.length > 120) e.name = "Use 120 characters or fewer";
  const v = toNumber(f.value);
  if (v == null) e.value = "Enter a discount value";
  else if (Number.isNaN(v) || v < 0) e.value = "Enter a number of 0 or more";
  else if (f.type === "percent" && v > 100) e.value = "Percent coupons cannot exceed 100";
  else if (v > MONEY_MAX) e.value = "Value is too large";
  const min = toNumber(f.minCartValue);
  if (min != null && (Number.isNaN(min) || min < 0 || min > MONEY_MAX)) e.minCartValue = "Enter an amount of 0 or more";
  const max = toNumber(f.maxRedemptions);
  if (max != null && (Number.isNaN(max) || !isInt(max) || max < 1)) e.maxRedemptions = "Enter a whole number of 1 or more, or leave blank";
  const per = toNumber(f.perCustomerLimit);
  if (per != null && (Number.isNaN(per) || !isInt(per) || per < 1 || per > 1000)) e.perCustomerLimit = "Enter a whole number from 1 to 1000";
  if (f.startsAt && f.endsAt && fromLocal(f.endsAt) <= fromLocal(f.startsAt)) e.endsAt = "End must be after the start";
  if (f.excludedProductIds.length > 1000) e.excludedProductIds = "At most 1000 products";
  return e;
}

export function CouponForm({ open, coupon, onClose }) {
  const editing = Boolean(coupon);
  const initial = useMemo(() => initialForm(coupon), [coupon]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const lookups = useLookups({ products: open });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = useApiMutation((body) => (editing ? api.updateCoupon(coupon._id, body) : api.createCoupon(body)), {
    invalidate: [keys.coupons.all],
    success: (d) => (editing ? `Coupon ${d?.code || ""} saved` : `Coupon ${d?.code || ""} created`),
    error: false,
    onSuccess: () => onClose(),
  });

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const initialBody = useMemo(() => toBody(initial), [initial]);

  function submit(e) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = toBody(form);
    if (editing) {
      const changes = changedFields(initialBody, body);
      if (!Object.keys(changes).length) return onClose();
      save.mutate(changes);
    } else {
      // Create: omit empty optionals rather than sending defaults.
      if (!form.minCartValue) delete body.minCartValue;
      if (!form.startsAt) delete body.startsAt;
      if (!form.endsAt) delete body.endsAt;
      if (!body.excludedProductIds.length) delete body.excludedProductIds;
      save.mutate(body);
    }
  }

  // 409 DUPLICATE_COUPON_CODE (or a raw DUPLICATE on the unique index): show it on the code field.
  const duplicate = save.error?.code === "DUPLICATE_COUPON_CODE" || save.error?.code === "DUPLICATE";
  const general = duplicate ? "" : generalError(save.error, FIELD_NAMES);
  const fieldProps = (name) => ({
    name,
    errors: save.error,
    error: errors[name] || (name === "code" && duplicate ? "A coupon with this code already exists in your store" : undefined),
  });

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit coupon" : "Create coupon"}
      description={editing ? coupon.code : "A code buyers enter at checkout."}
      dirty={dirty}
      busy={save.isPending}
      footer={(requestClose) => (
        <>
          <Button onClick={requestClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="coupon-form" variant="primary" loading={save.isPending} disabled={editing && !dirty}>
            {editing ? "Save changes" : "Create coupon"}
          </Button>
        </>
      )}
    >
      <form id="coupon-form" onSubmit={submit} noValidate className="grid gap-5">
        {editing && coupon.status === "disabled" ? (
          <Alert tone="warning">This coupon is disabled. Edits are saved; re-enable it from the coupon list so buyers can use it.</Alert>
        ) : null}
        {editing && (coupon.redemptionCount || 0) > 0 ? (
          <Alert tone="info">
            Redeemed {coupon.redemptionCount} time{coupon.redemptionCount === 1 ? "" : "s"}. Changes apply to future redemptions only.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required hint="Letters, digits, - or _. Saved in upper case." {...fieldProps("code")}>
            <Input
              value={form.code}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              className="font-mono uppercase"
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
              placeholder="WELCOME10"
              autoFocus
            />
          </Field>
          <Field label="Name" required hint="Shown to buyers with the discount." {...fieldProps("name")}>
            <Input value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} placeholder="Welcome 10% off" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" required {...fieldProps("type")}>
            <Select
              value={form.type}
              onValueChange={(v) => set({ type: v })}
              options={[
                { value: "percent", label: "Percentage of eligible items" },
                { value: "fixed", label: "Fixed amount off eligible items" },
              ]}
            />
          </Field>
          <Field label={form.type === "percent" ? "Discount (%)" : "Discount (₹)"} required {...fieldProps("value")}>
            <Input type="number" inputMode="decimal" min="0" step="any" value={form.value} onChange={(e) => set({ value: e.target.value })} suffix={form.type === "percent" ? "%" : "₹"} />
          </Field>
        </div>

        <fieldset className="grid gap-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-ui-sm font-semibold text-fg">Limits</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Minimum cart (₹)" optional {...fieldProps("minCartValue")}>
              <Input type="number" inputMode="decimal" min="0" step="any" value={form.minCartValue} onChange={(e) => set({ minCartValue: e.target.value })} placeholder="None" />
            </Field>
            <Field label="Total redemptions" optional hint="Blank = unlimited" {...fieldProps("maxRedemptions")}>
              <Input type="number" inputMode="numeric" min="1" step="1" value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} placeholder="Unlimited" />
            </Field>
            <Field label="Uses per buyer" hint="1–1000" {...fieldProps("perCustomerLimit")}>
              <Input type="number" inputMode="numeric" min="1" max="1000" step="1" value={form.perCustomerLimit} onChange={(e) => set({ perCustomerLimit: e.target.value })} />
            </Field>
          </div>
          <Field label="Applies to" {...fieldProps("appliesTo")}>
            <Select value={form.appliesTo} onValueChange={(v) => set({ appliesTo: v })} options={APPLIES_TO_OPTIONS} />
          </Field>
          <Field label="Excluded products" optional hint="The discount isn’t applied to these items." {...fieldProps("excludedProductIds")}>
            <MultiPicker
              aria-label="Exclude product"
              value={form.excludedProductIds}
              onChange={(v) => set({ excludedProductIds: v })}
              search={productSearch}
              queryKey={["coupons", "pick-product"]}
              mapOption={mapProduct}
              nameOf={lookups.productName}
              resolve={lookups.resolveProduct}
              placeholder="No exclusions — search to add"
              searchPlaceholder="Search products"
            />
          </Field>
          <Switch
            checked={form.firstOrderOnly}
            onCheckedChange={(v) => set({ firstOrderOnly: Boolean(v) })}
            label="First order only"
            description="Only valid on a buyer’s first order with your store."
          />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts (IST)" optional hint="Blank = valid immediately" {...fieldProps("startsAt")}>
            <DateTimeInput value={form.startsAt} onChange={(v) => set({ startsAt: v })} />
          </Field>
          <Field label="Ends (IST)" optional hint="Blank = never expires" {...fieldProps("endsAt")}>
            <DateTimeInput value={form.endsAt} onChange={(v) => set({ endsAt: v })} min={form.startsAt || undefined} />
          </Field>
        </div>

        {!editing ? <p className="text-ui-xs text-fg-subtle">New coupons are active immediately (within their validity window). Coupons don’t need approval.</p> : null}
        {general ? <Alert tone="danger">{general}</Alert> : null}
      </form>
    </FormSheet>
  );
}
