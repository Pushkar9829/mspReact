import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { USER_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import { Alert, Button, ConfirmDialog, Dialog, Field, IconButton, Input, Select, Sheet } from "../../../shared/ui/index.js";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateMember(form, { create }) {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Enter at least 2 characters";
  else if (name.length > 120) errors.name = "Keep it under 120 characters";
  if (form.phone.trim().length > 20) errors.phone = "Phone can be at most 20 characters";
  else if (form.phone.trim() && !/^[+\d][\d\s-]*$/.test(form.phone.trim())) errors.phone = "Use digits, spaces, + or -";
  if (create) {
    if (!EMAIL_RX.test(form.email.trim())) errors.email = "Enter a valid email address";
    if (form.password.length < 8) errors.password = "Use at least 8 characters";
    else if (form.password.length > 100) errors.password = "Use at most 100 characters";
  }
  if (!form.roleId) errors.roleId = "Choose a role";
  return errors;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function serverFieldError(err, name) {
  if (!err) return undefined;
  if (name === "email" && err.code === "DUPLICATE") return "This email is already registered";
  return err.fieldError?.(name);
}

const STATUS_HINTS = {
  active: "Can sign in right away.",
  pending: "Account exists but can’t be used until activated.",
  suspended: "Can’t sign in.",
};

/* ------------------------------------------------------------------ Create */

const EMPTY = { name: "", email: "", phone: "", password: "", roleId: "", status: "active" };

export function CreateMemberDialog({ open, onOpenChange, roleOptions, rolesLoading }) {
  const [form, setForm] = useState(EMPTY);
  const [showErrors, setShowErrors] = useState(false);
  const [reveal, setReveal] = useState(false);
  const create = useApiMutation((body) => api.createUser(body), {
    invalidate: [keys.users.all],
    success: (u) => `${u?.name || "Member"} added to the team`,
    error: false,
    onSuccess: () => onOpenChange(false),
  });

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setShowErrors(false);
      setReveal(false);
      create.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const errors = validateMember(form, { create: true });
  const err = (name) => (showErrors ? errors[name] : undefined) || serverFieldError(create.error, name);
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const serverFields = create.error ? Object.keys(create.error.fields || {}).length > 0 || create.error.code === "DUPLICATE" : false;

  function submit(e) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const body = { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, roleId: form.roleId, status: form.status };
    if (form.phone.trim()) body.phone = form.phone.trim();
    create.mutate(body);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add team member"
      description="Create a staff account for your store. Share the password with them securely; they can change it after signing in."
      dirty={dirty}
      busy={create.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="create-member" variant="primary" loading={create.isPending}>
            Add member
          </Button>
        </>
      }
    >
      <form id="create-member" onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={err("name")}>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" maxLength={120} />
          </Field>
          <Field label="Phone" optional error={err("phone")}>
            <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={20} autoComplete="off" />
          </Field>
        </div>
        <Field label="Email" required error={err("email")} hint="Used to sign in.">
          <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" maxLength={254} />
        </Field>
        <Field label="Temporary password" required error={err("password")} hint="At least 8 characters.">
          <div className="flex gap-2">
            <Input
              type={reveal ? "text" : "password"}
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
              autoComplete="new-password"
              maxLength={100}
              className="flex-1"
              aria-invalid={err("password") ? true : undefined}
            />
            <IconButton icon={reveal ? EyeOff : Eye} label={reveal ? "Hide password" : "Show password"} onClick={() => setReveal((v) => !v)} />
            <Button leftIcon={RefreshCw} onClick={() => { set({ password: generatePassword() }); setReveal(true); }}>
              Generate
            </Button>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" required error={err("roleId")} hint={!roleOptions.length && !rolesLoading ? "No roles available to assign." : undefined}>
            <Select value={form.roleId} onValueChange={(v) => set({ roleId: v })} options={roleOptions} placeholder={rolesLoading ? "Loading roles…" : "Choose a role"} disabled={rolesLoading} />
          </Field>
          <Field label="Status" hint={STATUS_HINTS[form.status]}>
            <Select value={form.status} onValueChange={(v) => set({ status: v })} options={statusOptions(USER_STATUSES)} />
          </Field>
        </div>
        {create.error && !serverFields ? <Alert tone="danger">{create.error.message}</Alert> : null}
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Edit */

export function EditMemberSheet({ member, onOpenChange, roleOptions, isSelf, canEdit, canChangeRole = true }) {
  const open = Boolean(member);
  const initial = useMemo(
    () => ({
      name: member?.name || "",
      phone: member?.phone || "",
      roleId: member?.role?.id ? String(member.role.id) : "",
      status: member?.status || "active",
    }),
    [member]
  );
  const [form, setForm] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    setForm(initial);
    setShowErrors(false);
    setConfirm(null);
  }, [initial]);

  const save = useApiMutation((body) => api.updateUser(member.id, body), {
    invalidate: [keys.users.all],
    success: "Member updated",
    error: false,
    onSuccess: () => onOpenChange(false),
  });
  useEffect(() => {
    if (open) save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const options = useMemo(() => {
    const list = [...roleOptions];
    if (member?.role?.id && !list.some((o) => o.value === String(member.role.id))) {
      list.unshift({ value: String(member.role.id), label: member.role.name || "Current role" });
    }
    return list;
  }, [roleOptions, member]);

  const errors = validateMember(form, { create: false });
  const err = (name) => (showErrors ? errors[name] : undefined) || serverFieldError(save.error, name);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const body = {};
  if (form.name.trim() !== initial.name) body.name = form.name.trim();
  if (form.phone.trim() !== initial.phone) body.phone = form.phone.trim();
  if (!isSelf && canChangeRole && form.roleId !== initial.roleId) body.roleId = form.roleId;
  if (!isSelf && form.status !== initial.status) body.status = form.status;
  const dirty = Object.keys(body).length > 0;
  const signsOut = Boolean(body.roleId) || (body.status && body.status !== "active");

  function submit(e) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length || !dirty) return;
    if (body.roleId || body.status) {
      setConfirm(body);
      return;
    }
    save.mutate(body);
  }

  const roleName = options.find((o) => o.value === form.roleId)?.role?.name || options.find((o) => o.value === form.roleId)?.label;
  const serverFields = save.error ? Object.keys(save.error.fields || {}).length > 0 : false;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={member ? `Edit ${member.name}` : "Edit member"}
        description={member?.email}
        dirty={dirty}
        busy={save.isPending}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            {canEdit ? (
              <Button type="submit" form="edit-member" variant="primary" loading={save.isPending} disabled={!dirty}>
                Save changes
              </Button>
            ) : null}
          </>
        }
      >
        <form id="edit-member" onSubmit={submit} className="grid gap-4" noValidate>
          <fieldset disabled={!canEdit || save.isPending} className="m-0 grid min-w-0 gap-4 border-0 p-0">
            <Field label="Full name" required error={err("name")}>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Phone" optional error={err("phone")}>
              <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={20} />
            </Field>
            <Field label="Role" error={err("roleId")} hint={isSelf ? "You can’t change your own role." : !canChangeRole ? "Changing roles requires roles.view." : "Changing the role signs this member out everywhere."}>
              <Select value={form.roleId} onValueChange={(v) => set({ roleId: v })} options={options} disabled={isSelf || !canEdit || !canChangeRole} />
            </Field>
            <Field label="Status" error={err("status")} hint={isSelf ? "You can’t change your own status." : STATUS_HINTS[form.status]}>
              <Select value={form.status} onValueChange={(v) => set({ status: v })} options={statusOptions(USER_STATUSES)} disabled={isSelf || !canEdit} />
            </Field>
          </fieldset>
          {!canEdit ? <Alert tone="info">View only — editing members requires users.edit.</Alert> : null}
          {save.error && !serverFields ? <Alert tone="danger">{save.error.message}</Alert> : null}
        </form>
      </Sheet>
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(next) => !next && setConfirm(null)}
        title={`Save changes to ${member?.name || "member"}?`}
        description={
          signsOut
            ? `${confirm?.roleId ? `Their role changes to ${roleName}. ` : ""}${confirm?.status ? `Their status changes to ${confirm.status}. ` : ""}They are signed out of every device and must sign in again.`
            : `Their status changes to ${confirm?.status}. They can sign in again with their existing password.`
        }
        confirmLabel={signsOut ? "Save and sign out" : "Save"}
        tone={signsOut ? "danger" : "primary"}
        onConfirm={async () => {
          await save.mutateAsync(confirm);
        }}
      />
    </>
  );
}
