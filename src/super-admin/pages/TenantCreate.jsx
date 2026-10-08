import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  FormActions,
  Money,
  PageHeader,
  StatusPill,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import {
  AdminFields,
  BasicsFields,
  BrandingFields,
  PickupFields,
  ZonesEditor,
  createPayload,
  emptyTenantForm,
  errorsOf,
  validateTenantForm,
} from "./tenantForm.jsx";

const STEPS = [
  { id: "basics", label: "Store", description: "Name, legal details and contact." },
  { id: "branding", label: "Branding & rules", description: "Logo, colours, tax and order rules." },
  { id: "delivery", label: "Pickup & delivery", description: "Pickup address and delivery zones." },
  { id: "admin", label: "Store admin", description: "The first staff account." },
  { id: "review", label: "Review", description: "Check and create." },
];

/** Which wizard step owns a field path (used to jump to the first server error). */
function stepOf(path) {
  if (/^(name|slug|status|businessProfile)/.test(path)) return 0;
  if (/^(branding|taxSettings|orderRules|notificationPreferences)/.test(path)) return 1;
  if (/^(pickupAddress|deliveryZones)/.test(path)) return 2;
  if (/^admin/.test(path)) return 3;
  return 4;
}

export default function TenantCreate() {
  const navigate = useNavigate();
  const initial = useMemo(() => emptyTenantForm(), []);
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const create = useApiMutation((body) => api.withTenant(null).createTenant(body), {
    invalidate: [keys.tenants.all, keys.reports.all],
    success: (t) => `${t.name} created`,
    error: false,
    onSuccess: (t) => navigate(`/super-admin/tenants/${t._id}`, { replace: true }),
    onError: (err) => {
      const first = Object.keys(err?.fields || {})[0];
      if (first) setStep(stepOf(first));
      else if (err?.code === "DUPLICATE") setStep(/admin/i.test(err.message) ? 3 : 0);
    },
  });
  const blocker = useUnsavedChangesGuard(dirty && !create.isPending && !create.isSuccess);

  const allErrors = validateTenantForm(form, { create: true });
  const stepErrors = (i) => validateTenantForm(form, { create: true, sections: [STEPS[i].id] });
  const errors = showErrors ? errorsOf(allErrors, create.error) : errorsOf({}, create.error);

  function next() {
    const e = stepErrors(step);
    if (Object.keys(e).length) {
      setShowErrors(true);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function submit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    if (Object.keys(allErrors).length) {
      setShowErrors(true);
      setStep(stepOf(Object.keys(allErrors)[0]));
      return;
    }
    create.mutate(createPayload(form));
  }

  const p = createPayload(form);
  const zonesSummary = form.deliveryZones.length ? form.deliveryZones.map((z) => z.name || "Unnamed").join(", ") : "None (store pickup only)";

  return (
    <>
      <PageHeader
        title="New tenant"
        description="Onboard a store. Everything except the slug (store URL) can be changed later, including the name."
        back="/super-admin/tenants"
        breadcrumbs={[{ label: "Tenants", to: "/super-admin/tenants" }, { label: "New tenant" }]}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Steps">
          <ol className="flex gap-2 overflow-x-auto no-scrollbar lg:grid lg:gap-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              const hasErr = showErrors && Object.keys(stepErrors(i)).length > 0;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => (i <= step || !Object.keys(stepErrors(step)).length ? setStep(i) : next())}
                    aria-current={current ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-ui-sm transition-colors hover:bg-surface-hover",
                      current ? "bg-surface-2 font-medium text-fg" : "text-fg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border text-ui-xs tabular-nums",
                        hasErr ? "border-danger bg-danger-soft text-danger-fg" : done ? "border-primary bg-primary text-fg-on-primary" : current ? "border-primary text-primary-soft-fg" : "border-border-strong"
                      )}
                    >
                      {done && !hasErr ? <Check className="size-3.5" aria-hidden /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <form onSubmit={submit} noValidate>
          <Card>
            <CardHeader title={`${step + 1}. ${STEPS[step].label}`} description={STEPS[step].description} />
            <CardBody className="grid gap-5">
              {create.error && !Object.keys(create.error.fields || {}).length ? (
                <Alert tone="danger" title="Couldn’t create the tenant">
                  {create.error.message}
                  {create.error.requestId ? <span className="mt-1 block font-mono text-ui-2xs">Reference: {create.error.requestId}</span> : null}
                </Alert>
              ) : null}
              {step === 0 ? <BasicsFields form={form} setForm={setForm} errors={errors} create /> : null}
              {step === 1 ? <BrandingFields form={form} setForm={setForm} errors={errors} /> : null}
              {step === 2 ? (
                <div className="grid gap-6">
                  <section className="grid gap-3">
                    <h3 className="text-ui font-semibold">Pickup address</h3>
                    <p className="-mt-2 text-ui-sm text-fg-muted">Used for store pickup and courier collection. It is geocoded on save.</p>
                    <PickupFields form={form} setForm={setForm} errors={errors} />
                  </section>
                  <section className="grid gap-3">
                    <h3 className="text-ui font-semibold">Delivery zones</h3>
                    <ZonesEditor zones={form.deliveryZones} onChange={(z) => setForm({ ...form, deliveryZones: z })} errors={errors} />
                  </section>
                </div>
              ) : null}
              {step === 3 ? <AdminFields form={form} setForm={setForm} errors={errors} /> : null}
              {step === 4 ? (
                <div className="grid gap-5">
                  <DescriptionList
                    columns={2}
                    items={[
                      { label: "Store name", value: p.name },
                      { label: "Slug", value: p.slug || "Generated from the name" },
                      { label: "Initial status", value: <StatusPill status={form.status} /> },
                      { label: "Legal name", value: p.businessProfile.legalName },
                      { label: "GSTIN", value: p.businessProfile.gstin },
                      { label: "Contact", value: [p.businessProfile.email, p.businessProfile.phone].filter(Boolean).join(" · ") },
                      { label: "Default tax rate", value: `${p.taxSettings.defaultTaxRate}%` },
                      { label: "Minimum order", value: <Money value={p.orderRules.minOrderValue} /> },
                      { label: "Pickup", value: [p.pickupAddress.addressLine1, p.pickupAddress.city, p.pickupAddress.postalCode].filter(Boolean).join(", ") },
                      { label: "Delivery zones", value: zonesSummary },
                      { label: "Store admin", value: p.admin ? `${p.admin.name} <${p.admin.email}>` : "None — add staff later" },
                    ]}
                  />
                  {Object.keys(allErrors).length ? (
                    <Alert tone="warning" title="Some fields need attention">
                      Go back to the highlighted steps and fix them before creating the tenant.
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </CardBody>
            <FormActions className="px-4 pb-4 sm:px-5">
              {step > 0 ? (
                <Button onClick={() => setStep((s) => s - 1)} disabled={create.isPending} className="mr-auto">
                  Back
                </Button>
              ) : null}
              <Button to="/super-admin/tenants" variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={create.isPending}>
                {step === STEPS.length - 1 ? "Create tenant" : "Continue"}
              </Button>
            </FormActions>
          </Card>
        </form>
      </div>
      <UnsavedChangesDialog blocker={blocker} title="Discard this new tenant?" />
    </>
  );
}
