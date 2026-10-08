import { useEffect, useMemo, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { USER_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import { Alert, Button, Combobox, Dialog, Field, Input, NativeSelect, RadioGroup, TenantCombobox } from "../../../shared/ui/index.js";
import { assignableRoles, roleOptions, useRolesFor } from "./roles.jsx";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const KINDS = [
  { value: "staff", label: "Store staff", description: "Works in a tenant's admin panel with a store role." },
  { value: "buyer", label: "Buyer", description: "Marketplace customer. Optionally linked to a home store." },
  { value: "platform", label: "Platform admin", description: "Full access to this console. Use sparingly." },
];

function blank(tenantId, kind) {
  return { kind, tenantId: tenantId || "", name: "", email: "", password: "", phone: "", roleId: "", status: "active" };
}

function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = "At least 2 characters";
  else if (name.length > 120) e.name = "At most 120 characters";
  if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email";
  if (f.password.length < 8) e.password = "At least 8 characters";
  else if (f.password.length > 100) e.password = "At most 100 characters";
  if (f.phone.trim().length > 20) e.phone = "At most 20 characters";
  if (f.kind === "staff" && !f.tenantId) e.tenantId = "Choose the store this person works for";
  if (!f.roleId) e.roleId = "Choose a role";
  return e;
}

/**
 * Create a user (POST /users). `tenantId` fixes the store; `kinds` limits the account types offered.
 *   <CreateUserDialog open onOpenChange tenantId={id} kinds={["staff"]} defaultRoleSlug="tenant_admin" />
 */
export function CreateUserDialog({ open, onOpenChange, tenantId: fixedTenant, kinds = ["staff", "buyer", "platform"], defaultKind, defaultRoleSlug, onCreated, title = "Add user" }) {
  const initialKind = defaultKind || kinds[0];
  const [form, setForm] = useState(() => blank(fixedTenant, initialKind));
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setForm(blank(fixedTenant, initialKind));
      setTouched(false);
    }
  }, [open, fixedTenant, initialKind]);

  const rolesQ = useRolesFor(form.tenantId || null, { enabled: open });
  const options = useMemo(() => roleOptions(assignableRoles(rolesQ.data || [], { tenantId: form.tenantId, kind: form.kind })), [rolesQ.data, form.tenantId, form.kind]);

  // Preselect a sensible default role when the list (or kind) changes.
  useEffect(() => {
    if (!open || form.roleId || !rolesQ.data) return;
    const list = assignableRoles(rolesQ.data, { tenantId: form.tenantId, kind: form.kind });
    const pick = list.find((r) => r.slug === defaultRoleSlug) || (list.length === 1 ? list[0] : null);
    if (pick) setForm((f) => ({ ...f, roleId: String(pick._id) }));
  }, [open, rolesQ.data, form.kind, form.tenantId, form.roleId, defaultRoleSlug]);

  const create = useApiMutation((body) => api.withTenant(null).createUser(body), {
    invalidate: [keys.users.all, keys.reports.all],
    success: (u) => `${u.name} added`,
    error: false,
    onSuccess: (u) => {
      onOpenChange(false);
      onCreated?.(u);
    },
  });

  const clientErrors = touched ? validate(form) : {};
  const errors = { ...clientErrors, ...(create.error?.fields || {}) };
  const dirty = Boolean(form.name || form.email || form.password || form.phone);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v, ...(k === "kind" || k === "tenantId" ? { roleId: "" } : {}) }));

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validate(form)).length) return;
    const body = { name: form.name.trim(), email: form.email.trim(), password: form.password, roleId: form.roleId, status: form.status };
    if (form.phone.trim()) body.phone = form.phone.trim();
    if (form.kind !== "platform" && form.tenantId) body.tenantId = form.tenantId;
    create.mutate(body);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Accounts created here are active immediately and their email is marked verified."
      size="lg"
      dirty={dirty}
      busy={create.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-user" variant="primary" loading={create.isPending}>
            Create account
          </Button>
        </>
      }
    >
      <form id="create-user" onSubmit={submit} className="grid gap-4" noValidate>
        {create.error && !Object.keys(create.error.fields || {}).length ? <Alert tone="danger">{create.error.message}</Alert> : null}
        {kinds.length > 1 ? (
          <Field label="Account type">
            <RadioGroup value={form.kind} onValueChange={(v) => set("kind", v)} options={KINDS.filter((k) => kinds.includes(k.value))} />
          </Field>
        ) : null}
        {form.kind !== "platform" && !fixedTenant ? (
          <Field
            label={form.kind === "buyer" ? "Home store" : "Store"}
            required={form.kind === "staff"}
            optional={form.kind === "buyer"}
            hint={form.kind === "buyer" ? "Storefront affinity only — buyers can order from every store." : undefined}
            error={errors.tenantId}
          >
            <TenantCombobox value={form.tenantId} onChange={(id) => set("tenantId", id || "")} placeholder="Search tenants…" />
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={254} autoComplete="off" />
          </Field>
          <Field label="Temporary password" required hint="8–100 characters. Share it securely." error={errors.password}>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} maxLength={100} autoComplete="new-password" />
          </Field>
          <Field label="Phone" optional error={errors.phone}>
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} />
          </Field>
          <Field label="Role" required error={errors.roleId} hint={form.kind === "staff" && !form.tenantId ? "Pick a store first to see its roles." : undefined}>
            <Combobox
              value={form.roleId}
              onChange={(v) => set("roleId", v || "")}
              options={options}
              placeholder={rolesQ.isPending ? "Loading roles…" : "Select a role"}
              disabled={form.kind === "staff" && !form.tenantId}
              emptyText="No roles available"
            />
          </Field>
          <Field label="Status" error={errors.status}>
            <NativeSelect value={form.status} onChange={(e) => set("status", e.target.value)} options={statusOptions(USER_STATUSES)} />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

export default CreateUserDialog;
