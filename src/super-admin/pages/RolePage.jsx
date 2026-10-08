import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useTenantContext } from "../../shared/context/TenantContext.jsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Dialog,
  ErrorState,
  Field,
  FormActions,
  Input,
  PageHeader,
  PageSkeleton,
  TenantCombobox,
  Textarea,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { PermissionMatrix } from "./lib/PermissionMatrix.jsx";
import { useSyncedForm } from "./lib/useSyncedForm.js";
import { indexCatalog, isPlatformOnly, labelOf } from "./lib/permissions.js";
import { TenantLink } from "./lib/tenantScope.jsx";
import { DeleteRoleDialog, useRoleHolders } from "./Roles.jsx";

const B = "/super-admin/roles";

function validate(f, create) {
  const e = {};
  const n = f.name.trim();
  if (n.length < 2) e.name = "At least 2 characters";
  else if (n.length > 80) e.name = "At most 80 characters";
  if (create && f.slug.trim() && (f.slug.trim().length < 2 || f.slug.trim().length > 80)) e.slug = "2–80 characters";
  if (create && f.slug.trim() && !/^[a-z0-9_-]+$/i.test(f.slug.trim())) e.slug = "Letters, numbers, - and _ only";
  if (f.description.length > 300) e.description = "At most 300 characters";
  if (create && !f.tenantId) e.tenantId = "Custom roles belong to a store — choose one";
  if (f.permissions.size > 200) e.permissions = "At most 200 permissions";
  return e;
}

/** Remount between /roles/new and /roles/:id so create-form state never leaks into the editor. */
export default function RolePage() {
  const { id } = useParams();
  return <RoleEditor key={id || "new"} />;
}

function RoleEditor() {
  const { id } = useParams();
  const create = !id;
  const navigate = useNavigate();
  const can = useCan();
  const [params] = useSearchParams();
  const { tenantId: ctxTenant } = useTenantContext();

  const roleQ = useQuery({ queryKey: keys.roles.detail(id), queryFn: () => api.withTenant(null).getRole(id), enabled: !create });
  const catalogQ = useQuery({ queryKey: keys.permissions, queryFn: () => api.withTenant(null).listPermissions(), staleTime: 10 * 60_000 });
  const holders = useRoleHolders(create ? null : id);
  const role = roleQ.data;

  const initial = useMemo(
    () => ({
      name: role?.name || "",
      slug: role?.slug || "",
      description: role?.description || "",
      tenantId: create ? params.get("tenant") || ctxTenant || "" : String(role?.tenantId?._id || role?.tenantId || ""),
      permissions: new Set((role?.permissions || []).filter((p) => p !== "*")),
    }),
    [role, create, params, ctxTenant]
  );
  const [form, setForm] = useSyncedForm(initial);
  const [touched, setTouched] = useState(false);
  const [review, setReview] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
  const dirty = form.name !== initial.name || form.description !== initial.description || form.slug !== initial.slug || form.tenantId !== initial.tenantId || !sameSet(form.permissions, initial.permissions);
  const isSystem = Boolean(role?.isSystem);
  const isPlatformRole = role?.scope === "platform";
  const canWrite = create ? can("roles.create") : can("roles.edit") && !isPlatformRole;
  const permsLocked = isSystem || !canWrite;
  const byKey = useMemo(() => indexCatalog(catalogQ.data || []), [catalogQ.data]);
  const platformOnly = (p) => isPlatformOnly(p, byKey.get(p));
  const permLabel = (p) => byKey.get(p)?.label || labelOf(p);
  const hidden = [...form.permissions].filter(platformOnly);

  const save = useApiMutation(
    (body) => (create ? api.withTenant(null).createRole(body) : api.withTenant(null).updateRole(id, body)),
    {
      invalidate: [keys.roles.all],
      success: create ? "Role created" : "Role saved",
      error: false,
      onSuccess: (r) => {
        setReview(false);
        setTouched(false);
        if (create) navigate(`${B}/${r._id}`, { replace: true });
      },
    }
  );
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending && !save.isSuccess);

  if (!create && roleQ.isPending) return <PageSkeleton />;
  if (!create && roleQ.error)
    return (
      <>
        <PageHeader title="Role" back={B} breadcrumbs={[{ label: "Roles", to: B }, { label: "Not found" }]} />
        <ErrorState error={roleQ.error} onRetry={roleQ.refetch} />
      </>
    );

  const clientErrors = validate(form, create);
  const errors = { ...(touched ? clientErrors : {}), ...(save.error?.fields || {}) };
  const added = [...form.permissions].filter((p) => !initial.permissions.has(p)).sort();
  const removed = [...initial.permissions].filter((p) => !form.permissions.has(p)).sort();

  function body() {
    const out = {};
    if (create) {
      out.name = form.name.trim();
      if (form.slug.trim()) out.slug = form.slug.trim();
      if (form.description.trim()) out.description = form.description.trim();
      out.tenantId = form.tenantId;
      out.permissions = [...form.permissions].filter((p) => !platformOnly(p));
      return out;
    }
    if (form.name.trim() !== initial.name) out.name = form.name.trim();
    if (form.description !== initial.description) out.description = form.description.trim();
    if (!isSystem && (added.length || removed.length)) out.permissions = [...form.permissions].filter((p) => !platformOnly(p));
    return out;
  }

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(clientErrors).length) return;
    if (create) return save.mutate(body());
    setReview(true);
  }

  const title = create ? "New role" : role.name;

  return (
    <>
      <PageHeader
        title={title}
        back={B}
        breadcrumbs={[{ label: "Roles", to: B }, { label: title }]}
        meta={
          !create ? (
            <>
              {isSystem ? <Badge>System</Badge> : <Badge tone="info">Custom</Badge>}
              {isPlatformRole ? <Badge tone="accent">Platform</Badge> : null}
              <Code copy={role.slug}>{role.slug}</Code>
            </>
          ) : null
        }
        description={
          create
            ? "Custom roles belong to one store. Platform-only permissions can’t be granted."
            : role.tenantId
              ? <span>Store role of <TenantLink tenant={role.tenantId} /></span>
              : isPlatformRole
                ? "The platform owner role. Its permissions are fixed."
                : "System store role available to every store. Permissions are defined in code; name and description can be edited."
        }
        secondaryActions={
          !create ? (
            <Button to={`/super-admin/users?roleId=${id}`}>
              {holders.isPending ? "Holders" : `${holders.data ?? 0} holder${holders.data === 1 ? "" : "s"}`}
            </Button>
          ) : null
        }
        primaryAction={
          !create && !isSystem && can("roles.delete") ? (
            <Button variant="danger-ghost" leftIcon={Trash2} onClick={() => setDeleting(true)}>
              Delete
            </Button>
          ) : null
        }
      />

      <form onSubmit={submit} noValidate className="grid gap-6">
        {save.error && !Object.keys(save.error.fields || {}).length ? (
          <Alert tone="danger" title="Couldn’t save the role">
            {save.error.message}
          </Alert>
        ) : null}
        {isPlatformRole ? (
          <Alert tone="info" icon={Lock} title="Read-only">
            The platform role always has every permission (*). It can’t be edited or assigned to store staff.
          </Alert>
        ) : null}
        <Card>
          <CardHeader title="Details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {create ? (
              <Field label="Store" required hint="The tenant this role belongs to." error={errors.tenantId} className="sm:col-span-2">
                <TenantCombobox value={form.tenantId} onChange={(v) => setForm({ ...form, tenantId: v || "" })} placeholder="Search tenants…" />
              </Field>
            ) : null}
            <Field label="Name" required error={errors.name}>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} disabled={!canWrite || isPlatformRole} />
            </Field>
            {create ? (
              <Field label="Slug" optional hint="Generated from the name when empty. Unique per store." error={errors.slug}>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} maxLength={80} className="font-mono" />
              </Field>
            ) : null}
            <Field label="Description" optional error={errors.description} className="sm:col-span-2" hint={`${form.description.length}/300`}>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} disabled={!canWrite || isPlatformRole} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Permissions"
            description={isSystem ? "System role permissions are defined in code (config/constants.js) and can’t be changed here." : "Grouped by area. Platform-only permissions are hidden for store roles."}
          />
          <CardBody>
            {errors.permissions ? <p className="mb-3 text-ui-sm text-danger-fg" role="alert">{errors.permissions}</p> : null}
            {hidden.length ? <Alert tone="warning" className="mb-3">This role stores platform-only permissions that are ignored: {hidden.map(permLabel).join(", ")}. They’ll be removed on save.</Alert> : null}
            {catalogQ.error ? (
              <ErrorState error={catalogQ.error} onRetry={catalogQ.refetch} compact />
            ) : catalogQ.isPending ? (
              <p className="text-ui-sm text-fg-subtle">Loading the permission catalog…</p>
            ) : isPlatformRole ? (
              <p className="text-ui-sm text-fg-muted">All permissions (*).</p>
            ) : (
              <PermissionMatrix catalog={catalogQ.data} value={form.permissions} onChange={(s) => setForm({ ...form, permissions: s })} readOnly={permsLocked} initial={create ? undefined : initial.permissions} />
            )}
          </CardBody>
        </Card>

        {canWrite && !isPlatformRole ? (
          <div className="sticky bottom-0 z-10 rounded-lg border border-border bg-surface px-4 py-3 shadow-md">
            <FormActions className="border-0 pt-0">
              <span className="mr-auto text-ui-sm text-fg-muted" aria-live="polite">
                {dirty ? `${added.length} added · ${removed.length} removed${form.name !== initial.name || form.description !== initial.description ? " · details changed" : ""}` : create ? "" : "No changes"}
              </span>
              <Button to={B} variant="ghost">
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={save.isPending} disabled={!create && !dirty}>
                {create ? "Create role" : "Review changes"}
              </Button>
            </FormActions>
          </div>
        ) : null}
      </form>

      <Dialog
        open={review}
        onOpenChange={setReview}
        title={`Save changes to “${initial.name}”?`}
        description={holders.data ? `${holders.data} user${holders.data === 1 ? "" : "s"} hold this role; their access changes on their next request.` : "Nobody holds this role yet."}
        busy={save.isPending}
        footer={
          <>
            <Button onClick={() => setReview(false)} disabled={save.isPending}>
              Back
            </Button>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(body())}>
              Save role
            </Button>
          </>
        }
      >
        <div className="grid gap-3 text-ui-sm">
          {form.name.trim() !== initial.name ? (
            <p>
              Name: <span className="text-danger-fg line-through">{initial.name}</span> → <span className="text-success-fg">{form.name.trim()}</span>
            </p>
          ) : null}
          {form.description !== initial.description ? <p>Description updated.</p> : null}
          {added.length ? (
            <div>
              <p className="font-medium text-success-fg">Granted ({added.length})</p>
              <ul className="mt-1 flex flex-wrap gap-1">{added.map((p) => <li key={p}><Badge tone="success" title={p}>{permLabel(p)}</Badge></li>)}</ul>
            </div>
          ) : null}
          {removed.length ? (
            <div>
              <p className="font-medium text-danger-fg">Revoked ({removed.length})</p>
              <ul className="mt-1 flex flex-wrap gap-1">{removed.map((p) => <li key={p}><Badge tone="danger" title={p}>{permLabel(p)}</Badge></li>)}</ul>
            </div>
          ) : null}
          {!added.length && !removed.length && form.name.trim() === initial.name && form.description === initial.description ? <p className="text-fg-muted">Nothing changed.</p> : null}
          {save.error ? <Alert tone="danger">{save.error.message}</Alert> : null}
        </div>
      </Dialog>
      {!create ? <DeleteRoleDialog role={role} open={deleting} onOpenChange={setDeleting} onDeleted={() => navigate(B, { replace: true })} /> : null}
      <UnsavedChangesDialog blocker={blocker} />
      {!create && holders.data ? (
        <p className="mt-4 text-ui-xs text-fg-subtle">
          <Link to={`/super-admin/users?roleId=${id}`} className="hover:underline">
            See who holds this role →
          </Link>
        </p>
      ) : null}
    </>
  );
}
