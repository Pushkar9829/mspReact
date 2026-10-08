import { useMemo, useState } from "react";
import { MapPin, Plus, Trash2, Truck } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { Alert, Badge, Button, Card, EmptyState, Field, FormSection, IconButton, Input, Money, Skeleton, Switch, Textarea, cn } from "../../../shared/ui/index.js";
import { PIN_RX, SettingLabel, SettingsSection, changed, makeErr, num, str, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

/* ================================================================== Pickup address */

const PICKUP_FIELDS = ["label", "contactName", "phone", "addressLine1", "city", "state", "postalCode", "country"];

function derivePickup(tenant) {
  const a = tenant?.pickupAddress || {};
  const out = {};
  PICKUP_FIELDS.forEach((k) => (out[k] = str(a[k])));
  if (!out.country) out.country = "IN";
  return out;
}

function validatePickup(f) {
  const e = {};
  const max = { label: 80, contactName: 120, phone: 20, addressLine1: 200, city: 80, state: 80 };
  Object.entries(max).forEach(([k, m]) => {
    if (f[k].trim().length > m) e[`pickupAddress.${k}`] = `Keep it under ${m} characters`;
  });
  if (f.postalCode.trim() && !PIN_RX.test(f.postalCode.trim())) e["pickupAddress.postalCode"] = "Enter a 6-digit PIN code";
  if (f.country.trim() && !/^[A-Za-z]{2}$/.test(f.country.trim())) e["pickupAddress.country"] = "Use a 2-letter country code, e.g. IN";
  return e;
}

export function PickupSection() {
  const { tenant } = useSettingsContext();
  const initial = useMemo(() => derivePickup(tenant), [tenant]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("pickup", dirty);
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validatePickup(form);
  const err = makeErr(showErrors, errors, outcome?.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const geo = tenant?.pickupAddress;

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const next = Object.fromEntries(PICKUP_FIELDS.map((k) => [k, k === "country" ? form[k].trim().toUpperCase() : form[k].trim()]));
    const pickupAddress = changed(base, next);
    if (!Object.keys(pickupAddress).length) return;
    const result = await saver.run([{ label: "Pickup address", run: () => api.updateMyTenant({ pickupAddress }) }]);
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      setForm(next);
    }
  }

  return (
    <SettingsSection
      id="pickup"
      title="Pickup address"
      description="Where couriers collect orders. Saving re-locates the address on the map."
      dirty={dirty}
      saving={saver.pending}
      onSubmit={submit}
      onDiscard={() => {
        discard();
        setShowErrors(false);
        setOutcome(null);
      }}
      outcome={outcome}
    >
      <div className="grid max-w-3xl gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location name" optional error={err("pickupAddress.label")} hint="e.g. Okhla warehouse">
            <Input value={form.label} onChange={(e) => set({ label: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Contact name" optional error={err("pickupAddress.contactName")}>
            <Input value={form.contactName} onChange={(e) => set({ contactName: e.target.value })} maxLength={120} />
          </Field>
        </div>
        <Field label="Contact phone" optional error={err("pickupAddress.phone")}>
          <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={20} className="sm:max-w-xs" />
        </Field>
        <Field label="Address" optional error={err("pickupAddress.addressLine1")}>
          <Input value={form.addressLine1} onChange={(e) => set({ addressLine1: e.target.value })} maxLength={200} autoComplete="street-address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="City" optional error={err("pickupAddress.city")} className="sm:col-span-2">
            <Input value={form.city} onChange={(e) => set({ city: e.target.value })} maxLength={80} />
          </Field>
          <Field label="State" optional error={err("pickupAddress.state")}>
            <Input value={form.state} onChange={(e) => set({ state: e.target.value })} maxLength={80} />
          </Field>
          <Field label="PIN code" optional error={err("pickupAddress.postalCode")}>
            <Input inputMode="numeric" value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 6) })} maxLength={6} className="font-mono" />
          </Field>
        </div>
        <Field label="Country code" error={err("pickupAddress.country")} hint="Two letters, e.g. IN.">
          <Input value={form.country} onChange={(e) => set({ country: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} className="max-w-24 font-mono uppercase" />
        </Field>
        {geo?.latitude != null && geo?.longitude != null ? (
          <p className="flex items-start gap-2 text-ui-sm text-fg-muted">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Located at {Number(geo.latitude).toFixed(4)}, {Number(geo.longitude).toFixed(4)}
              {geo.formatted ? ` — ${geo.formatted}` : ""}
            </span>
          </p>
        ) : null}
      </div>
    </SettingsSection>
  );
}

/* ================================================================== Delivery zones */

let zoneSeq = 0;
function zoneKey() {
  zoneSeq += 1;
  return `new-${zoneSeq}`;
}

function deriveZones(tenant) {
  return (tenant?.deliveryZones || []).map((z, i) => ({
    key: String(z._id || `zone-${i}`),
    name: str(z.name),
    pincodes: (z.pincodes || []).join(", "),
    etaDaysMin: str(z.etaDaysMin ?? ""),
    etaDaysMax: str(z.etaDaysMax ?? ""),
    deliveryFee: str(z.deliveryFee ?? ""),
    radiusKm: z.radiusKm == null ? "" : str(z.radiusKm),
    center: z.center && z.center.latitude != null ? { latitude: z.center.latitude, longitude: z.center.longitude } : null,
  }));
}

function parsePincodes(text) {
  const tokens = String(text || "")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid = [];
  const invalid = [];
  const seen = new Set();
  let duplicates = 0;
  tokens.forEach((t) => {
    if (!PIN_RX.test(t)) invalid.push(t);
    else if (seen.has(t)) duplicates += 1;
    else {
      seen.add(t);
      valid.push(t);
    }
  });
  return { valid, invalid, duplicates };
}

function intIn(v, min, max) {
  const n = num(v);
  return Number.isInteger(n) && n >= min && n <= max;
}

function validateZones(zones, pickupCenter) {
  const e = {};
  const names = new Set();
  zones.forEach((z, i) => {
    const p = `deliveryZones.${i}`;
    const name = z.name.trim();
    if (!name) e[`${p}.name`] = "Give the zone a name";
    else if (name.length > 80) e[`${p}.name`] = "Keep it under 80 characters";
    else if (names.has(name.toLowerCase())) e[`${p}.name`] = "Another zone has this name";
    names.add(name.toLowerCase());
    const pins = parsePincodes(z.pincodes);
    if (pins.invalid.length) e[`${p}.pincodes`] = `Not valid 6-digit PIN codes: ${pins.invalid.slice(0, 8).join(", ")}${pins.invalid.length > 8 ? ` and ${pins.invalid.length - 8} more` : ""}`;
    else if (pins.valid.length > 5000) e[`${p}.pincodes`] = "At most 5,000 PIN codes per zone";
    if (!intIn(z.etaDaysMin, 0, 60)) e[`${p}.etaDaysMin`] = "Whole days, 0–60";
    if (!intIn(z.etaDaysMax, 0, 90)) e[`${p}.etaDaysMax`] = "Whole days, 0–90";
    else if (intIn(z.etaDaysMin, 0, 60) && num(z.etaDaysMax) < num(z.etaDaysMin)) e[`${p}.etaDaysMax`] = "Must be at least the minimum";
    const fee = num(z.deliveryFee);
    if (Number.isNaN(fee) || fee < 0 || fee > 100000) e[`${p}.deliveryFee`] = "Enter ₹0 – ₹1,00,000";
    if (z.radiusKm !== "") {
      const r = num(z.radiusKm);
      if (Number.isNaN(r) || r < 0 || r > 2000) e[`${p}.radiusKm`] = "Enter 0 – 2000 km";
      else if (r > 0 && !z.center && !pickupCenter) e[`${p}.radiusKm`] = "A radius needs a centre: save a pickup address first";
    }
  });
  return e;
}

function toPayload(zones, pickupCenter) {
  return zones.map((z) => {
    const radius = z.radiusKm === "" ? null : num(z.radiusKm);
    const out = {
      name: z.name.trim(),
      pincodes: parsePincodes(z.pincodes).valid,
      radiusKm: radius || null,
      etaDaysMin: num(z.etaDaysMin),
      etaDaysMax: num(z.etaDaysMax),
      deliveryFee: num(z.deliveryFee),
    };
    const center = z.center || (radius ? pickupCenter : null);
    if (center) out.center = center;
    return out;
  });
}

function ZoneEditor({ zone, index, onChange, onRemove, err, pickupCenter }) {
  const set = (patch) => onChange({ ...zone, ...patch });
  const pins = parsePincodes(zone.pincodes);
  const radius = num(zone.radiusKm);
  const kind = pins.valid.length ? "pincodes" : radius > 0 ? "radius" : "catch-all";
  const center = zone.center || pickupCenter;
  return (
    <Card className="p-4" as="li">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-ui font-semibold text-fg">{zone.name.trim() || `Zone ${index + 1}`}</h3>
          {kind === "pincodes" ? (
            <Badge tone="info">{pins.valid.length} PIN codes</Badge>
          ) : kind === "radius" ? (
            <Badge tone="accent">Within {radius} km</Badge>
          ) : (
            <Badge tone="warning">Catch-all</Badge>
          )}
        </div>
        <IconButton icon={Trash2} label={`Remove zone ${zone.name || index + 1}`} variant="danger-ghost" size="sm" onClick={onRemove} />
      </div>
      <div className="grid gap-4">
        <Field label="Zone name" required error={err(`deliveryZones.${index}.name`)}>
          <Input value={zone.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} placeholder="e.g. Delhi NCR" />
        </Field>
        <Field
          label="PIN codes"
          optional
          error={err(`deliveryZones.${index}.pincodes`)}
          hint={`Separate with commas or new lines.${pins.duplicates ? ` ${pins.duplicates} duplicate${pins.duplicates === 1 ? "" : "s"} will be removed.` : ""}`}
        >
          <Textarea rows={3} value={zone.pincodes} onChange={(e) => set({ pincodes: e.target.value })} className="font-mono text-ui-sm" placeholder="110001, 110002" spellCheck={false} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="ETA min (days)" required error={err(`deliveryZones.${index}.etaDaysMin`)}>
            <Input type="number" inputMode="numeric" min={0} max={60} step={1} value={zone.etaDaysMin} onChange={(e) => set({ etaDaysMin: e.target.value })} />
          </Field>
          <Field label="ETA max (days)" required error={err(`deliveryZones.${index}.etaDaysMax`)}>
            <Input type="number" inputMode="numeric" min={0} max={90} step={1} value={zone.etaDaysMax} onChange={(e) => set({ etaDaysMax: e.target.value })} />
          </Field>
          <Field label="Delivery fee" required error={err(`deliveryZones.${index}.deliveryFee`)}>
            <Input type="number" inputMode="decimal" min={0} step="1" value={zone.deliveryFee} onChange={(e) => set({ deliveryFee: e.target.value })} prefix="₹" />
          </Field>
          <Field label="Radius (km)" optional error={err(`deliveryZones.${index}.radiusKm`)}>
            <Input type="number" inputMode="decimal" min={0} max={2000} value={zone.radiusKm} onChange={(e) => set({ radiusKm: e.target.value })} />
          </Field>
        </div>
        <p className="text-ui-xs text-fg-subtle">
          {kind === "pincodes"
            ? "Buyers with these PIN codes match this zone first."
            : kind === "radius"
              ? center
                ? `Matches buyers within ${radius} km of ${center.latitude.toFixed(2)}, ${center.longitude.toFixed(2)}${zone.center ? "" : " (your pickup address)"}.`
                : "A radius needs a centre: save a pickup address first."
              : "No PIN codes or radius: this zone serves every buyer no other zone matches."}
        </p>
      </div>
    </Card>
  );
}

export function ZonesSection() {
  const { tenant } = useSettingsContext();
  const initial = useMemo(() => deriveZones(tenant), [tenant]);
  const { form: zones, setForm, dirty, discard, reset } = useSectionForm(initial);
  useReportDirty("zones", dirty);
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const pickup = tenant?.pickupAddress;
  const pickupCenter = pickup?.latitude != null && pickup?.longitude != null ? { latitude: pickup.latitude, longitude: pickup.longitude } : null;
  const errors = validateZones(zones, pickupCenter);
  const err = makeErr(showErrors, errors, outcome?.error);
  const catchAll = zones.filter((z) => !parsePincodes(z.pincodes).valid.length && !(num(z.radiusKm) > 0)).length;

  function add() {
    setForm((list) => [...list, { key: zoneKey(), name: "", pincodes: "", etaDaysMin: "2", etaDaysMax: "5", deliveryFee: "0", radiusKm: "", center: null }]);
  }

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    if (zones.length > 200) return;
    const payload = toPayload(zones, pickupCenter);
    const result = await saver.run([{ label: "Delivery zones", run: () => api.updateMyTenant({ deliveryZones: payload }), onSuccess: (t) => t && reset(deriveZones(t)) }]);
    setOutcome(result);
    if (result.ok) setShowErrors(false);
  }

  const errorCount = showErrors ? Object.keys(errors).length : 0;

  return (
    <SettingsSection
      id="zones"
      title="Delivery zones"
      description="Where you deliver, how long it takes and what it costs. PIN code matches win, then radius zones, then a catch-all zone."
      dirty={dirty}
      saving={saver.pending}
      onSubmit={submit}
      onDiscard={() => {
        discard();
        setShowErrors(false);
        setOutcome(null);
      }}
      outcome={outcome}
      footerNote={errorCount ? `${errorCount} field${errorCount === 1 ? "" : "s"} need attention` : `${zones.length} zone${zones.length === 1 ? "" : "s"}`}
    >
      <div className="grid gap-4">
        {!zones.length ? (
          <EmptyState
            compact
            icon={Truck}
            title="No delivery zones"
            description="Without zones every PIN code is served with a 3–7 day estimate and no delivery fee."
            action={
              <Button leftIcon={Plus} onClick={add}>
                Add zone
              </Button>
            }
          />
        ) : (
          <>
            {catchAll > 1 ? <Alert tone="warning">More than one catch-all zone: only the first one is used.</Alert> : null}
            <ul className="grid gap-4">
              {zones.map((z, i) => (
                <ZoneEditor
                  key={z.key}
                  zone={z}
                  index={i}
                  err={err}
                  pickupCenter={pickupCenter}
                  onChange={(next) => setForm((list) => list.map((x, j) => (j === i ? next : x)))}
                  onRemove={() => setForm((list) => list.filter((_, j) => j !== i))}
                />
              ))}
            </ul>
            <div>
              <Button leftIcon={Plus} onClick={add} disabled={zones.length >= 200}>
                Add zone
              </Button>
            </div>
          </>
        )}
      </div>
    </SettingsSection>
  );
}

/* ================================================================== Partners + free delivery */

function derivePartners(commerce) {
  return {
    choice: Boolean(commerce?.deliveryPartnerChoiceEnabled),
    partners: (commerce?.deliveryPartners || []).map((p) => ({ id: str(p.id), name: str(p.name), fee: str(p.fee ?? 0), isDefault: Boolean(p.isDefault) })),
    freeAbove: str(commerce?.freeDeliveryAbove ?? 0),
  };
}

function validatePartners(f) {
  const e = {};
  if (!f.partners.length) e.partners = "Add at least one delivery partner";
  if (f.partners.length > 20) e.partners = "At most 20 delivery partners";
  const ids = new Map();
  f.partners.forEach((p, i) => {
    const id = p.id.trim();
    if (!id) e[`partners.${i}.id`] = "Required";
    else if (id.length > 40) e[`partners.${i}.id`] = "Max 40 characters";
    else if (ids.has(id.toLowerCase())) e[`partners.${i}.id`] = "IDs must be unique";
    ids.set(id.toLowerCase(), i);
    if (!p.name.trim()) e[`partners.${i}.name`] = "Required";
    else if (p.name.trim().length > 80) e[`partners.${i}.name`] = "Max 80 characters";
    const fee = num(p.fee);
    if (Number.isNaN(fee) || fee < 0 || fee > 10000) e[`partners.${i}.fee`] = "₹0 – ₹10,000";
  });
  if (f.partners.length && f.partners.filter((p) => p.isDefault).length !== 1) e.partners = "Choose exactly one default partner";
  const free = num(f.freeAbove);
  if (Number.isNaN(free) || free < 0 || free > 10000000) e.freeAbove = "Enter ₹0 – ₹1,00,00,000";
  return e;
}

function slugId(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function PartnersSection() {
  const { commerce, commerceQuery } = useSettingsContext();
  const initial = useMemo(() => derivePartners(commerce), [commerce]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("partners", dirty && Boolean(commerce));
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validatePartners(form);
  const err = makeErr(showErrors, errors, null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setPartner = (i, patch) => setForm((f) => ({ ...f, partners: f.partners.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  if (!commerce) {
    return (
      <Card className="grid gap-3 p-5">
        {commerceQuery?.error ? (
          <Alert tone="danger" title="Couldn’t load delivery partners" action={<Button size="sm" onClick={() => commerceQuery.refetch()}>Retry</Button>}>
            {commerceQuery.error.message}
          </Alert>
        ) : (
          <>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-24" />
          </>
        )}
      </Card>
    );
  }

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const partners = form.partners.map((p) => ({ id: p.id.trim(), name: p.name.trim(), fee: num(p.fee), isDefault: p.isDefault }));
    const steps = [];
    if (form.choice !== base.choice) steps.push({ label: "Buyer can choose partner", run: () => api.upsertSetting("platform.deliveryPartnerChoiceEnabled", form.choice) });
    const basePartners = base.partners.map((p) => ({ id: p.id.trim(), name: p.name.trim(), fee: num(p.fee), isDefault: p.isDefault }));
    if (JSON.stringify(partners) !== JSON.stringify(basePartners)) steps.push({ label: "Delivery partners", run: () => api.upsertSetting("platform.deliveryPartners", partners) });
    if (num(form.freeAbove) !== num(base.freeAbove)) steps.push({ label: "Free delivery threshold", run: () => api.upsertSetting("delivery.freeAbove", num(form.freeAbove)) });
    if (!steps.length) return;
    const result = await saver.run(steps);
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      setForm({ choice: form.choice, partners: partners.map((p) => ({ ...p, fee: String(p.fee) })), freeAbove: String(num(form.freeAbove)) });
    }
  }

  return (
    <SettingsSection
      id="partners"
      title="Delivery partners & free delivery"
      description="Couriers buyers can pick at checkout, their fees, and when delivery becomes free."
      dirty={dirty}
      saving={saver.pending}
      onSubmit={submit}
      onDiscard={() => {
        discard();
        setShowErrors(false);
        setOutcome(null);
      }}
      outcome={outcome}
    >
      <FormSection title="Free delivery" description="No delivery or partner fee once the order total (after coupons) reaches this amount.">
        <Field label={<SettingLabel settingKey="delivery.freeAbove">Free delivery above</SettingLabel>} error={err("freeAbove")} hint="Use 0 to turn off free delivery.">
          <Input type="number" inputMode="decimal" min={0} step="1" value={form.freeAbove} onChange={(e) => set({ freeAbove: e.target.value })} prefix="₹" className="max-w-48" />
        </Field>
        <p className="text-ui-sm text-fg-muted">
          Currently: {num(base.freeAbove) > 0 ? <>free above <Money value={num(base.freeAbove)} whole /></> : "off"}
        </p>
      </FormSection>
      <FormSection title="Partners" description="Unique ID per partner. The default is used when buyers can’t choose.">
        <Switch
          checked={form.choice}
          onCheckedChange={(v) => set({ choice: v })}
          label={<SettingLabel settingKey="platform.deliveryPartnerChoiceEnabled">Let buyers choose a partner</SettingLabel>}
          description="When off, every order ships with the default partner."
        />
        <div className="flex items-center gap-2 text-ui-sm text-fg-muted">
          <SettingLabel settingKey="platform.deliveryPartners">Partner list</SettingLabel>
        </div>
        {err("partners") ? (
          <p role="alert" className="text-ui-xs text-danger-fg">
            {err("partners")}
          </p>
        ) : null}
        <ul className="grid gap-3">
          {form.partners.map((p, i) => (
            <li key={i} className={cn("grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-start", p.isDefault ? "border-primary/50 bg-primary-soft/30" : "border-border")}>
              <Field label="Name" required error={err(`partners.${i}.name`)}>
                <Input
                  value={p.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoId = !p.id || p.id === slugId(p.name);
                    setPartner(i, autoId ? { name, id: slugId(name) } : { name });
                  }}
                  maxLength={80}
                />
              </Field>
              <Field label="ID" required error={err(`partners.${i}.id`)}>
                <Input value={p.id} onChange={(e) => setPartner(i, { id: e.target.value.replace(/\s/g, "-") })} maxLength={40} className="font-mono" spellCheck={false} />
              </Field>
              <Field label="Fee" required error={err(`partners.${i}.fee`)}>
                <Input type="number" inputMode="decimal" min={0} max={10000} value={p.fee} onChange={(e) => setPartner(i, { fee: e.target.value })} prefix="₹" />
              </Field>
              <div className="flex items-center gap-2 sm:pt-7">
                <label className="inline-flex cursor-pointer items-center gap-2 text-ui-sm text-fg">
                  <input
                    type="radio"
                    name="default-partner"
                    checked={p.isDefault}
                    onChange={() => setForm((f) => ({ ...f, partners: f.partners.map((x, j) => ({ ...x, isDefault: j === i })) }))}
                    className="size-4 accent-primary"
                  />
                  Default
                </label>
                <IconButton
                  icon={Trash2}
                  label={`Remove ${p.name || "partner"}`}
                  variant="danger-ghost"
                  size="sm"
                  disabled={form.partners.length <= 1}
                  onClick={() =>
                    setForm((f) => {
                      const list = f.partners.filter((_, j) => j !== i);
                      if (list.length && !list.some((x) => x.isDefault)) list[0] = { ...list[0], isDefault: true };
                      return { ...f, partners: list };
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
        <div>
          <Button
            leftIcon={Plus}
            disabled={form.partners.length >= 20}
            onClick={() => setForm((f) => ({ ...f, partners: [...f.partners, { id: "", name: "", fee: "0", isDefault: f.partners.length === 0 }] }))}
          >
            Add partner
          </Button>
        </div>
      </FormSection>
    </SettingsSection>
  );
}
