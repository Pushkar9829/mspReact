import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor, isPortalPath } from "../../shared/auth.js";
import { Button, inputClass } from "../components/shopUi.jsx";

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
    <div className="min-h-screen bg-msr-bg">
      <div className="mx-auto grid min-h-screen max-w-5xl lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-msr-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Logo light slogan="भाव भी भरोसा भी" />
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Wholesale & retail, one floor</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Sign in to manage orders, addresses and saved items — or open your tenant / company console.
            </p>
          </div>
          <p className="text-[12px] text-white/40">MS₹ Market Server Price</p>
        </aside>

        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-msr-line bg-white p-8 shadow-card">
            <div className="lg:hidden">
              <Logo />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-msr-ink lg:mt-0">Sign in</h1>
            <p className="mt-1 text-sm text-msr-muted">One email and password for shop, tenant, and company console.</p>

            <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                inputMode="email"
                autoComplete="username"
                required
                className={inputClass}
                placeholder="Email"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                placeholder="Password"
              />
              {error ? <p className="text-sm text-msr-danger">{error}</p> : null}
              <Button type="submit" size="lg" block disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-msr-muted">
              New shopper?{" "}
              <Link to="/register" className="font-semibold text-msr-primary hover:underline">
                Create an account
              </Link>
            </p>

            <div className="mt-5 rounded-xl bg-msr-surface p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-msr-subtle">Demo accounts</p>
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
                    className="flex items-center justify-between rounded-lg border border-msr-line bg-white px-3 py-2 text-left text-xs transition hover:border-msr-primary"
                  >
                    <span className="font-bold text-msr-ink">{demo.label}</span>
                    <span className="text-msr-muted">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
