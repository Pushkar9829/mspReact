import { useMemo, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { Badge, Field, FormSection, Input, Switch } from "../../../shared/ui/index.js";
import { SettingsSection, makeErr, num, str, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

const GST_SLABS = [0, 5, 12, 18, 28];

function derive(tenant) {
  return {
    defaultTaxRate: str(tenant?.taxSettings?.defaultTaxRate ?? ""),
    minOrderValue: str(tenant?.orderRules?.minOrderValue ?? ""),
    allowBackorder: Boolean(tenant?.orderRules?.allowBackorder),
  };
}

function validate(f) {
  const e = {};
  const rate = num(f.defaultTaxRate);
  if ((Number.isNaN(rate) || rate < 0 || rate > 28)) e["taxSettings.defaultTaxRate"] = "Enter a rate between 0 and 28";
  const min = num(f.minOrderValue);
  if ((Number.isNaN(min) || min < 0 || min > 10000000)) e["orderRules.minOrderValue"] = "Enter an amount between ₹0 and ₹1,00,00,000";
  return e;
}

export function TaxOrdersSection() {
  const { tenant } = useSettingsContext();
  const initial = useMemo(() => derive(tenant), [tenant]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("tax", dirty);
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validate(form);
  const err = makeErr(showErrors, errors, outcome?.error);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const body = {};
    if (form.defaultTaxRate !== base.defaultTaxRate && form.defaultTaxRate !== "") body.taxSettings = { defaultTaxRate: num(form.defaultTaxRate) };
    const rules = {};
    if (form.minOrderValue !== base.minOrderValue && form.minOrderValue !== "") rules.minOrderValue = num(form.minOrderValue);
    if (form.allowBackorder !== base.allowBackorder) rules.allowBackorder = form.allowBackorder;
    if (Object.keys(rules).length) body.orderRules = rules;
    if (!Object.keys(body).length) return;
    const result = await saver.run([{ label: "Tax & order rules", run: () => api.updateMyTenant(body) }]);
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      const norm = (v) => (v === "" ? "" : String(num(v)));
      setForm((f) => ({ ...f, defaultTaxRate: norm(f.defaultTaxRate), minOrderValue: norm(f.minOrderValue) }));
    }
  }

  return (
    <SettingsSection
      id="tax"
      title="Tax & orders"
      description="Defaults applied to new products and rules checked at checkout."
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
      <FormSection title="Tax" description="GST rate used when a product doesn’t set its own.">
        <Field label="Default GST rate" error={err("taxSettings.defaultTaxRate")} hint="Between 0 and 28%.">
          <Input type="number" inputMode="decimal" min={0} max={28} step="0.01" value={form.defaultTaxRate} onChange={(e) => set({ defaultTaxRate: e.target.value })} suffix="%" className="max-w-40" />
        </Field>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Common GST slabs">
          {GST_SLABS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set({ defaultTaxRate: String(r) })}
              aria-pressed={num(form.defaultTaxRate) === r}
              className="rounded-full border border-border-strong px-3 py-1 text-ui-xs font-medium text-fg-muted hover:bg-surface-hover aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-fg disabled:opacity-50"
            >
              {r}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-ui-sm text-fg-muted">
          Currency <Badge tone="outline">INR (₹)</Badge>
        </div>
      </FormSection>
      <FormSection title="Order rules" description="Checked when buyers place orders with your store.">
        <Field label="Minimum order value" error={err("orderRules.minOrderValue")} hint="Orders below this amount can’t be placed. Use 0 for no minimum.">
          <Input type="number" inputMode="decimal" min={0} step="1" value={form.minOrderValue} onChange={(e) => set({ minOrderValue: e.target.value })} prefix="₹" className="max-w-48" />
        </Field>
        <Switch
          checked={form.allowBackorder}
          onCheckedChange={(v) => set({ allowBackorder: v })}
          label="Allow backorders"
          description="Buyers can order items that are out of stock; you fulfil them when stock arrives."
        />
      </FormSection>
    </SettingsSection>
  );
}
