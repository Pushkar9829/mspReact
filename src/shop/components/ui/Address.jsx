import { useEffect, useRef, useState } from "react";
import { Building2, Check, MapPin, Phone } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { Badge } from "./Badge.jsx";
import { Checkbox, Field, Input, Select } from "./form.jsx";
import { api } from "../../../shared/api/index.js";
import { STATES, formatPhone, gstinError, normalizePhone, normalizeState, stateForGstin, stateForPin, validateAddress } from "../../lib/indianAddress.js";

/**
 * Address as a radio card (checkout) or a plain card (account).
 *   <AddressCard address={a} selectable checked={id === a.id} onSelect={() => setId(a.id)} onEdit={…} onDelete={…} />
 */
export function AddressCard({ address: a, selectable = false, checked = false, onSelect, onEdit, onDelete, onMakeDefault, compact = false, name = "address", className }) {
  if (!a) return null;
  const body = (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-shop-base font-semibold text-shop-ink">{a.contactName}</span>
        {a.label ? <Badge tone="neutral">{a.label}</Badge> : null}
        {a.isDefault ? <Badge tone="neutral" icon={Check}>Default</Badge> : null}
      </span>
      <span className={cn("mt-0.5 block text-shop-sm text-shop-text", compact && "truncate")}>
        {[a.addressLine1, a.addressLine2, a.city, normalizeState(a.state, a.stateCode)].filter(Boolean).join(", ")} <span className="tabular-nums">{a.postalCode}</span>
      </span>
      {!compact && a.phone ? (
        <span className="mt-0.5 flex items-center gap-1 text-shop-xs text-shop-muted">
          <Phone className="size-3.5" aria-hidden /> <span className="tabular-nums">{a.phone}</span>
        </span>
      ) : null}
    </span>
  );
  const actions =
    !compact && (onEdit || onDelete || (onMakeDefault && !a.isDefault)) ? (
      <span className="mt-2 flex flex-wrap gap-x-4">
        {onEdit ? <Button variant="link" size="sm" onClick={onEdit}>Edit</Button> : null}
        {onMakeDefault && !a.isDefault ? <Button variant="link" size="sm" onClick={onMakeDefault}>Make default</Button> : null}
        {onDelete ? <Button variant="link" size="sm" className="text-shop-danger-ink" onClick={onDelete}>Remove</Button> : null}
      </span>
    ) : null;

  if (selectable) {
    return (
      <div className={cn("rounded-card border bg-shop-card", checked ? "border-shop-primary ring-1 ring-shop-primary" : "border-shop-line hover:border-shop-line-strong", className)}>
        <label className="flex cursor-pointer items-start gap-3 p-4">
          <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-1 size-5 shrink-0 accent-[var(--shop-primary)]" />
          {body}
        </label>
        {actions ? <div className="-mt-3 px-4 pb-3 pl-12">{actions}</div> : null}
      </div>
    );
  }
  return (
    <div className={cn("flex items-start gap-3 rounded-card border border-shop-line bg-shop-card p-4", className)}>
      <MapPin className="mt-0.5 size-5 shrink-0 text-shop-muted" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        {body}
        {actions}
      </div>
    </div>
  );
}

export const EMPTY_ADDRESS = { label: "Shop", contactName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", isDefault: false, gstin: "", businessName: "" };

/** Form state → strict API body (POST/PATCH /addresses). Empty line 2 is sent as "" so it can be cleared. */
export function toAddressBody(form) {
  return {
    label: String(form.label || "").trim() || undefined,
    contactName: String(form.contactName || "").trim(),
    phone: formatPhone(form.phone),
    addressLine1: String(form.addressLine1 || "").trim(),
    addressLine2: String(form.addressLine2 || "").trim(),
    city: String(form.city || "").trim(),
    state: normalizeState(form.state),
    postalCode: String(form.postalCode || "").trim(),
    country: "IN",
    ...(form.isDefault ? { isDefault: true } : {}),
  };
}

/**
 * The one address form for the shop (checkout sheet, account, cart).
 *
 *   <AddressForm initial={address} onSubmit={async (body, extra) => …} busy={m.isPending} error={m.error} showBusiness />
 *
 * - +91 10-digit mobile, 6-digit PIN (state suggested from the PIN), state dropdown, autocomplete
 *   and inputMode on every field, inline errors (client + ApiError.fields), first error focused.
 * - `showBusiness`: optional "Invoice to my business" (GSTIN with check-digit validation + legal
 *   name). These are NOT address fields: they come back in `extra` ({ gstin, businessName }) for the
 *   caller to save on the profile (PATCH /auth/me profile.gstin / profile.company).
 */
export function AddressForm({ initial, onSubmit, onCancel, busy = false, error, submitLabel = "Save address", showBusiness = false, showDefault = true, id = "address-form" }) {
  // `state` may be a full name (normalised by the API), an old two-letter value or free text; the
  // dropdown needs the full name, so map it (stateCode first). Unknown text is kept as an extra option.
  const [form, setForm] = useState(() => ({
    ...EMPTY_ADDRESS,
    ...(initial || {}),
    state: normalizeState(initial?.state, initial?.stateCode),
    phone: initial?.phone ? normalizePhone(initial.phone) || initial.phone : "",
  }));
  const stateOptions = form.state && !STATES.includes(form.state) ? [form.state, ...STATES] : STATES;
  const [errors, setErrors] = useState({});
  const [business, setBusiness] = useState(Boolean(initial?.gstin));
  const [stateHint, setStateHint] = useState("");
  const formRef = useRef(null);

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  // PIN → state (postal circle, instant) then city/state from GET /location/pincode/:pin. Only empty
  // fields are filled, and the result may be approximate, so the buyer can always edit it.
  useEffect(() => {
    const pin = form.postalCode;
    const st = stateForPin(pin);
    if (st && !form.state) {
      setForm((f) => ({ ...f, state: st }));
      setStateHint(`State filled from PIN ${pin}`);
    }
    if (!/^[1-9]\d{5}$/.test(String(pin || ""))) return undefined;
    let alive = true;
    api
      .lookupPincode(pin)
      .then((r) => {
        if (!alive || !r?.found) return;
        const norm = normalizeState(r.state, r.stateCode);
        const state = STATES.includes(norm) ? norm : "";
        let filled = false;
        setForm((f) => {
          if (f.postalCode !== pin) return f;
          const next = { ...f };
          if (r.city && !String(f.city || "").trim()) {
            next.city = r.city;
            filled = true;
          }
          if (state && !f.state) {
            next.state = state;
            filled = true;
          }
          return next;
        });
        if (filled || r.city) setStateHint(`${[r.city, r.state].filter(Boolean).join(", ")} from PIN ${pin}${r.approximate ? " (please check)" : ""}`);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [form.postalCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const serverErrors = error?.fields || {};
  const err = (k) => errors[k] || serverErrors[k];

  async function submit(e) {
    e.preventDefault();
    const v = validateAddress({ ...form, gstin: business ? form.gstin : "" });
    if (business && form.gstin && stateForGstin(form.gstin) && form.state && stateForGstin(form.gstin) !== normalizeState(form.state)) {
      // Different state is allowed (inter-state supply), just tell the buyer.
      setStateHint(`GSTIN is registered in ${stateForGstin(form.gstin)}`);
    }
    setErrors(v);
    if (Object.keys(v).length) {
      const first = Object.keys(v)[0];
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    await onSubmit?.(toAddressBody(form), business ? { gstin: String(form.gstin || "").trim().toUpperCase(), businessName: String(form.businessName || "").trim() } : {});
  }

  return (
    <form id={id} ref={formRef} onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Receiver’s name" error={err("contactName")} required>
          <Input name="contactName" autoComplete="name" value={form.contactName} onChange={set("contactName")} />
        </Field>
        <Field label="Mobile number" hint="10-digit mobile, for delivery updates" error={err("phone")} required>
          <Input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} value={form.phone} onChange={(e) => set("phone")(e.target.value.replace(/[^\d ]/g, ""))} />
        </Field>
      </div>
      <Field label="Shop / building, street" error={err("addressLine1")} required>
        <Input name="addressLine1" autoComplete="address-line1" value={form.addressLine1} onChange={set("addressLine1")} />
      </Field>
      <Field label="Area, landmark" optional error={err("addressLine2")}>
        <Input name="addressLine2" autoComplete="address-line2" value={form.addressLine2} onChange={set("addressLine2")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="PIN code" error={err("postalCode")} required>
          <Input name="postalCode" inputMode="numeric" autoComplete="postal-code" pattern="[1-9][0-9]{5}" maxLength={6} value={form.postalCode} onChange={(e) => set("postalCode")(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </Field>
        <Field label="City" error={err("city")} required>
          <Input name="city" autoComplete="address-level2" value={form.city} onChange={set("city")} />
        </Field>
        <Field label="State" hint={stateHint || undefined} error={err("state")} required>
          <Select name="state" autoComplete="address-level1" value={form.state} onChange={set("state")} placeholder="Choose state" options={stateOptions} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label" optional hint="e.g. Shop, Godown, Home">
          <Input name="label" value={form.label} onChange={set("label")} maxLength={60} />
        </Field>
        {showDefault ? <Checkbox className="self-end" label="Make this my default address" checked={Boolean(form.isDefault)} onChange={set("isDefault")} /> : null}
      </div>

      {showBusiness ? (
        <div className="rounded-card border border-shop-line bg-shop-page p-3">
          <Checkbox label="Invoice to my business (GST)" description="Your GSTIN goes on the tax invoice so you can claim input credit." checked={business} onChange={(e) => setBusiness(e.target.checked)} />
          {business ? (
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" error={err("gstin") || (form.gstin && form.gstin.length === 15 ? gstinError(form.gstin) : "")} hint="15 characters, e.g. 27ABCDE1234F1Z5">
                <Input name="gstin" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={15} value={form.gstin} onChange={(e) => set("gstin")(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} className="uppercase tracking-wider" />
              </Field>
              <Field label="Legal business name" optional>
                <Input name="businessName" autoComplete="organization" value={form.businessName} onChange={set("businessName")} prefix={<Building2 className="size-4" aria-hidden />} />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {error && !Object.keys(serverErrors).length ? (
        <p role="alert" className="text-shop-sm font-medium text-shop-danger-ink">
          {error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
