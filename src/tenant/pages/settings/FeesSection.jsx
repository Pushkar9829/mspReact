import { useMemo, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { Alert, Button, Card, Field, FormSection, Input, Money, Skeleton, Switch } from "../../../shared/ui/index.js";
import { SettingLabel, SettingsSection, makeErr, num, str, useReportDirty, useSectionForm, useSettingsContext, useStepSave } from "./shared.jsx";

function derive(commerce) {
  return {
    feeEnabled: Boolean(commerce?.feeEnabled),
    feeAmount: str(commerce?.feeAmount ?? 0),
    feePercent: str(commerce?.feePercent ?? 0),
    codEnabled: commerce?.storeCodEnabled !== false,
  };
}

function validate(f) {
  const e = {};
  const amount = num(f.feeAmount);
  if (Number.isNaN(amount) || amount < 0 || amount > 10000) e.feeAmount = "Enter ₹0 – ₹10,000";
  const pct = num(f.feePercent);
  if (Number.isNaN(pct) || pct < 0 || pct > 50) e.feePercent = "Enter 0 – 50%";
  return e;
}

/** Example fee on a ₹1,000 order with the current form values. */
function example(f) {
  if (!f.feeEnabled) return 0;
  const amount = num(f.feeAmount) || 0;
  const pct = num(f.feePercent) || 0;
  return Math.round((amount + 1000 * (pct / 100)) * 100) / 100;
}

export function FeesSection() {
  const { commerce, commerceQuery } = useSettingsContext();
  const initial = useMemo(() => derive(commerce), [commerce]);
  const { form, setForm, dirty, discard, base } = useSectionForm(initial);
  useReportDirty("fees", dirty && Boolean(commerce));
  const saver = useStepSave();
  const [showErrors, setShowErrors] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const errors = validate(form);
  const err = makeErr(showErrors, errors, null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  if (!commerce) {
    return (
      <Card className="grid gap-3 p-5">
        {commerceQuery?.error ? (
          <Alert tone="danger" title="Couldn’t load fees and payments" action={<Button size="sm" onClick={() => commerceQuery.refetch()}>Retry</Button>}>
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
    const steps = [];
    if (form.feeEnabled !== base.feeEnabled) steps.push({ label: "Checkout fee on/off", run: () => api.upsertSetting("platform.feeEnabled", form.feeEnabled) });
    if (num(form.feeAmount) !== num(base.feeAmount)) steps.push({ label: "Flat fee", run: () => api.upsertSetting("platform.feeAmount", num(form.feeAmount)) });
    if (num(form.feePercent) !== num(base.feePercent)) steps.push({ label: "Percentage fee", run: () => api.upsertSetting("platform.feePercent", num(form.feePercent)) });
    if (form.codEnabled !== base.codEnabled) steps.push({ label: "Cash on delivery", run: () => api.upsertSetting("payments.codEnabled", form.codEnabled) });
    if (!steps.length) return;
    const result = await saver.run(steps);
    setOutcome(result);
    if (result.ok) {
      setShowErrors(false);
      setForm((f) => ({ ...f, feeAmount: String(num(f.feeAmount)), feePercent: String(num(f.feePercent)) }));
    }
  }

  return (
    <SettingsSection
      id="fees"
      title="Fees & payments"
      description="Each value is saved separately; you’ll see the result of every change."
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
      <FormSection title="Checkout fee" description="An extra fee added to the buyer’s total at checkout. The flat part is charged once per checkout.">
        <Switch
          checked={form.feeEnabled}
          onCheckedChange={(v) => set({ feeEnabled: v })}
          label={<SettingLabel settingKey="platform.feeEnabled">Charge a checkout fee</SettingLabel>}
          description={form.feeEnabled ? "Buyers see this fee as a separate line." : "No fee is added."}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<SettingLabel settingKey="platform.feeAmount">Flat fee</SettingLabel>} error={err("feeAmount")} hint="₹0 – ₹10,000">
            <Input type="number" inputMode="decimal" min={0} max={10000} step="0.01" value={form.feeAmount} onChange={(e) => set({ feeAmount: e.target.value })} prefix="₹" />
          </Field>
          <Field label={<SettingLabel settingKey="platform.feePercent">Percentage of subtotal</SettingLabel>} error={err("feePercent")} hint="0 – 50%">
            <Input type="number" inputMode="decimal" min={0} max={50} step="0.01" value={form.feePercent} onChange={(e) => set({ feePercent: e.target.value })} suffix="%" />
          </Field>
        </div>
        <p className="text-ui-sm text-fg-muted">
          On a <Money value={1000} whole /> order the buyer pays <span className="font-medium text-fg"><Money value={example(form)} /></span> extra.
        </p>
      </FormSection>
      <FormSection title="Payments" description="Payment methods offered to your buyers.">
        <Switch
          checked={form.codEnabled}
          onCheckedChange={(v) => set({ codEnabled: v })}
          label={<SettingLabel settingKey="payments.codEnabled">Cash on delivery</SettingLabel>}
          description="Let buyers pay the courier when the order arrives."
        />
        {!commerce.platformCodEnabled ? (
          <Alert tone="warning" title="Cash on delivery is off for the whole marketplace">
            The platform has disabled COD, so buyers won’t see it even if you turn it on here.
          </Alert>
        ) : (
          <p className="text-ui-sm text-fg-muted">Buyers currently {commerce.codEnabled ? "can" : "can’t"} pay cash on delivery.</p>
        )}
      </FormSection>
    </SettingsSection>
  );
}
