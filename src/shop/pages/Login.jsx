import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor, isPortalPath } from "../../shared/auth.js";

const DEMOS = [
  { label: "Shopper", email: "buyer@acme.local", password: "Buyer123!" },
  { label: "Tenant", email: "vendor@acme.local", password: "Vendor123!" },
  { label: "Super admin", email: "admin@msp.local", password: "ChangeMe123!" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.token) {
      const from = location.state?.from;
      navigate(from && isPortalPath(from, user.role) ? from : homeFor(user.role), { replace: true });
    }
  }, [user, location.state, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = await login(email, password);
      const from = location.state?.from;
      navigate(from && isPortalPath(from, session.role) ? from : homeFor(session.role), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center bg-msr-bg">
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <Logo />
          <h1 className="mt-4 text-2xl font-extrabold text-msr-navy">Sign in</h1>
          <p className="mt-1 text-sm text-msr-muted">
            One email and password for shop, tenant, and company console.
          </p>
          <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              className="rounded-xl border border-msr-border px-4 py-3"
              placeholder="Email"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="rounded-xl border border-msr-border px-4 py-3"
              placeholder="Password"
            />
            {error ? <p className="text-sm text-msr-danger">{error}</p> : null}
            <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-sm text-msr-muted">
            New shopper?{" "}
            <Link to="/register" className="font-semibold text-msr-purple">
              Create an account
            </Link>
          </p>
          <div className="mt-5 rounded-xl bg-msr-bg p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6a12]">Demo accounts</p>
            <div className="mt-2 grid gap-2">
              {DEMOS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword(demo.password);
                    setError("");
                  }}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-xs hover:ring-1 hover:ring-[#ead9a0]"
                >
                  <span className="font-bold text-msr-navy">{demo.label}</span>
                  <span className="text-msr-muted">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
