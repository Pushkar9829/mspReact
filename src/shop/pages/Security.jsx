/**
 * /account/security — change password (AuthContext.changePassword keeps this device signed in
 * with the fresh token), sign out everywhere, export my data, delete account (409 OPEN_ORDERS).
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Download, KeyRound, LogOut, MonitorSmartphone, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Field, Input, Notice, ShopPageHeader, toast } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { IconCircle } from "../components/account/AccountKit.jsx";
import { formatDateTime } from "../../shared/lib/format.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api, endSession } from "../../shared/api/index.js";
import { PasswordInput, StrengthMeter } from "../components/buying/PasswordField.jsx";

function Section({ icon, tone, title, description, children, danger = false }) {
  return (
    <section aria-label={title} className={cn("overflow-hidden rounded-[1.25rem] border bg-shop-card", danger ? "border-shop-danger/30" : "border-shop-line")}>
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <IconCircle icon={icon} tone={tone} />
        <div className="min-w-0">
          <h2 className="font-display text-shop-md font-bold text-shop-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-shop-sm text-shop-muted">{description}</p> : null}
        </div>
      </div>
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}

function SignInSummary() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="grid gap-px overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-line sm:grid-cols-3">
      <div className="min-w-0 bg-shop-card px-4 py-3">
        <p className="text-shop-xs text-shop-muted">Sign-in email</p>
        <p className="truncate text-shop-sm font-semibold text-shop-ink">{user.email}</p>
      </div>
      <div className="bg-shop-card px-4 py-3">
        <p className="text-shop-xs text-shop-muted">Email status</p>
        {user.emailVerified ? (
          <p className="inline-flex items-center gap-1 text-shop-sm font-semibold text-shop-primary-ink">
            <BadgeCheck className="size-4" aria-hidden /> Verified
          </p>
        ) : (
          <p className="text-shop-sm font-semibold text-shop-warning-ink">
            Not verified ·{" "}
            <Link to="/account" className="underline">
              verify
            </Link>
          </p>
        )}
      </div>
      <div className="bg-shop-card px-4 py-3">
        <p className="text-shop-xs text-shop-muted">Last sign-in</p>
        <p className="text-shop-sm font-semibold text-shop-ink">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</p>
      </div>
    </div>
  );
}

function ChangePassword() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined, _: undefined }));
  };
  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (!form.current) v.current = "Enter your current password";
    if (form.next.length < 8) v.next = "Use at least 8 characters";
    else if (form.next === form.current) v.next = "Choose a password you haven’t used here";
    if (form.confirm !== form.next) v.confirm = "The passwords don’t match";
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector(`#pw-form [name="${Object.keys(v)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      toast.success("Password changed", { description: "You stay signed in here. Other devices were signed out." });
    } catch (err) {
      const f = err?.fields || {};
      if (err?.code === "INVALID_PASSWORD") setErrors({ current: err.message });
      else if (f.newPassword) setErrors({ next: f.newPassword });
      else setErrors({ _: err?.message || "Could not change the password" });
      document.querySelector(`#pw-form [name="${err?.code === "INVALID_PASSWORD" ? "current" : "next"}"]`)?.focus();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form id="pw-form" onSubmit={submit} noValidate className="grid max-w-md gap-4">
      <input type="text" name="username" autoComplete="username" className="hidden" readOnly aria-hidden tabIndex={-1} />
      <Field label="Current password" error={errors.current} required>
        <PasswordInput name="current" autoComplete="current-password" value={form.current} onChange={set("current")} />
      </Field>
      <Field label="New password" error={errors.next} required hint="At least 8 characters">
        <PasswordInput name="next" autoComplete="new-password" value={form.next} onChange={set("next")} />
      </Field>
      <StrengthMeter value={form.next} />
      <Field label="Confirm new password" error={errors.confirm} required>
        <PasswordInput name="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
      </Field>
      {errors._ ? <Notice tone="danger">{errors._}</Notice> : null}
      <div>
        <Button type="submit" loading={busy}>
          Change password
        </Button>
      </div>
    </form>
  );
}

function SignOutEverywhere() {
  const { logoutAll } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" leftIcon={LogOut} onClick={() => setOpen(true)}>
        Sign out of all devices
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out everywhere?"
        description="You will be signed out on every phone, tablet and computer, including this one."
        confirmLabel="Sign out everywhere"
        onConfirm={async () => {
          await logoutAll();
          navigate("/login", { replace: true });
        }}
      />
    </>
  );
}

function ExportData() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      leftIcon={Download}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.exportMe();
          toast.success("Your data was downloaded");
        } catch (err) {
          toast.error(err?.message || "Could not export your data");
        } finally {
          setBusy(false);
        }
      }}
    >
      Download my data (JSON)
    </Button>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [openOrders, setOpenOrders] = useState(false);
  return (
    <>
      <Button variant="danger" leftIcon={Trash2} onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setPassword("");
            setOpenOrders(false);
          }
        }}
        title="Delete your account?"
        description="Your profile, addresses and wishlist are removed. Orders and GST invoices are kept as the law requires, without your personal details."
        confirmLabel="Delete account"
        tone="danger"
        typedConfirmation="DELETE"
        onConfirm={async () => {
          if (!password) throw new Error("Enter your password");
          setOpenOrders(false);
          try {
            await api.deleteMe(password);
          } catch (err) {
            if (err?.code === "OPEN_ORDERS") {
              setOpenOrders(true);
              throw new Error("You have orders that are not finished yet.");
            }
            throw err;
          }
          toast.success("Your account was deleted");
          endSession("logout");
          navigate("/", { replace: true });
        }}
      >
        <Field label="Your password" required>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {openOrders ? (
          <p className="text-shop-sm text-shop-text">
            Wait for them to be delivered, or{" "}
            <Link to="/account/orders?status=pending,confirmed,processing,ready_to_ship" className="font-semibold text-shop-primary-ink underline">
              cancel open orders
            </Link>
            , then try again.
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

export default function Security() {
  return (
    <div className="grid gap-5">
      <ShopPageHeader title="Login and security" description="Password, devices and your data." />
      <SignInSummary />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
        <Section icon={KeyRound} title="Change password" description="Other devices are signed out; you stay signed in here.">
          <ChangePassword />
        </Section>
        <div className="grid gap-5">
          <Section icon={MonitorSmartphone} tone="info" title="Devices and sessions" description="Lost a phone or used a shared computer? Sign out of every session, including this one.">
            <SignOutEverywhere />
          </Section>
          <Section icon={Download} tone="gold" title="Your data" description="A copy of your profile, addresses, orders and wishlist.">
            <ExportData />
          </Section>
        </div>
      </div>
      <Section icon={Trash2} tone="danger" danger title="Delete account" description="Permanent. Finish or cancel open orders first. GST invoices are kept as the law requires.">
        <DeleteAccount />
      </Section>
    </div>
  );
}
