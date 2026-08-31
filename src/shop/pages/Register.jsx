import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor } from "../../shared/auth.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-4 text-2xl font-extrabold">Create account</h1>
        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <input
            required
            placeholder="Full name"
            className="rounded-xl border border-msr-border px-4 py-3"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            className="rounded-xl border border-msr-border px-4 py-3"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            minLength={8}
            type="password"
            autoComplete="new-password"
            placeholder="Password (min 8 characters)"
            className="rounded-xl border border-msr-border px-4 py-3"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error ? <p className="text-sm text-msr-danger">{error}</p> : null}
          <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy py-3 font-bold text-white disabled:opacity-50">
            {busy ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-sm text-msr-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-msr-purple">
            Shopper sign in
          </Link>
          {" · "}
          <Link to="/tenant/login" className="font-semibold text-msr-purple">
            Tenant
          </Link>
          {" · "}
          <Link to="/super-admin/login" className="font-semibold text-msr-purple">
            Super admin
          </Link>
        </p>
      </div>
    </div>
  );
}
