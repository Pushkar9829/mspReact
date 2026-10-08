import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { homeFor, isPortalPath } from "../auth.js";
import { Logo } from "../components/ui.jsx";
import { Button } from "../ui/Button.jsx";
import { Field, Input } from "../ui/form.jsx";
import { Alert } from "../ui/feedback.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import ShopAuthLayout from "../../shop/layouts/ShopAuthLayout.jsx";
import { AuthCard } from "../../shop/components/buying/AuthCard.jsx";
import { PasswordInput } from "../../shop/components/buying/PasswordField.jsx";
import { Button as ShopButton } from "../../shop/components/ui/Button.jsx";
import { Field as ShopField, Input as ShopInput } from "../../shop/components/ui/form.jsx";
import { Notice as ShopNotice } from "../../shop/components/ui/Layout.jsx";

const PANEL_FROM = /^\/(tenant|super-admin)(\/|$)/;

const DEMOS = import.meta.env.DEV
  ? [
      { label: "Shopper", email: "buyer@acme.local", password: "Buyer123!" },
      { label: "Seller", email: "vendor@acme.local", password: "Vendor123!" },
    ]
  : [];

function useCountdown(delay) {
  const [left, setLeft] = useState(0);
  useEffect(() => setLeft(delay?.secs || 0), [delay]);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left;
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/** One sign-in for shoppers, sellers and the company console. Handles 429 LOGIN_DELAYED with a countdown. */
export default function SignInPage() {
  useDocumentTitle("Sign in");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [delay, setDelay] = useState(null);
  const [busy, setBusy] = useState(false);
  const left = useCountdown(delay);

  const from = location.state?.from || "";
  /** Coming from the storefront (or no origin): shop-styled page, cart merge + price notice after login. */
  const shopMode = !PANEL_FROM.test(from) && !location.state?.panel;

  const destination = (role) => {
    const from = location.state?.from;
    return from && isPortalPath(from, role) ? from : homeFor(role);
  };

  const submitting = useRef(false);
  useEffect(() => {
    // Already signed in (or signed in from another tab). During our own submit, onSubmit navigates
    // after the cart merge has been written to the cache.
    if (user?.token && !submitting.current) navigate(destination(user.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmit(e) {
    e.preventDefault();
    if (left > 0) return;
    setError(null);
    if (!email.trim() || !password) {
      setError({ message: "Enter your email and password." });
      return;
    }
    setBusy(true);
    submitting.current = true;
    try {
      if (shopMode) {
        // Snapshot the guest cart, sign in (AuthContext merges it server-side), then put the merged
        // quote in the cache and show "business prices applied" before navigating.
        const shop = await import("../../shop/lib/session.js");
        const before = shop.snapshotGuestCart();
        const session = await login(email, password);
        await shop.afterShopLogin(session, before);
        navigate(destination(session.role), { replace: true });
        return;
      }
      const session = await login(email, password);
      navigate(destination(session.role), { replace: true });
    } catch (err) {
      if (err?.code === "LOGIN_DELAYED") setDelay({ secs: Number(err.retryAfter) || 30, at: Date.now() });
      setError(err);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const locked = left > 0;

  const card = (
        <div className="w-full max-w-md rounded-2xl border border-msr-line bg-white p-8 shadow-card">
          {!shopMode ? (
            <div className="lg:hidden">
              <Logo />
            </div>
          ) : null}
          <h1 className={`text-2xl font-extrabold text-msr-ink ${shopMode ? "" : "mt-2 lg:mt-0"}`}>Sign in</h1>
          <p className="mt-1 text-sm text-msr-muted">
            {shopMode ? (from === "/checkout" || from === "/cart" ? "Sign in to check out. Your cart comes with you." : "Orders, business prices and credit terms in one account.") : "One account for the shop, your store and the company console."}
          </p>

          {location.state?.wrongRole ? (
            <Alert tone="info" className="mt-5">
              That area needs a different account. Sign in with the right one to continue.
            </Alert>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4">
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // The delay is per account: a different email may sign in right away.
                  if (delay) setDelay(null);
                }} type="email" inputMode="email" autoComplete="username" autoFocus />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-fg-subtle hover:text-fg"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            {locked ? (
              <Alert tone="warning" title="Too many attempts">
                For your security, sign-in for this account is paused. Try again in <span className="font-semibold tabular-nums">{fmt(left)}</span>.
              </Alert>
            ) : error ? (
              <Alert tone="danger">{error.message || "Invalid email or password"}</Alert>
            ) : null}

            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={locked} leftIcon={LogIn} className="w-full">
              {locked ? `Try again in ${fmt(left)}` : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="font-semibold text-msr-primary hover:underline">
                Forgot password?
              </Link>
              <Link to="/register" state={location.state} className="font-semibold text-msr-primary hover:underline">
                Create account
              </Link>
            </div>
          </form>

          {DEMOS.length ? (
            <div className="mt-6 border-t border-msr-line pt-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-msr-muted">Demo accounts (dev only)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMOS.map((d) => (
                  <Button
                    key={d.label}
                    size="xs"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                    }}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
  );

  if (shopMode) {
    // Storefront look only: shop UI kit inside ShopAuthLayout. Same state, handlers and API calls as
    // the panel card below (which stays untouched for the tenant / super-admin sign-in).
    const toCheckout = from === "/checkout" || from === "/cart";
    return (
      <ShopAuthLayout>
        <AuthCard
          title={toCheckout ? "Sign in to check out" : "Sign in"}
          description={toCheckout ? "Your cart comes with you, with business prices applied." : "Orders, business prices and credit terms in one account."}
          footer={
            <>
              New to MS₹?{" "}
              <Link to="/register" state={location.state} className="font-semibold text-shop-primary-ink hover:underline">
                Open a business account
              </Link>{" "}
              for wholesale prices and credit terms.
            </>
          }
        >
          {location.state?.reset ? (
            <ShopNotice tone="success" className="mt-5">
              Password changed. Sign in with your new password.
            </ShopNotice>
          ) : null}
          {location.state?.wrongRole ? (
            <ShopNotice tone="info" className="mt-5">
              That area needs a different account. Sign in with the right one to continue.
            </ShopNotice>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4">
            <ShopField label="Email">
              <ShopInput
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // The delay is per account: a different email may sign in right away.
                  if (delay) setDelay(null);
                }}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus
              />
            </ShopField>
            <div className="grid gap-1.5">
              <ShopField label="Password">
                <PasswordInput name="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </ShopField>
              <div className="flex justify-end">
                <Link to="/forgot-password" state={email.trim() ? { email: email.trim() } : undefined} className="inline-flex min-h-9 items-center text-shop-sm font-semibold text-shop-primary-ink hover:underline pointer-coarse:min-h-11">
                  Forgot password?
                </Link>
              </div>
            </div>

            {locked ? (
              <ShopNotice tone="warning" title="Too many attempts">
                For your security, sign-in for this account is paused. Try again in <span className="font-semibold tabular-nums">{fmt(left)}</span>.
              </ShopNotice>
            ) : error ? (
              <ShopNotice tone="danger">{error.message || "Invalid email or password"}</ShopNotice>
            ) : null}

            <ShopButton type="submit" size="lg" block loading={busy} disabled={locked} leftIcon={LogIn}>
              {locked ? `Try again in ${fmt(left)}` : "Sign in"}
            </ShopButton>
          </form>

          {DEMOS.length ? (
            <div className="mt-6 border-t border-shop-line pt-4">
              <p className="text-shop-xs font-semibold uppercase tracking-wider text-shop-muted">Demo accounts (dev only)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMOS.map((d) => (
                  <ShopButton
                    key={d.label}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword(d.password);
                    }}
                  >
                    {d.label}
                  </ShopButton>
                ))}
              </div>
            </div>
          ) : null}
        </AuthCard>
      </ShopAuthLayout>
    );
  }

  return (
    <div className="grid min-h-dvh bg-msr-bg lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0b1033] p-10 text-white lg:flex">
        <Logo light slogan="भाव भी भरोसा भी" />
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Wholesale & retail, one floor</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">Sign in to manage orders, addresses and saved items — or open your store or company console.</p>
        </div>
        <p className="text-[12px] text-white/40">MS₹ Market Server Price</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        {card}
      </main>
    </div>
  );
}
