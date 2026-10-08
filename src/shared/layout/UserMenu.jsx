import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, MonitorSmartphone, Store, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Avatar } from "../ui/display.jsx";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { DropdownMenu, MenuItem, MenuLabel, MenuSeparator } from "../ui/overlays.jsx";
import { ConfirmDialog, Dialog } from "../ui/Dialog.jsx";
import { Field, Input } from "../ui/form.jsx";
import { toast } from "../ui/feedback.jsx";
import { DescriptionList } from "../ui/Card.jsx";
import { DateTime } from "../ui/display.jsx";

function ProfileDialog({ open, onOpenChange }) {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ name: user?.name || "", phone: user?.phone || "" });
      setError(null);
    }
  }, [open, user?.name, user?.phone]);
  const dirty = form.name !== (user?.name || "") || form.phone !== (user?.phone || "");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Your profile"
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="profile-form" loading={busy} disabled={!dirty || form.name.trim().length < 2}>
            Save
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} className="grid gap-4">
        <Field label="Name" name="name" errors={error} required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} autoComplete="name" />
        </Field>
        <Field label="Phone" name="phone" errors={error} optional>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} inputMode="tel" autoComplete="tel" />
        </Field>
        {error && !Object.keys(error.fields || {}).length ? <p className="text-ui-sm text-danger-fg">{error.message}</p> : null}
        <DescriptionList
          columns={2}
          items={[
            { label: "Email", value: user?.email },
            { label: "Role", value: user?.roleName || user?.roleSlug },
            { label: "Store", value: user?.tenant || null },
            { label: "Last sign-in", value: user?.lastLoginAt ? <DateTime value={user.lastLoginAt} /> : null },
          ]}
        />
      </form>
    </Dialog>
  );
}

function PasswordDialog({ open, onOpenChange }) {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ current: "", next: "", confirm: "" });
      setError(null);
    }
  }, [open]);
  const mismatch = form.confirm && form.next !== form.confirm;
  const tooShort = form.next && form.next.length < 8;

  async function submit(e) {
    e.preventDefault();
    if (mismatch || tooShort || !form.confirm || form.confirm !== form.next) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(form.current, form.next);
      toast.success("Password changed", { description: "Your other sessions were signed out." });
      onOpenChange(false);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change password"
      description="Other devices will be signed out. This one stays signed in."
      dirty={Boolean(form.current || form.next)}
      busy={busy}
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="password-form" loading={busy} disabled={!form.current || !form.next || !form.confirm || form.confirm !== form.next || tooShort}>
            Change password
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} className="grid gap-4">
        <Field label="Current password" name="currentPassword" errors={error} required>
          <Input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <Field label="New password" name="newPassword" errors={error} error={tooShort ? "Use at least 8 characters" : undefined} hint="At least 8 characters" required>
          <Input type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </Field>
        <Field label="Confirm new password" error={mismatch ? "Passwords don’t match" : undefined} required>
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        {error && !Object.keys(error.fields || {}).length ? (
          <p role="alert" className="text-ui-sm text-danger-fg">
            {error.message}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

/** Avatar menu: profile, change password, storefront, sign out, sign out everywhere. */
export function UserMenu({ storefront = true }) {
  const { user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);

  return (
    <>
      <DropdownMenu
        trigger={
          <button type="button" className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-hover" aria-label="Account menu">
            <Avatar name={user?.name} size="sm" />
            <span className="hidden max-w-32 truncate text-ui-sm font-medium text-fg lg:block">{user?.name}</span>
          </button>
        }
      >
        <div className="px-2 py-2">
          <p className="truncate text-ui-sm font-medium text-fg">{user?.name}</p>
          <p className="truncate text-ui-xs text-fg-subtle">{user?.email}</p>
          {user?.roleName ? (
            <Badge tone="primary" className="mt-1.5">
              {user.roleName}
            </Badge>
          ) : null}
        </div>
        <MenuSeparator />
        <MenuItem icon={UserRound} onSelect={() => setDialog("profile")}>
          Profile
        </MenuItem>
        <MenuItem icon={KeyRound} onSelect={() => setDialog("password")}>
          Change password
        </MenuItem>
        {storefront ? (
          <MenuItem icon={Store} onSelect={() => navigate("/")}>
            Open storefront
          </MenuItem>
        ) : null}
        <MenuSeparator />
        <MenuLabel>Sessions</MenuLabel>
        <MenuItem
          icon={LogOut}
          onSelect={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          Sign out
        </MenuItem>
        <MenuItem icon={MonitorSmartphone} tone="danger" onSelect={() => setDialog("logoutAll")}>
          Sign out everywhere
        </MenuItem>
      </DropdownMenu>
      <ProfileDialog open={dialog === "profile"} onOpenChange={(o) => setDialog(o ? "profile" : null)} />
      <PasswordDialog open={dialog === "password"} onOpenChange={(o) => setDialog(o ? "password" : null)} />
      <ConfirmDialog
        open={dialog === "logoutAll"}
        onOpenChange={(o) => setDialog(o ? "logoutAll" : null)}
        title="Sign out everywhere?"
        description="All your sessions on every device and browser end immediately, including this one."
        confirmLabel="Sign out everywhere"
        tone="danger"
        onConfirm={async () => {
          await logoutAll();
          navigate("/login", { replace: true });
        }}
      />
    </>
  );
}

export default UserMenu;
