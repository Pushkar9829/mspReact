import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, ShoppingBag } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useAuth, useCan } from "../../shared/context/AuthContext.jsx";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  Combobox,
  ConfirmDialog,
  DateTime,
  DescriptionList,
  DropdownMenu,
  ErrorState,
  Field,
  FormActions,
  Input,
  MenuItem,
  PageHeader,
  PageSkeleton,
  RelativeTime,
  StatusPill,
  Tooltip,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { changedFields } from "./lib/diff.jsx";
import { TenantLink } from "./lib/tenantScope.jsx";
import { useSyncedForm } from "./lib/useSyncedForm.js";
import { assignableRoles, roleKind, roleOptions, useRolesFor } from "./lib/roles.jsx";
import { SignOutEverywhereDialog, UserStatusDialog, userStatusActions } from "./lib/userStatus.jsx";

const B = "/super-admin/users";
const PHONE = /^[0-9+\-() ]*$/;

function formOf(u) {
  const p = u?.profile || {};
  const l = p.location || {};
  return {
    name: u?.name || "",
    phone: u?.phone || "",
    profile: {
      company: p.company || "",
      gstin: p.gstin || "",
      addressLine1: p.addressLine1 || "",
      location: { city: l.city || "", state: l.state || "", postalCode: l.postalCode || "", country: l.country || "" },
    },
  };
}

function validate(f) {
  const e = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = "At least 2 characters";
  else if (name.length > 120) e.name = "At most 120 characters";
  if (f.phone.trim().length > 20) e.phone = "At most 20 characters";
  else if (!PHONE.test(f.phone.trim())) e.phone = "Digits, spaces and + - ( ) only";
  if (f.profile.company.length > 120) e["profile.company"] = "At most 120 characters";
  if (f.profile.gstin && !/^[0-9A-Z]{15}$/.test(f.profile.gstin)) e["profile.gstin"] = "GSTIN is 15 letters/digits";
  if (f.profile.addressLine1.length > 200) e["profile.addressLine1"] = "At most 200 characters";
  const l = f.profile.location;
  if (l.city.length > 80) e["profile.location.city"] = "At most 80 characters";
  if (l.state.length > 80) e["profile.location.state"] = "At most 80 characters";
  if (l.postalCode.length > 12) e["profile.location.postalCode"] = "At most 12 characters";
  if (l.country && !/^[A-Za-z]{2}$/.test(l.country)) e["profile.location.country"] = "Two-letter code, e.g. IN";
  return e;
}

/** PATCH body with only changed fields (profile and profile.location are merged key-by-key server-side). */
function patchOf(initial, current) {
  const top = changedFields({ name: initial.name.trim(), phone: initial.phone.trim() }, { name: current.name.trim(), phone: current.phone.trim() });
  const prof = changedFields({ ...initial.profile, location: undefined }, { ...current.profile, location: undefined });
  delete prof.location;
  const loc = changedFields(initial.profile.location, current.profile.location);
  if (Object.keys(loc).length) prof.location = loc;
  if (Object.keys(prof).length) top.profile = prof;
  return top;
}

function ProfileCard({ user, canEdit }) {
  const id = user.id;
  const initial = useMemo(() => formOf(user), [user]);
  const [form, setForm] = useSyncedForm(initial);
  const [show, setShow] = useState(false);
  const patch = useMemo(() => patchOf(initial, form), [initial, form]);
  const dirty = Object.keys(patch).length > 0;
  const save = useApiMutation((body) => api.withTenant(null).updateUser(id, body), {
    invalidate: [keys.users.all],
    success: "Profile saved",
    error: false,
    onSuccess: () => setShow(false),
  });
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);
  const clientErrors = validate(form);
  const errors = { ...(show ? clientErrors : {}), ...(save.error?.fields || {}) };
  const setP = (k, v) => setForm({ ...form, profile: { ...form.profile, [k]: v } });
  const setL = (k, v) => setForm({ ...form, profile: { ...form.profile, location: { ...form.profile.location, [k]: v } } });
  const dis = !canEdit;

  return (
    <Card as="form" noValidate onSubmit={(e) => { e.preventDefault(); if (Object.keys(clientErrors).length) return setShow(true); save.mutate(patch); }}>
      <CardHeader title="Profile" description="Name, phone and business details." />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        {save.error && !Object.keys(save.error.fields || {}).length ? <Alert tone="danger" className="sm:col-span-2">{save.error.message}</Alert> : null}
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} disabled={dis} />
        </Field>
        <Field label="Phone" optional error={errors.phone}>
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} disabled={dis} />
        </Field>
        <Field label="Company" optional error={errors["profile.company"]}>
          <Input value={form.profile.company} onChange={(e) => setP("company", e.target.value)} maxLength={120} disabled={dis} />
        </Field>
        <Field label="GSTIN" optional error={errors["profile.gstin"]}>
          <Input value={form.profile.gstin} onChange={(e) => setP("gstin", e.target.value.toUpperCase())} maxLength={15} className="font-mono" disabled={dis} />
        </Field>
        <Field label="Address" optional error={errors["profile.addressLine1"]} className="sm:col-span-2">
          <Input value={form.profile.addressLine1} onChange={(e) => setP("addressLine1", e.target.value)} maxLength={200} disabled={dis} />
        </Field>
        <Field label="City" optional error={errors["profile.location.city"]}>
          <Input value={form.profile.location.city} onChange={(e) => setL("city", e.target.value)} maxLength={80} disabled={dis} />
        </Field>
        <Field label="State" optional error={errors["profile.location.state"]}>
          <Input value={form.profile.location.state} onChange={(e) => setL("state", e.target.value)} maxLength={80} disabled={dis} />
        </Field>
        <Field label="Pincode" optional error={errors["profile.location.postalCode"]}>
          <Input value={form.profile.location.postalCode} onChange={(e) => setL("postalCode", e.target.value)} maxLength={12} inputMode="numeric" disabled={dis} />
        </Field>
        <Field label="Country" optional error={errors["profile.location.country"]}>
          <Input value={form.profile.location.country} onChange={(e) => setL("country", e.target.value.toUpperCase())} maxLength={2} disabled={dis} />
        </Field>
      </CardBody>
      {canEdit ? (
        <FormActions className="px-4 pb-4 sm:px-5">
          <Button disabled={!dirty || save.isPending} onClick={() => { setForm(initial); setShow(false); save.reset(); }}>
            Discard
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty}>
            Save profile
          </Button>
        </FormActions>
      ) : null}
      <UnsavedChangesDialog blocker={blocker} />
    </Card>
  );
}

const short = (list, n = 8) => (list.length > n ? `${list.slice(0, n).join(", ")} and ${list.length - n} more` : list.join(", "));

function RoleCard({ user, self, canEdit }) {
  const kind = roleKind(user.role);
  const tenantId = user.tenantId ? String(user.tenantId?._id || user.tenantId) : user.homeTenantId ? String(user.homeTenantId) : "";
  const roles = useRolesFor(tenantId || null);
  const list = useMemo(() => assignableRoles(roles.data || [], { tenantId, kind }), [roles.data, tenantId, kind]);
  const current = String(user.role?.id || "");
  const [roleId, setRoleId] = useState(current);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setRoleId(current), [current]);
  const target = list.find((r) => String(r._id) === roleId);
  const before = new Set(user.role?.permissions || []);
  const after = new Set(target?.permissions || []);
  const added = [...after].filter((p) => !before.has(p));
  const removed = [...before].filter((p) => !after.has(p));
  const dirty = roleId && roleId !== current;
  const save = useApiMutation((rid) => api.withTenant(null).updateUser(user.id, { roleId: rid }), {
    invalidate: [keys.users.all],
    success: "Role changed — the user was signed out",
    error: false,
  });
  const locked = self || !canEdit || kind === "buyer";
  const reason = self
    ? "You can’t change your own role."
    : !canEdit
      ? "Requires users.edit."
      : kind === "buyer"
        ? "Buyers always hold the Buyer role. Converting between buyer, staff and platform accounts isn’t supported — create a separate staff account instead."
        : null;

  return (
    <Card>
      <CardHeader title="Role" description={kind === "platform" ? "Platform roles" : kind === "buyer" ? "Marketplace buyer" : "Roles of this store plus system store roles"} />
      <CardBody className="grid gap-3">
        <Field label="Role" hint={reason || "Changing the role signs the user out of every session."} error={save.error?.fieldError?.("roleId") || (save.error && !save.error.fields?.roleId ? save.error.message : undefined)}>
          <Combobox value={roleId} onChange={(v) => setRoleId(v || current)} options={roleOptions(list.length ? list : user.role ? [{ ...user.role, _id: user.role.id }] : [])} disabled={locked} placeholder={roles.isPending ? "Loading roles…" : "Select a role"} />
        </Field>
        {dirty && target ? (
          <div className="grid gap-1 rounded-md border border-border bg-surface-2 p-3 text-ui-xs">
            <p className="font-medium text-fg">Permission changes</p>
            {added.length ? <p className="text-success-fg">+ {short(added)}</p> : null}
            {removed.length ? <p className="text-danger-fg">− {short(removed)}</p> : null}
            {!added.length && !removed.length ? <p className="text-fg-muted">Same permissions.</p> : null}
          </div>
        ) : null}
        {!locked ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => setRoleId(current)}>
              Reset
            </Button>
            <Button size="sm" variant="primary" disabled={!dirty} loading={save.isPending} onClick={() => setConfirm(true)}>
              Change role
            </Button>
          </div>
        ) : null}
      </CardBody>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Change ${user.name}’s role to ${target?.name || "this role"}?`}
        description="Their permissions change immediately and they are signed out of every session (they keep their password)."
        confirmLabel="Change role"
        onConfirm={() => save.mutateAsync(roleId)}
      />
    </Card>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const can = useCan();
  const { user: me } = useAuth();
  const q = useQuery({ queryKey: keys.users.detail(id), queryFn: () => api.withTenant(null).getUser(id) });
  const [statusAction, setStatusAction] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  if (q.isPending) return <PageSkeleton />;
  if (q.error)
    return (
      <>
        <PageHeader title="User" back={B} breadcrumbs={[{ label: "Users", to: B }, { label: "Not found" }]} />
        <ErrorState error={q.error} onRetry={q.refetch} title={q.error.status === 404 ? "User not found" : undefined} />
      </>
    );
  const u = q.data;
  const self = String(u.id) === String(me?.id);
  const kind = roleKind(u.role);
  const acts = self || !can("users.edit") ? [] : userStatusActions(u);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={u.name || u.email} size="lg" />
            {u.name || u.email}
          </span>
        }
        documentTitle={u.name || u.email}
        back={B}
        breadcrumbs={[{ label: "Users", to: B }, { label: u.name || u.email }]}
        meta={
          <>
            <StatusPill status={u.status} />
            {kind === "platform" ? <Badge tone="accent">Platform admin</Badge> : kind === "buyer" ? <Badge>Buyer</Badge> : <Badge tone="info">Store staff</Badge>}
            {self ? <Badge tone="primary">You</Badge> : null}
          </>
        }
        description={u.email}
        secondaryActions={
          <Button leftIcon={ShoppingBag} to={`/super-admin/orders?q=${encodeURIComponent(u.email)}`}>
            Orders
          </Button>
        }
        primaryAction={
          acts.length ? (
            <DropdownMenu trigger={<Button rightIcon={ChevronDown}>Account status</Button>}>
              {acts.map((a) => (
                <MenuItem key={a.to} tone={a.tone} onSelect={() => setStatusAction(a)}>
                  {a.label}
                </MenuItem>
              ))}
            </DropdownMenu>
          ) : (
            <Tooltip content={self ? "You can’t change your own status" : "Requires users.edit"}>
              <span>
                <Button disabled>Account status</Button>
              </span>
            </Tooltip>
          )
        }
      />
      {u.status === "suspended" ? (
        <Alert tone="danger" title="Suspended" className="mb-5">
          This account can’t sign in. Reactivate it from Account status.
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <ProfileCard user={u} canEdit={can("users.edit")} />
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <RoleCard user={u} self={self} canEdit={can("users.edit")} />
          <Card>
            <CardHeader title="Account" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "User id", value: <Code copy>{String(u.id)}</Code> },
                  { label: "Email", value: <span className="flex flex-wrap items-center gap-2">{u.email}{u.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}</span> },
                  { label: "Store", value: u.tenantId ? <TenantLink tenant={u.tenant || u.tenantId} /> : kind === "platform" ? "Platform" : null },
                  { label: "Home store", value: u.homeTenant || u.homeTenantId ? <TenantLink tenant={u.homeTenant || u.homeTenantId} /> : null },
                  { label: "Joined", value: <DateTime value={u.createdAt} /> },
                  { label: "Last sign-in", value: <RelativeTime value={u.lastLoginAt} /> },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sessions" description="Suspending the account or changing its role also signs the user out everywhere." />
            <CardBody>
              {self ? (
                <p className="text-ui-sm text-fg-muted">Use “Sign out of all devices” in your account menu for your own sessions.</p>
              ) : can("users.edit") ? (
                <Button leftIcon={LogOut} disabled={u.status === "deleted"} onClick={() => setSigningOut(true)}>
                  Sign out everywhere
                </Button>
              ) : (
                <Tooltip content="Requires users.edit">
                  <span>
                    <Button leftIcon={LogOut} disabled>
                      Sign out everywhere
                    </Button>
                  </span>
                </Tooltip>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      {signingOut ? <SignOutEverywhereDialog user={u} onClose={() => setSigningOut(false)} /> : null}
      {statusAction ? <UserStatusDialog user={u} action={statusAction} onClose={() => setStatusAction(null)} /> : null}
    </>
  );
}
