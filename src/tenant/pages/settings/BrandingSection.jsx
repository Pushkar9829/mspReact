import { useMemo, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { Field, FormSection, Input } from "../../../shared/ui/index.js";
import { MediaPickerButton } from "../../../shared/components/MediaLibrary.jsx";
import { HEX_RX, SettingsSection, changed, makeErr, str, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

function derive(tenant) {
  const b = tenant?.branding || {};
  return { logo: str(b.logo), primaryColor: str(b.primaryColor), secondaryColor: str(b.secondaryColor) };
}

function validate(f) {
  const e = {};
  if (f.logo.trim().length > 500) e["branding.logo"] = "URL is too long (max 500 characters)";
  else if (f.logo.trim() && !/^(https?:\/\/|\/)/i.test(f.logo.trim())) e["branding.logo"] = "Enter an http(s) URL or pick an image";
  if (f.primaryColor.trim() && !HEX_RX.test(f.primaryColor.trim())) e["branding.primaryColor"] = "Enter a hex colour like #322FBC";
  if (f.secondaryColor.trim() && !HEX_RX.test(f.secondaryColor.trim())) e["branding.secondaryColor"] = "Enter a hex colour like #8B8AAE";
  return e;
}

/** The native colour picker only understands #rrggbb. */
function toPickerValue(hex) {
  const v = String(hex || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return v.slice(0, 7);
  return "#000000";
}

function ColorField({ label, value, onChange, error, hint }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={toPickerValue(value)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-1 disabled:cursor-not-allowed"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value.trim())} maxLength={9} className="font-mono uppercase" spellCheck={false} autoComplete="off" />
      </div>
    </Field>
  );
}

function Preview({ name, logo, primary, secondary }) {
  const ok = (c) => HEX_RX.test(c || "");
  return (
    <div className="overflow-hidden rounded-lg border border-border" aria-label="Brand preview">
      {/* Inline colours are the seller's own brand values, shown as a preview only. */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: ok(primary) ? primary : undefined }}>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-surface">
          {logo ? <img src={logo} alt="" className="size-full object-contain" /> : <span className="text-ui-xs text-fg-subtle">Logo</span>}
        </span>
        <span className="truncate font-semibold text-white mix-blend-normal [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{name || "Your store"}</span>
      </div>
      <div className="flex items-center justify-between gap-3 bg-surface px-4 py-3">
        <span className="text-ui-sm text-fg-muted">Buttons and highlights</span>
        <span className="rounded-md px-3 py-1.5 text-ui-sm font-medium text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]" style={{ background: ok(secondary) ? secondary : undefined }}>
          Add to cart
        </span>
      </div>
    </div>
  );
}

export function BrandingSection() {
  const { tenant } = useSettingsContext();
  const initial = useMemo(() => derive(tenant), [tenant]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("branding", dirty);
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validate(form);
  const err = makeErr(showErrors, errors, outcome?.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const next = { logo: form.logo.trim(), primaryColor: form.primaryColor.trim(), secondaryColor: form.secondaryColor.trim() };
    const branding = changed(base, next);
    // Colours can't be cleared (the API only accepts hex values): an emptied colour is left unchanged.
    if (!next.primaryColor) delete branding.primaryColor;
    if (!next.secondaryColor) delete branding.secondaryColor;
    if (!Object.keys(branding).length) return;
    const result = await saver.run([{ label: "Branding", run: () => api.updateMyTenant({ branding }) }], { refreshUser: true });
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      setForm(next);
    }
  }

  return (
    <SettingsSection
      id="branding"
      title="Branding"
      description="Logo and colours used on your storefront and invoices."
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
      <FormSection title="Logo" description="Square images work best (at least 128 × 128 px).">
        <MediaPickerButton value={form.logo} onChange={(url) => set({ logo: url || "" })} folder="brands" label="Store logo" />
        <Field label="Logo URL" optional error={err("branding.logo")} hint="Pick from the media library above, or paste an image URL.">
          <Input type="url" value={form.logo} onChange={(e) => set({ logo: e.target.value })} maxLength={500} placeholder="https://" />
        </Field>
      </FormSection>
      <FormSection title="Colours" description="Hex values, e.g. #322FBC. Pick colours with enough contrast against white text.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label="Primary colour" value={form.primaryColor} onChange={(v) => set({ primaryColor: v })} error={err("branding.primaryColor")} hint="Header and key accents." />
          <ColorField label="Secondary colour" value={form.secondaryColor} onChange={(v) => set({ secondaryColor: v })} error={err("branding.secondaryColor")} hint="Buttons and highlights." />
        </div>
        <Preview name={tenant?.name} logo={form.logo} primary={form.primaryColor} secondary={form.secondaryColor} />
      </FormSection>
    </SettingsSection>
  );
}
