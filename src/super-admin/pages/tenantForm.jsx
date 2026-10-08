import { useRef } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { TENANT_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { Button, Card, Checkbox, Field, IconButton, Input, NativeSelect, Switch, Textarea } from "../../shared/ui/index.js";
import { changedFields } from "./lib/diff.jsx";

/*
 * Tenant profile form model shared by the create wizard and the tenant detail page.
 * Mirrors mspNode tenants/validators.js (createTenantSchema / updateTenantSchema).
 * Numbers are kept as strings while editing; `toPayload` converts them.
 */

export const NESTED = ["branding", "businessProfile", "taxSettings", "orderRules", "notificationPreferences", "pickupAddress"];
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const GSTIN = /^[0-9A-Z]{15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN = /^\d{6}$/;

let zoneSeq = 0;
const zoneKey = () => `z${Date.now().toString(36)}${(zoneSeq++).toString(36)}`;
const str = (v) => (v == null ? "" : String(v));

export function emptyZone() {
  return { key: zoneKey(), name: "", pincodes: "", radiusKm: "", latitude: "", longitude: "", etaDaysMin: "2", etaDaysMax: "7", deliveryFee: "0" };
}

export function emptyTenantForm() {
  return {
    name: "",
    slug: "",
    status: "pending",
    branding: { logo: "", primaryColor: "#322FBC", secondaryColor: "#8B8AAE" },
    businessProfile: { legalName: "", gstin: "", email: "", phone: "", website: "" },
    taxSettings: { defaultTaxRate: "0", currency: "INR" },
    orderRules: { minOrderValue: "0", allowBackorder: false },
    pickupAddress: { label: "Store pickup", contactName: "", phone: "", addressLine1: "", city: "", state: "", postalCode: "", country: "IN" },
    notificationPreferences: { email: true, inApp: true },
    deliveryZones: [],
    admin: { enabled: true, name: "", email: "", password: "" },
  };
}

export function formFromTenant(t = {}) {
  const e = emptyTenantForm();
  const pick = (base, src = {}) => Object.fromEntries(Object.keys(base).map((k) => [k, typeof base[k] === "boolean" ? Boolean(src[k] ?? base[k]) : str(src[k] ?? "")]));
  return {
    ...e,
    name: str(t.name),
    slug: str(t.slug),
    status: t.status || "pending",
    branding: pick(e.branding, t.branding),
    businessProfile: pick(e.businessProfile, t.businessProfile),
    taxSettings: { defaultTaxRate: str(t.taxSettings?.defaultTaxRate ?? 0), currency: "INR" },
    orderRules: { minOrderValue: str(t.orderRules?.minOrderValue ?? 0), allowBackorder: Boolean(t.orderRules?.allowBackorder) },
    pickupAddress: pick(e.pickupAddress, t.pickupAddress),
    notificationPreferences: { email: t.notificationPreferences?.email !== false, inApp: t.notificationPreferences?.inApp !== false },
    deliveryZones: (t.deliveryZones || []).map((z) => ({
      key: z._id ? String(z._id) : zoneKey(),
      name: str(z.name),
      pincodes: (z.pincodes || []).join(", "),
      radiusKm: str(z.radiusKm ?? ""),
      latitude: str(z.center?.latitude ?? ""),
      longitude: str(z.center?.longitude ?? ""),
      etaDaysMin: str(z.etaDaysMin ?? ""),
      etaDaysMax: str(z.etaDaysMax ?? ""),
      deliveryFee: str(z.deliveryFee ?? ""),
    })),
    admin: { enabled: false, name: "", email: "", password: "" },
  };
}

const num = (v) => (v === "" || v == null ? undefined : Number(v));
const pins = (s) =>
  String(s || "")
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

function zonePayload(z) {
  const out = { name: z.name.trim(), pincodes: pins(z.pincodes) };
  out.radiusKm = z.radiusKm === "" ? null : Number(z.radiusKm);
  if (z.latitude !== "" && z.longitude !== "") out.center = { latitude: Number(z.latitude), longitude: Number(z.longitude) };
  if (z.etaDaysMin !== "") out.etaDaysMin = Number(z.etaDaysMin);
  if (z.etaDaysMax !== "") out.etaDaysMax = Number(z.etaDaysMax);
  if (z.deliveryFee !== "") out.deliveryFee = Number(z.deliveryFee);
  return out;
}

/** API body from the form (profile fields only; no slug/status/admin). */
export function profilePayload(f) {
  const trimAll = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
  return {
    name: f.name.trim(),
    // Empty colours are omitted (the API only accepts a hex value for these keys).
    branding: Object.fromEntries(Object.entries(trimAll(f.branding)).filter(([k, v]) => !(["primaryColor", "secondaryColor"].includes(k) && !v))),
    businessProfile: { ...trimAll(f.businessProfile), gstin: f.businessProfile.gstin.trim().toUpperCase() },
    taxSettings: { defaultTaxRate: num(f.taxSettings.defaultTaxRate) ?? 0, currency: "INR" },
    orderRules: { minOrderValue: num(f.orderRules.minOrderValue) ?? 0, allowBackorder: Boolean(f.orderRules.allowBackorder) },
    pickupAddress: trimAll(f.pickupAddress),
    notificationPreferences: { ...f.notificationPreferences },
    deliveryZones: f.deliveryZones.map(zonePayload),
  };
}

export function createPayload(f) {
  const body = { ...profilePayload(f), status: f.status };
  if (f.slug.trim()) body.slug = f.slug.trim();
  if (f.admin.enabled) body.admin = { name: f.admin.name.trim(), email: f.admin.email.trim(), password: f.admin.password };
  return body;
}

/** Only what changed since `initial` (nested objects field-by-field; zones/pickup only when touched). */
export function updatePayload(initial, current) {
  return changedFields(profilePayload(initial), profilePayload(current), { nested: NESTED });
}

const len = (v, min, max, label) => {
  const s = String(v ?? "").trim();
  if (min && s.length < min) return min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`;
  if (max && s.length > max) return `${label} must be at most ${max} characters`;
  return null;
};
const range = (v, min, max, label, { int = false, required = false } = {}) => {
  if (v === "" || v == null) return required ? `${label} is required` : null;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number`;
  if (int && !Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`;
  return null;
};

/** Client validation mirroring the backend zod schema. Returns { "path": message }. */
export function validateTenantForm(f, { create = false, sections } = {}) {
  const e = {};
  const set = (k, msg) => msg && (e[k] = msg);
  const want = (s) => !sections || sections.includes(s);
  if (want("basics")) {
    set("name", len(f.name, 2, 120, "Store name"));
    if (create && f.slug.trim()) set("slug", len(f.slug, 2, 80, "Slug") || (!/^[a-z0-9-]+$/i.test(f.slug.trim()) ? "Use letters, numbers and dashes" : null));
    const b = f.businessProfile;
    set("businessProfile.legalName", len(b.legalName, 0, 200, "Legal name"));
    if (b.gstin.trim() && !GSTIN.test(b.gstin.trim().toUpperCase())) e["businessProfile.gstin"] = "GSTIN is 15 letters/digits, e.g. 07AABCA1234A1Z5";
    if (b.email.trim() && !EMAIL.test(b.email.trim())) e["businessProfile.email"] = "Enter a valid email";
    set("businessProfile.phone", len(b.phone, 0, 20, "Phone"));
    set("businessProfile.website", len(b.website, 0, 300, "Website"));
  }
  if (want("branding")) {
    set("branding.logo", len(f.branding.logo, 0, 500, "Logo URL"));
    ["primaryColor", "secondaryColor"].forEach((k) => {
      if (f.branding[k] && !HEX.test(f.branding[k])) e[`branding.${k}`] = "Use a hex colour like #322FBC";
    });
    set("taxSettings.defaultTaxRate", range(f.taxSettings.defaultTaxRate, 0, 28, "Default tax rate"));
    set("orderRules.minOrderValue", range(f.orderRules.minOrderValue, 0, 10000000, "Minimum order value"));
  }
  if (want("delivery")) {
    const p = f.pickupAddress;
    set("pickupAddress.label", len(p.label, 0, 80, "Label"));
    set("pickupAddress.contactName", len(p.contactName, 0, 120, "Contact name"));
    set("pickupAddress.phone", len(p.phone, 0, 20, "Phone"));
    set("pickupAddress.addressLine1", len(p.addressLine1, 0, 200, "Address"));
    set("pickupAddress.city", len(p.city, 0, 80, "City"));
    set("pickupAddress.state", len(p.state, 0, 80, "State"));
    if (p.postalCode.trim() && (p.country || "IN").toUpperCase() === "IN" && !PIN.test(p.postalCode.trim())) e["pickupAddress.postalCode"] = "Indian pincodes have 6 digits";
    else set("pickupAddress.postalCode", len(p.postalCode, 0, 12, "Postal code"));
    if (p.country && !/^[A-Za-z]{2}$/.test(p.country.trim())) e["pickupAddress.country"] = "Two-letter country code, e.g. IN";
    if (f.deliveryZones.length > 200) e.deliveryZones = "At most 200 zones";
    f.deliveryZones.forEach((z, i) => {
      const k = (n) => `deliveryZones.${i}.${n}`;
      set(k("name"), len(z.name, 1, 80, "Zone name"));
      const bad = pins(z.pincodes).filter((x) => !PIN.test(x));
      if (bad.length) e[k("pincodes")] = `Invalid pincode${bad.length > 1 ? "s" : ""}: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`;
      else if (pins(z.pincodes).length > 5000) e[k("pincodes")] = "At most 5000 pincodes";
      set(k("radiusKm"), range(z.radiusKm, 0, 2000, "Radius"));
      if ((z.latitude === "") !== (z.longitude === "")) e[k("latitude")] = "Enter both latitude and longitude";
      set(k("latitude"), range(z.latitude, -90, 90, "Latitude"));
      set(k("longitude"), range(z.longitude, -180, 180, "Longitude"));
      set(k("etaDaysMin"), range(z.etaDaysMin, 0, 60, "Min ETA", { int: true }));
      set(k("etaDaysMax"), range(z.etaDaysMax, 0, 90, "Max ETA", { int: true }));
      if (!e[k("etaDaysMax")] && z.etaDaysMin !== "" && z.etaDaysMax !== "" && Number(z.etaDaysMax) < Number(z.etaDaysMin)) e[k("etaDaysMax")] = "Max ETA must be ≥ min ETA";
      set(k("deliveryFee"), range(z.deliveryFee, 0, 100000, "Delivery fee"));
      if (!pins(z.pincodes).length && z.radiusKm === "") e[k("pincodes")] = e[k("pincodes")] || "Add pincodes or a radius";
    });
  }
  if (want("admin") && create && f.admin.enabled) {
    set("admin.name", len(f.admin.name, 2, 120, "Admin name"));
    if (!EMAIL.test(f.admin.email.trim())) e["admin.email"] = "Enter a valid email";
    if (f.admin.password.length < 8) e["admin.password"] = "At least 8 characters";
    else if (f.admin.password.length > 100) e["admin.password"] = "At most 100 characters";
  }
  return e;
}

/** Merge client errors with server ApiError.fields (server wins). */
export function errorsOf(clientErrors, apiError) {
  return { ...clientErrors, ...(apiError?.fields || {}) };
}

/* ------------------------------------------------------------------ field groups */

function useSetters(form, setForm) {
  const setTop = (k, v) => setForm({ ...form, [k]: v });
  const setIn = (group, k, v) => setForm({ ...form, [group]: { ...form[group], [k]: v } });
  return { setTop, setIn };
}

export function BasicsFields({ form, setForm, errors = {}, create = false, disabled }) {
  const { setTop, setIn } = useSetters(form, setForm);
  const b = form.businessProfile;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Store name" required error={errors.name} className="sm:col-span-2">
        <Input value={form.name} onChange={(e) => setTop("name", e.target.value)} maxLength={120} disabled={disabled} autoComplete="organization" />
      </Field>
      {create ? (
        <>
          <Field label="Slug" optional hint="Used in store URLs and can't be changed later. Generated from the name when empty." error={errors.slug}>
            <Input value={form.slug} onChange={(e) => setTop("slug", e.target.value.toLowerCase())} maxLength={80} placeholder="acme-wholesale" />
          </Field>
          <Field label="Initial status" hint="Pending/trial stores can be activated later." error={errors.status}>
            <NativeSelect value={form.status} onChange={(e) => setTop("status", e.target.value)} options={statusOptions(TENANT_STATUSES.filter((s) => s !== "archived" && s !== "suspended"))} />
          </Field>
        </>
      ) : null}
      <Field label="Legal name" optional error={errors["businessProfile.legalName"]}>
        <Input value={b.legalName} onChange={(e) => setIn("businessProfile", "legalName", e.target.value)} maxLength={200} disabled={disabled} />
      </Field>
      <Field label="GSTIN" optional hint="15 characters" error={errors["businessProfile.gstin"]}>
        <Input value={b.gstin} onChange={(e) => setIn("businessProfile", "gstin", e.target.value.toUpperCase())} maxLength={15} className="font-mono" disabled={disabled} />
      </Field>
      <Field label="Business email" optional error={errors["businessProfile.email"]}>
        <Input type="email" value={b.email} onChange={(e) => setIn("businessProfile", "email", e.target.value)} maxLength={254} disabled={disabled} />
      </Field>
      <Field label="Business phone" optional error={errors["businessProfile.phone"]}>
        <Input type="tel" value={b.phone} onChange={(e) => setIn("businessProfile", "phone", e.target.value)} maxLength={20} disabled={disabled} />
      </Field>
      <Field label="Website" optional error={errors["businessProfile.website"]} className="sm:col-span-2">
        <Input type="url" value={b.website} onChange={(e) => setIn("businessProfile", "website", e.target.value)} maxLength={300} placeholder="https://" disabled={disabled} />
      </Field>
    </div>
  );
}

function ColorField({ label, value, onChange, error, disabled }) {
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) && value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={9} className="font-mono" disabled={disabled} />
      </div>
    </Field>
  );
}

export function BrandingFields({ form, setForm, errors = {}, disabled }) {
  const { setIn } = useSetters(form, setForm);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Logo URL" optional hint="Square image, shown in the storefront header." error={errors["branding.logo"]} className="sm:col-span-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
            {form.branding.logo ? <img src={form.branding.logo} alt="" className="size-full object-cover" /> : <span className="text-ui-2xs text-fg-subtle">Logo</span>}
          </span>
          <Input value={form.branding.logo} onChange={(e) => setIn("branding", "logo", e.target.value)} maxLength={500} placeholder="https://…" disabled={disabled} />
        </div>
      </Field>
      <ColorField label="Primary colour" value={form.branding.primaryColor} onChange={(v) => setIn("branding", "primaryColor", v)} error={errors["branding.primaryColor"]} disabled={disabled} />
      <ColorField label="Secondary colour" value={form.branding.secondaryColor} onChange={(v) => setIn("branding", "secondaryColor", v)} error={errors["branding.secondaryColor"]} disabled={disabled} />
      <Field label="Default tax rate (%)" hint="0–28. Applied when a product has no tax class." error={errors["taxSettings.defaultTaxRate"]}>
        <Input type="number" inputMode="decimal" min={0} max={28} step="0.01" value={form.taxSettings.defaultTaxRate} onChange={(e) => setIn("taxSettings", "defaultTaxRate", e.target.value)} disabled={disabled} />
      </Field>
      <Field label="Currency" hint="The marketplace trades in INR only.">
        <Input value="INR" readOnly disabled />
      </Field>
      <Field label="Minimum order value" hint="In ₹. 0 = no minimum." error={errors["orderRules.minOrderValue"]}>
        <Input type="number" inputMode="decimal" min={0} max={10000000} step="1" prefix="₹" value={form.orderRules.minOrderValue} onChange={(e) => setIn("orderRules", "minOrderValue", e.target.value)} disabled={disabled} />
      </Field>
      <div className="grid content-end gap-3 pb-1">
        <Checkbox
          label="Allow backorders"
          description="Buyers can order more than the available stock."
          checked={form.orderRules.allowBackorder}
          onCheckedChange={(v) => setIn("orderRules", "allowBackorder", Boolean(v))}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
        <Switch label="Email notifications" description="Order and stock emails to the store." checked={form.notificationPreferences.email} onCheckedChange={(v) => setIn("notificationPreferences", "email", v)} disabled={disabled} />
        <Switch label="In-app notifications" description="Bell notifications for staff." checked={form.notificationPreferences.inApp} onCheckedChange={(v) => setIn("notificationPreferences", "inApp", v)} disabled={disabled} />
      </div>
    </div>
  );
}

export function PickupFields({ form, setForm, errors = {}, disabled }) {
  const { setIn } = useSetters(form, setForm);
  const p = form.pickupAddress;
  const f = (k, label, props = {}) => (
    <Field label={label} optional error={errors[`pickupAddress.${k}`]} className={props.wide ? "sm:col-span-2" : undefined}>
      <Input value={p[k]} onChange={(e) => setIn("pickupAddress", k, e.target.value)} disabled={disabled} maxLength={props.max} type={props.type} inputMode={props.inputMode} />
    </Field>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {f("label", "Label", { max: 80 })}
      {f("contactName", "Contact name", { max: 120 })}
      {f("phone", "Phone", { max: 20, type: "tel" })}
      {f("addressLine1", "Address", { max: 200, wide: true })}
      {f("city", "City", { max: 80 })}
      {f("state", "State", { max: 80 })}
      {f("postalCode", "Pincode", { max: 12, inputMode: "numeric" })}
      {f("country", "Country", { max: 2 })}
    </div>
  );
}

export function ZonesEditor({ zones, onChange, errors = {}, disabled }) {
  const lastAdded = useRef(null);
  const update = (i, k, v) => onChange(zones.map((z, j) => (j === i ? { ...z, [k]: v } : z)));
  const move = (i, d) => {
    const next = [...zones];
    const [z] = next.splice(i, 1);
    next.splice(i + d, 0, z);
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      {errors.deliveryZones ? <p className="text-ui-xs text-danger-fg" role="alert">{errors.deliveryZones}</p> : null}
      {!zones.length ? <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-ui-sm text-fg-muted">No delivery zones. Buyers outside every zone can only use store pickup.</p> : null}
      {zones.map((z, i) => {
        const k = (n) => errors[`deliveryZones.${i}.${n}`];
        return (
          <Card key={z.key} className="grid gap-3 p-4" role="group" aria-label={`Zone ${i + 1}${z.name ? `: ${z.name}` : ""}`}>
            <div className="flex items-start gap-2">
              <Field label="Zone name" required error={k("name")} className="flex-1">
                <Input ref={i === zones.length - 1 ? lastAdded : undefined} value={z.name} onChange={(e) => update(i, "name", e.target.value)} maxLength={80} disabled={disabled} />
              </Field>
              <div className="flex shrink-0 gap-1 pt-6">
                <IconButton icon={ArrowUp} label="Move zone up" size="sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} />
                <IconButton icon={ArrowDown} label="Move zone down" size="sm" disabled={disabled || i === zones.length - 1} onClick={() => move(i, 1)} />
                <IconButton icon={Trash2} label="Remove zone" size="sm" variant="danger-ghost" disabled={disabled} onClick={() => onChange(zones.filter((_, j) => j !== i))} />
              </div>
            </div>
            <Field label="Pincodes" hint="6-digit pincodes separated by commas or spaces." error={k("pincodes")}>
              <Textarea rows={2} value={z.pincodes} onChange={(e) => update(i, "pincodes", e.target.value)} className="font-mono text-ui-sm" disabled={disabled} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Radius (km)" optional error={k("radiusKm")}>
                <Input type="number" min={0} max={2000} value={z.radiusKm} onChange={(e) => update(i, "radiusKm", e.target.value)} disabled={disabled} />
              </Field>
              <Field label="Centre latitude" optional error={k("latitude")}>
                <Input type="number" step="any" min={-90} max={90} value={z.latitude} onChange={(e) => update(i, "latitude", e.target.value)} disabled={disabled} />
              </Field>
              <Field label="Centre longitude" optional error={k("longitude")}>
                <Input type="number" step="any" min={-180} max={180} value={z.longitude} onChange={(e) => update(i, "longitude", e.target.value)} disabled={disabled} />
              </Field>
              <Field label="ETA min (days)" error={k("etaDaysMin")}>
                <Input type="number" min={0} max={60} step={1} value={z.etaDaysMin} onChange={(e) => update(i, "etaDaysMin", e.target.value)} disabled={disabled} />
              </Field>
              <Field label="ETA max (days)" error={k("etaDaysMax")}>
                <Input type="number" min={0} max={90} step={1} value={z.etaDaysMax} onChange={(e) => update(i, "etaDaysMax", e.target.value)} disabled={disabled} />
              </Field>
              <Field label="Delivery fee" error={k("deliveryFee")}>
                <Input type="number" min={0} max={100000} prefix="₹" value={z.deliveryFee} onChange={(e) => update(i, "deliveryFee", e.target.value)} disabled={disabled} />
              </Field>
            </div>
          </Card>
        );
      })}
      <div>
        <Button
          size="sm"
          leftIcon={Plus}
          disabled={disabled || zones.length >= 200}
          onClick={() => {
            onChange([...zones, emptyZone()]);
            setTimeout(() => lastAdded.current?.focus(), 0);
          }}
        >
          Add zone
        </Button>
      </div>
    </div>
  );
}

export function AdminFields({ form, setForm, errors = {} }) {
  const a = form.admin;
  const set = (k, v) => setForm({ ...form, admin: { ...a, [k]: v } });
  return (
    <div className="grid gap-4">
      <Switch
        label="Create a store admin now"
        description="The admin can sign in immediately (email is marked verified). You can also add staff later from the tenant's Staff tab."
        checked={a.enabled}
        onCheckedChange={(v) => set("enabled", v)}
      />
      {a.enabled ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Admin name" required error={errors["admin.name"]}>
            <Input value={a.name} onChange={(e) => set("name", e.target.value)} maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Admin email" required error={errors["admin.email"]}>
            <Input type="email" value={a.email} onChange={(e) => set("email", e.target.value)} maxLength={254} autoComplete="off" />
          </Field>
          <Field label="Temporary password" required hint="8–100 characters. Share it securely; ask them to change it." error={errors["admin.password"]} className="sm:col-span-2">
            <Input type="password" value={a.password} onChange={(e) => set("password", e.target.value)} maxLength={100} autoComplete="new-password" />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
