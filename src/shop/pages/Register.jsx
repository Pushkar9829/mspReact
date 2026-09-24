import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor } from "../../shared/auth.js";
import { Button, inputClass } from "../components/shopUi.jsx";

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
    <div className="min-h-screen bg-msr-bg">
      <div className="mx-auto grid min-h-screen max-w-5xl lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-msr-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Logo light slogan="भाव भी भरोसा भी" />
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Create your MS₹ account</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Track orders, save addresses and unlock wholesale pricing for your business.
            </p>
          </div>
          <p className="text-[12px] text-white/40">MS₹ Market Server Price</p>
        </aside>

        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-msr-line bg-white p-8 shadow-card">
            <div className="lg:hidden">
              <Logo />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-msr-ink lg:mt-0">Create account</h1>
            <p className="mt-1 text-sm text-msr-muted">Shop as a household or register for bulk buying.</p>

            <form onSubmit={onSubmit} className="mt-6 grid gap-3">
              <input
                required
                placeholder="Full name"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="Email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                placeholder="Password (min 8 characters)"
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {error ? <p className="text-sm text-msr-danger">{error}</p> : null}
              <Button type="submit" size="lg" block disabled={busy}>
                {busy ? "Creating account…" : "Sign up"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-msr-muted">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-msr-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
