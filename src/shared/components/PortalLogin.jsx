import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { homeFor, isPortalPath, portalLabel } from "../auth.js";

export default function PortalLogin({
  title,
  subtitle,
  demoEmail,
  demoPassword,
  registerTo,
  expectedRole,
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      if (expectedRole && user.role !== expectedRole) {
        setError(`This account is for the ${portalLabel(user.role)} portal.`);
        navigate(homeFor(user.role), { replace: true });
        return;
      }
      const from = location.state?.from;
      navigate(from && isPortalPath(from, user.role) ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-msr-muted">{subtitle}</p>
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
        {registerTo ? (
          <p className="mt-4 text-sm text-msr-muted">
            New here?{" "}
            <Link to={registerTo} className="font-semibold text-msr-purple">
              Create an account
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-sm text-msr-muted">Staff accounts are created by the platform admin — use the demo login below.</p>
        )}
        <div className="mt-5 grid gap-1 rounded-xl bg-msr-bg p-3 text-xs text-msr-muted">
          <p>Other portals</p>
          <Link className="font-semibold text-msr-purple" to="/login">
            Shopper login
          </Link>
          <Link className="font-semibold text-msr-purple" to="/tenant/login">
            Tenant login
          </Link>
          <Link className="font-semibold text-msr-purple" to="/super-admin/login">
            Super admin login
          </Link>
        </div>
        <p className="mt-3 text-xs text-msr-muted">
          Demo: {demoEmail} / {demoPassword}
        </p>
      </div>
    </div>
  );
}
