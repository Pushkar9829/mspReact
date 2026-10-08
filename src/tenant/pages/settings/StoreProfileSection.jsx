import { useMemo, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { Badge, CopyButton, Field, FormSection, Input, StatusPill } from "../../../shared/ui/index.js";
import { EMAIL_RX, GSTIN_RX, SettingLabel, SettingsSection, changed, makeErr, str, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

function derive(tenant, settings) {
  const bp = tenant?.businessProfile || {};
  return {
    name: str(tenant?.name),
    displayName: str(settings?.["store.displayName"]),
    legalName: str(bp.legalName),
    gstin: str(bp.gstin),
    email: str(bp.email),
    phone: str(bp.phone),
    website: str(bp.website),
  };
}

function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = "Enter at least 2 characters";
  else if (name.length > 120) e.name = "Keep it under 120 characters";
  if (f.displayName.trim().length > 100) e["store.displayName"] = "Keep it under 100 characters";
  if (f.legalName.trim().length > 200) e["businessProfile.legalName"] = "Keep it under 200 characters";
  const gstin = f.gstin.trim().toUpperCase();
  if (gstin && !GSTIN_RX.test(gstin)) e["businessProfile.gstin"] = "GSTIN is 15 characters: digits and capital letters (e.g. 07AABCA1234A1Z5)";
  if (f.email.trim() && !EMAIL_RX.test(f.email.trim())) e["businessProfile.email"] = "Enter a valid email address";
  if (f.phone.trim().length > 20) e["businessProfile.phone"] = "Keep it under 20 characters";
  if (f.website.trim().length > 300) e["businessProfile.website"] = "Keep it under 300 characters";
  return e;
}

export function StoreProfileSection() {
  const { tenant, settings } = useSettingsContext();
  const initial = useMemo(() => derive(tenant, settings), [tenant, settings]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("profile", dirty);
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validate(form);
  const err = makeErr(showErrors, errors, outcome?.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const next = {
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      legalName: form.legalName.trim(),
      gstin: form.gstin.trim().toUpperCase(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
    };
    const steps = [];
    const bp = changed(
      { legalName: base.legalName, gstin: base.gstin, email: base.email, phone: base.phone, website: base.website },
      { legalName: next.legalName, gstin: next.gstin, email: next.email, phone: next.phone, website: next.website }
    );
    const patch = {};
    if (next.name !== base.name) patch.name = next.name;
    if (Object.keys(bp).length) patch.businessProfile = bp;
    if (Object.keys(patch).length) steps.push({ label: "Store details", run: () => api.updateMyTenant(patch) });
    if (next.displayName !== base.displayName) steps.push({ label: "Storefront display name", run: () => api.upsertSetting("store.displayName", next.displayName) });
    if (!steps.length) return;
    const result = await saver.run(steps, { refreshUser: Boolean(patch.name) });
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      setForm(next);
    }
  }

  return (
    <SettingsSection
      id="profile"
      title="Store profile"
      description="How your store appears to buyers and on invoices."
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
      <FormSection title="Store" description="Your store name and the name shown on the storefront.">
        <Field label="Store name" name="name" required error={err("name")}>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
        </Field>
        <Field
          label={<SettingLabel settingKey="store.displayName">Storefront display name</SettingLabel>}
          error={err("store.displayName") || err("value")}
          hint="Optional shorter name for the storefront header. Leave empty to use the store name."
        >
          <Input value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} maxLength={100} placeholder={form.name} />
        </Field>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-ui-sm text-fg-muted">
          <span className="inline-flex items-center gap-2">
            Store URL slug <Badge tone="outline">{tenant?.slug || "—"}</Badge>
            {tenant?.slug ? <CopyButton value={tenant.slug} label="Copy slug" /> : null}
          </span>
          <span className="inline-flex items-center gap-2">
            Status <StatusPill status={tenant?.status} />
          </span>
        </div>
      </FormSection>
      <FormSection title="Business details" description="Printed on invoices. GSTIN must match your registration.">
        <Field label="Legal name" optional error={err("businessProfile.legalName")}>
          <Input value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} maxLength={200} />
        </Field>
        <Field label="GSTIN" optional error={err("businessProfile.gstin")} hint="15 characters, e.g. 07AABCA1234A1Z5.">
          <Input
            value={form.gstin}
            onChange={(e) => set({ gstin: e.target.value.toUpperCase().replace(/\s/g, "") })}
            maxLength={15}
            className="font-mono uppercase"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business email" optional error={err("businessProfile.email")}>
            <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} maxLength={254} />
          </Field>
          <Field label="Business phone" optional error={err("businessProfile.phone")}>
            <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={20} />
          </Field>
        </div>
        <Field label="Website" optional error={err("businessProfile.website")}>
          <Input type="url" value={form.website} onChange={(e) => set({ website: e.target.value })} maxLength={300} placeholder="https://" />
        </Field>
      </FormSection>
    </SettingsSection>
  );
}
