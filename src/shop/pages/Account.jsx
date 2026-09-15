import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor, ROLES } from "../../shared/auth.js";
import { api } from "../../shared/api.js";
import { AccountCard, AccountField, AccountHead, accountField } from "../components/accountUi.jsx";

export default function Account() {
  const { user, logout, patchUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        setName(me.name || "");
        setPhone(me.phone || "");
        patchUser({ name: me.name, phone: me.phone || "" });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setSaving(true);
    try {
      const me = await api.updateMe({ name: name.trim(), phone: phone.trim() });
      patchUser({ name: me.name, phone: me.phone || "" });
      setMsg("Profile saved.");
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPassError("");
    setPassMsg("");
    setPassBusy(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPassMsg("Password updated.");
    } catch (err) {
      setPassError(err.message || "Could not update password.");
    } finally {
      setPassBusy(false);
    }
  }

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const roleLabel = String(user?.role || "").replaceAll("_", " ");

  return (
    <div className="space-y-5">
      <AccountHead title="Profile" subtitle="Name, phone and password for your MS₹ account." />

      <div className="overflow-hidden rounded-2xl bg-msr-navy text-white">
        <div className="h-[3px] bg-gradient-to-r from-msr-gold via-white/40 to-msr-gold" />
        <div className="flex items-center gap-4 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-msr-gold text-lg font-extrabold text-msr-navy">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{user?.name || "Your account"}</p>
            <p className="truncate text-sm text-white/65">{user?.email}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-msr-gold">{roleLabel}</p>
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile}>
        <AccountCard>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fffaf0] text-[#8a6a12]">
              <UserRound className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6a12]">Details</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AccountField label="Full name">
              <input className={accountField} value={name} onChange={(e) => setName(e.target.value)} required />
            </AccountField>
            <AccountField label="Phone">
              <input
                className={accountField}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </AccountField>
            <AccountField label="Email" className="sm:col-span-2">
              <input className={`${accountField} bg-msr-bg`} value={user?.email || ""} readOnly />
            </AccountField>
          </div>
          {error ? <p className="mt-3 text-sm text-msr-danger">{error}</p> : null}
          {msg ? <p className="mt-3 text-sm font-semibold text-msr-success">{msg}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {user?.role && user.role !== ROLES.BUYER ? (
              <Link
                to={homeFor(user.role)}
                className="rounded-full border border-[#ece6d4] px-5 py-2.5 text-sm font-bold text-msr-navy"
              >
                Open {user.role === ROLES.SUPER_ADMIN ? "company" : "tenant"} panel
              </Link>
            ) : null}
          </div>
        </AccountCard>
      </form>

      <form onSubmit={savePassword}>
        <AccountCard>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fffaf0] text-[#8a6a12]">
              <KeyRound className="h-4 w-4" />
            </span>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6a12]">Password</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AccountField label="Current password">
              <input
                className={accountField}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </AccountField>
            <AccountField label="New password">
              <input
                className={accountField}
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </AccountField>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#8b8ea3]">
            <ShieldCheck className="h-3.5 w-3.5" />
            At least 8 characters.
          </p>
          {passError ? <p className="mt-3 text-sm text-msr-danger">{passError}</p> : null}
          {passMsg ? <p className="mt-3 text-sm font-semibold text-msr-success">{passMsg}</p> : null}
          <button
            type="submit"
            disabled={passBusy}
            className="mt-4 rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {passBusy ? "Updating…" : "Update password"}
          </button>
        </AccountCard>
      </form>

      <AccountCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-msr-navy">Sign out</p>
          <p className="mt-0.5 text-sm text-[#8b8ea3]">You can sign back in anytime on this device.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-red-100 px-5 py-2.5 text-sm font-bold text-msr-danger hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </AccountCard>
    </div>
  );
}
