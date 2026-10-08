import { useEffect, useId, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Power, PowerOff, Warehouse as WarehouseIcon } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { Alert, Button, ConfirmDialog, DataTable, Dialog, DropdownMenu, EmptyState, Field, FilterBar, IconButton, Input, MenuItem, Select, StatusPill } from "../../../shared/ui/index.js";
import { PREFIX, useWarehouses } from "./lib.js";

const LIMITS = { name: 120, code: 40, addressLine1: 300, city: 120, state: 120, postalCode: 20, country: 60 };
const EMPTY = { name: "", code: "", addressLine1: "", city: "", state: "", postalCode: "", country: "IN", latitude: "", longitude: "", status: "active" };

function toForm(w) {
  if (!w) return EMPTY;
  return {
    name: w.name || "",
    code: w.code || "",
    addressLine1: w.addressLine1 || "",
    city: w.city || "",
    state: w.state || "",
    postalCode: w.postalCode || "",
    country: w.country || "",
    latitude: w.latitude == null ? "" : String(w.latitude),
    longitude: w.longitude == null ? "" : String(w.longitude),
    status: w.status || "active",
  };
}

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = "Name is required";
  if (!form.code.trim()) errs.code = "Code is required";
  else if (!/^[A-Z0-9][A-Z0-9_-]*$/i.test(form.code.trim())) errs.code = "Use letters, numbers, - or _";
  Object.entries(LIMITS).forEach(([k, max]) => {
    if (!errs[k] && form[k].trim().length > max) errs[k] = `At most ${max} characters`;
  });
  if (form.postalCode.trim() && !/^[A-Za-z0-9 -]+$/.test(form.postalCode.trim())) errs.postalCode = "Invalid postal code";
  [
    ["latitude", 90],
    ["longitude", 180],
  ].forEach(([k, bound]) => {
    const v = form[k].trim();
    if (v === "") return;
    const n = Number(v);
    if (!Number.isFinite(n) || Math.abs(n) > bound) errs[k] = `Enter a number between −${bound} and ${bound}`;
  });
  if ((form.latitude.trim() === "") !== (form.longitude.trim() === "")) {
    errs[form.latitude.trim() === "" ? "latitude" : "longitude"] = "Enter both latitude and longitude, or neither";
  }
  return errs;
}

/** Body for POST (all set fields) or PATCH (changed fields only; cleared coordinates → null). */
function toBody(form, original) {
  const out = {};
  const str = ["name", "code", "addressLine1", "city", "state", "postalCode", "country", "status"];
  str.forEach((k) => {
    const v = k === "code" ? form[k].trim().toUpperCase() : form[k].trim();
    if (!original) {
      if (v !== "") out[k] = v;
    } else if (v !== String(original[k] ?? "")) out[k] = v;
  });
  ["latitude", "longitude"].forEach((k) => {
    const v = form[k].trim();
    const n = v === "" ? null : Number(v);
    if (!original) {
      if (n != null) out[k] = n;
    } else if (n !== (original[k] ?? null)) out[k] = n;
  });
  return out;
}

export function WarehouseDialog({ open, onOpenChange, warehouse }) {
  const formId = useId();
  const editing = Boolean(warehouse?._id);
  const initial = useMemo(() => toForm(warehouse), [warehouse]);
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const save = useApiMutation((body) => (editing ? api.updateWarehouse(warehouse._id, body) : api.createWarehouse(body)), {
    invalidate: [keys.warehouses.all, keys.inventory.all],
    success: editing ? "Warehouse saved" : "Warehouse created",
    error: false,
  });

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setTouched(false);
    setConfirmDiscard(false);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const errs = validate(form);
  const body = toBody(form, editing ? warehouse : null);
  const hasErrors = Object.keys(errs).length > 0;
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });

  // Server errors: zod "field: msg" → fields; duplicate code → 409 DUPLICATE ("tenantId already exists").
  const apiErr = save.error;
  const dupCode = apiErr?.status === 409 || apiErr?.code === "DUPLICATE";
  const fieldErr = (k) => (touched ? errs[k] : undefined) || (k === "code" && dupCode ? `Code ${form.code.trim().toUpperCase()} is already used by another warehouse` : apiErr?.fieldError?.(k));
  const generalErr = apiErr && !dupCode && !Object.keys(apiErr.fields || {}).length ? apiErr : null;

  function requestClose(next) {
    if (next) return onOpenChange(true);
    if (dirty && !save.isPending) return setConfirmDiscard(true);
    return onOpenChange(false);
  }

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || save.isPending) return;
    if (editing && !Object.keys(body).length) return onOpenChange(false);
    save.mutate(body, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={requestClose}
        title={editing ? `Edit ${warehouse.name}` : "New warehouse"}
        description={editing ? "Changes apply to new orders immediately." : "Stock is tracked per warehouse. Buyers are served from the nearest active warehouse with stock."}
        dirty={dirty}
        busy={save.isPending}
        size="lg"
        footer={
          <>
            <Button onClick={() => requestClose(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" form={formId} variant="primary" loading={save.isPending} disabled={editing && !dirty}>
              {editing ? "Save changes" : "Create warehouse"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Name" required error={fieldErr("name")}>
            <Input value={form.name} onChange={set("name")} maxLength={LIMITS.name + 10} autoComplete="off" placeholder="e.g. Pune Hub" />
          </Field>
          <Field label="Code" required error={fieldErr("code")} hint="Short unique code, stored in capitals.">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={LIMITS.code + 5} autoComplete="off" className="font-mono" placeholder="PUN-01" />
          </Field>
          <Field label="Address" optional className="sm:col-span-2" error={fieldErr("addressLine1")}>
            <Input value={form.addressLine1} onChange={set("addressLine1")} maxLength={LIMITS.addressLine1 + 10} />
          </Field>
          <Field label="City" optional error={fieldErr("city")}>
            <Input value={form.city} onChange={set("city")} />
          </Field>
          <Field label="State" optional error={fieldErr("state")}>
            <Input value={form.state} onChange={set("state")} />
          </Field>
          <Field label="Postal code" optional error={fieldErr("postalCode")}>
            <Input value={form.postalCode} onChange={set("postalCode")} inputMode="numeric" />
          </Field>
          <Field label="Country" optional error={fieldErr("country")}>
            <Input value={form.country} onChange={set("country")} />
          </Field>
          <Field label="Latitude" optional error={fieldErr("latitude")} hint="Used to pick the nearest warehouse.">
            <Input value={form.latitude} onChange={set("latitude")} inputMode="decimal" placeholder="18.52" />
          </Field>
          <Field label="Longitude" optional error={fieldErr("longitude")}>
            <Input value={form.longitude} onChange={set("longitude")} inputMode="decimal" placeholder="73.85" />
          </Field>
          {!editing ? (
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={set("status")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Field>
          ) : null}
          {generalErr ? (
            <Alert tone="danger" className="sm:col-span-2">
              {generalErr.message}
            </Alert>
          ) : null}
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard changes?"
        description="Your edits to this warehouse haven’t been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  );
}

export function WarehousesTab({ onEdit, onCreate }) {
  const can = useCan();
  const warehouses = useWarehouses();
  const table = useUrlTableState({ filters: ["status"], defaults: { limit: 50 }, prefix: PREFIX.wh });
  const [toggle, setToggle] = useState(null);
  const setStatus = useApiMutation(({ id, status }) => api.updateWarehouse(id, { status }), {
    invalidate: [keys.warehouses.all, keys.inventory.all],
    success: (_d, v) => (v.status === "active" ? "Warehouse activated" : "Warehouse deactivated"),
    error: false,
  });

  const rows = useMemo(() => {
    const term = table.q.trim().toLowerCase();
    return warehouses.list.filter(
      (w) =>
        (!table.filters.status || w.status === table.filters.status) &&
        (!term || [w.name, w.code, w.city, w.state].some((v) => String(v || "").toLowerCase().includes(term)))
    );
  }, [warehouses.list, table.q, table.filters.status]);

  const columns = [
    {
      id: "name",
      header: "Warehouse",
      primary: true,
      mobile: "title",
      cell: (w) => (
        <div className="min-w-0">
          <p className="font-medium text-fg">{w.name}</p>
          <p className="font-mono text-ui-xs text-fg-muted">{w.code}</p>
        </div>
      ),
      csv: (w) => w.name,
    },
    { id: "code", header: "Code", accessorKey: "code", defaultHidden: true, mobile: "hidden" },
    {
      id: "address",
      header: "Address",
      mobile: "subtitle",
      cell: (w) => {
        const text = [w.addressLine1, w.city, w.state, w.postalCode].filter(Boolean).join(", ");
        return text ? <span className="block max-w-96 truncate text-fg-muted" title={text}>{text}</span> : <span className="text-fg-subtle">—</span>;
      },
      csv: (w) => [w.addressLine1, w.city, w.state, w.postalCode, w.country].filter(Boolean).join(", "),
    },
    {
      id: "location",
      header: "Coordinates",
      mobile: "hidden",
      cell: (w) => (w.latitude != null && w.longitude != null ? <span className="tabular-nums text-ui-xs text-fg-muted">{`${w.latitude}, ${w.longitude}`}</span> : <span className="text-ui-xs text-warning-fg">Not set</span>),
      csv: (w) => (w.latitude != null ? `${w.latitude},${w.longitude}` : ""),
    },
    { id: "status", header: "Status", cell: (w) => <StatusPill status={w.status} />, csv: (w) => w.status },
    {
      id: "actions",
      header: "",
      hideable: false,
      csv: false,
      width: 48,
      align: "right",
      cell: (w) =>
        can("warehouses.edit") ? (
          <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${w.name}`} size="sm" />}>
            <MenuItem icon={Pencil} onSelect={() => onEdit(w)}>
              Edit…
            </MenuItem>
            {w.status === "inactive" ? (
              <MenuItem icon={Power} onSelect={() => setToggle(w)}>
                Activate…
              </MenuItem>
            ) : (
              <MenuItem icon={PowerOff} tone="danger" onSelect={() => setToggle(w)}>
                Deactivate…
              </MenuItem>
            )}
          </DropdownMenu>
        ) : null,
    },
  ];

  const deactivating = toggle?.status !== "inactive";
  const activeCount = warehouses.list.filter((w) => w.status !== "inactive").length;

  return (
    <>
      <DataTable
        storageKey="tenant-inventory-warehouses"
        exportFilename="warehouses"
        caption="Warehouses"
        table={table}
        data={rows}
        loading={warehouses.isPending}
        fetching={warehouses.isFetching}
        error={warehouses.error}
        onRetry={warehouses.refetch}
        pagination={false}
        columns={columns}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Search name, code or city"
            facets={[
              {
                key: "status",
                title: "Status",
                options: [
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ],
              },
            ]}
          />
        }
        emptyState={
          table.activeCount ? (
            <EmptyState icon={WarehouseIcon} title="No warehouses match" action={<Button size="sm" onClick={table.reset}>Clear filters</Button>} />
          ) : (
            <EmptyState
              icon={WarehouseIcon}
              title="No warehouses yet"
              description="Add the places you ship from. Stock is tracked separately in each warehouse."
              action={
                <PermissionGate perm="warehouses.create">
                  <Button size="sm" variant="primary" onClick={onCreate}>
                    New warehouse
                  </Button>
                </PermissionGate>
              }
            />
          )
        }
      />
      <ConfirmDialog
        open={Boolean(toggle)}
        onOpenChange={(v) => !v && setToggle(null)}
        title={toggle ? `${deactivating ? "Deactivate" : "Activate"} ${toggle.name}?` : ""}
        description={
          deactivating
            ? "Stock in an inactive warehouse is not picked for new orders. Existing reservations and confirmed orders are unaffected, and you can still adjust or transfer its stock."
            : "Stock in this warehouse becomes available to new orders again."
        }
        confirmLabel={deactivating ? "Deactivate" : "Activate"}
        tone={deactivating ? "danger" : "primary"}
        onConfirm={() => setStatus.mutateAsync({ id: toggle._id, status: deactivating ? "inactive" : "active" })}
      >
        {deactivating && activeCount <= 1 ? <Alert tone="warning">This is your only active warehouse. Buyers won’t be able to order stocked items until another warehouse is active.</Alert> : null}
      </ConfirmDialog>
    </>
  );
}
