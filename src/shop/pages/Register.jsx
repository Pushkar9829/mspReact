/**
 * /register — business sign-up (ShopAuthLayout). Three short sections in one form:
 *   1. About you — name, email, mobile (+91)
 *   2. Your business — business name and type, optional GSTIN (validated inline on blur / at 15 chars)
 *   3. Secure your account — password with a strength meter
 * `tenantSlug` when signing up from a store (?store=<slug> or location.state.store).
 *
 * The API answers 201 with the same message whether or not the email already has an account (no
 * enumeration), so we never auto-login: the next step is "check your email" plus an inline sign-in.
 */
import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailCheck, Store } from "lucide-react";
import { Button, Field, Input, Notice, Select } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor, isPortalPath } from "../../shared/auth.js";
import { usePublicStore } from "../hooks/index.js";
import { formatPhone, gstinError, normalizePhone, stateForGstin } from "../lib/indianAddress.js";
import { PasswordInput, StrengthMeter } from "../components/buying/PasswordField.jsx";
import { AuthCard } from "../components/buying/AuthCard.jsx";
import { BUSINESS_TYPES } from "../lib/business.js";

function SignInStep({ email, from }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!password) {
      setError("Enter your password");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const shop = await import("../lib/session.js");
      const before = shop.snapshotGuestCart();
      const session = await login(email, password);
      await shop.afterShopLogin(session, before);
      navigate(from && isPortalPath(from, session.role) ? from : homeFor(session.role), { replace: true });
    } catch (err) {
      setError(err?.code === "LOGIN_DELAYED" ? `${err.message}` : err?.message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-3 rounded-xl border border-shop-line bg-shop-page/60 p-4 sm:p-5">
      <p className="text-shop-sm font-semibold text-shop-ink">Sign in to start ordering</p>
      <input type="email" name="email" autoComplete="username" value={email} readOnly className="hidden" aria-hidden tabIndex={-1} />
      <Field label="Password" error={error}>
        <PasswordInput name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" block loading={busy}>
        Sign in
      </Button>
      <p className="text-center text-shop-sm">
        <Link to="/forgot-password" state={{ email }} className="inline-flex min-h-11 items-center font-semibold text-shop-primary-ink hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

/** Numbered form section. */
function Section({ n, title, hint, children }) {
  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="mb-3 flex w-full items-center gap-3">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-shop-navy text-shop-xs font-bold text-white">
          {n}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-shop-md font-bold text-shop-ink">{title}</span>
          {hint ? <span className="block text-shop-xs text-shop-muted">{hint}</span> : null}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

const FIELDS = ["name", "email", "phone", "company", "businessType", "gstin", "password"];

export default function Register() {
  useDocumentTitle("Create a business account");
  const { register } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const from = location.state?.from || "";
  const storeSlug = params.get("store") || location.state?.store || "";
  const store = usePublicStore(storeSlug || null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", company: "", businessType: "", gstin: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, clean = (v) => v) => (e) => {
    const value = clean(e.target.value);
    setForm((f) => ({ ...f, [k]: value }));
    // GSTIN: check as soon as all 15 characters are in; otherwise clear the error while typing.
    setErrors((x) => ({ ...x, [k]: k === "gstin" && value.length === 15 ? gstinError(value) || undefined : undefined, _: undefined }));
  };

  /** Inline checks when leaving a field (only for fields with something typed). */
  const check = (k) => () => {
    let msg;
    if (k === "email" && form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) msg = "Enter a valid email address";
    if (k === "phone" && form.phone && !normalizePhone(form.phone)) msg = "Enter a 10-digit mobile number";
    if (k === "gstin" && form.gstin) msg = gstinError(form.gstin) || undefined;
    if (msg) setErrors((x) => ({ ...x, [k]: msg }));
  };

  function validate() {
    const v = {};
    if (form.name.trim().length < 2) v.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) v.email = "Enter a valid email address";
    if (form.phone && !normalizePhone(form.phone)) v.phone = "Enter a 10-digit mobile number";
    if (form.password.length < 8) v.password = "Use at least 8 characters";
    if (form.company.trim().length > 120) v.company = "Keep it under 120 characters";
    if (form.gstin) {
      const msg = gstinError(form.gstin);
      if (msg) v.gstin = msg;
    }
    return v;
  }

  const focusFirst = (v) => {
    const first = FIELDS.find((k) => v[k]);
    if (first) document.querySelector(`#register-form [name="${first}"]`)?.focus();
  };

  async function submit(e) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) {
      focusFirst(v);
      return;
    }
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      const res = await register({
        name: form.name,
        email,
        password: form.password,
        company: form.company.trim() || undefined,
        phone: form.phone ? formatPhone(form.phone) : undefined,
        tenantSlug: store.data?.slug || storeSlug || undefined,
        businessType: form.businessType || undefined,
        gstin: form.gstin.trim().toUpperCase() || undefined,
      });
      setDone({ email, message: res?.message });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const f = err?.fields || {};
      const mapped = Object.fromEntries(FIELDS.filter((k) => err.fieldError?.(k) || f[k]).map((k) => [k, err.fieldError?.(k) || f[k]]));
      if (err?.status === 429) mapped._ = "Too many sign-ups from this network. Please try again in a few minutes.";
      setErrors(Object.keys(mapped).length ? mapped : { _: err?.message || "Could not create the account" });
      focusFirst(mapped);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthCard
        icon={MailCheck}
        title="Check your email"
        description={
          <p role="status" className="text-shop-text">
            If <span className="font-semibold text-shop-ink">{done.email}</span> is new to MS₹, your account is ready and we’ve sent a link to verify it. Verify before placing your first order.
          </p>
        }
      >
        <p className="mt-2 text-shop-sm text-shop-muted">Already had an account with this email? Sign in below with your existing password, or reset it.</p>
        <SignInStep email={done.email} from={from} />
      </AuthCard>
    );
  }

  const gstState = form.gstin.length === 15 && !errors.gstin && !gstinError(form.gstin) ? stateForGstin(form.gstin) : "";

  return (
    <AuthCard
      title="Create a business account"
      description="Wholesale prices, GST invoices and credit terms from verified sellers. Takes about a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={{ from }} className="font-semibold text-shop-primary-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {storeSlug && store.data ? (
        <Notice tone="business" icon={Store} className="mt-4">
          You’re signing up with <span className="font-semibold">{store.data.displayName || store.data.name}</span>. You can buy from every seller on MS₹.
        </Notice>
      ) : null}

      <form id="register-form" onSubmit={submit} noValidate className="mt-6 grid gap-7">
        <Section n={1} title="About you" hint="We use these to send order updates and invoices.">
          <Field label="Your name" error={errors.name} required>
            <Input name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email} required>
              <Input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={set("email")} onBlur={check("email")} />
            </Field>
            <Field label="Mobile number" error={errors.phone} optional>
              <Input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} value={form.phone} onChange={set("phone", (v) => v.replace(/[^\d ]/g, ""))} onBlur={check("phone")} />
            </Field>
          </div>
        </Section>

        <div className="rounded-xl border border-shop-line bg-shop-page/60 p-4 sm:p-5">
          <Section n={2} title="Your business" hint="Optional now; you can add these later from your account.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shop / business name" error={errors.company} optional>
                <Input name="company" autoComplete="organization" maxLength={120} value={form.company} onChange={set("company")} />
              </Field>
              <Field label="Business type" error={errors.businessType} optional>
                <Select name="businessType" value={form.businessType} onChange={set("businessType")} options={BUSINESS_TYPES} placeholder="Choose one" />
              </Field>
            </div>
            <Field label="GSTIN" error={errors.gstin} optional hint={gstState ? undefined : "15 characters, e.g. 27ABCDE1234F1Z5. It goes on your invoices for input tax credit."}>
              <Input
                name="gstin"
                autoCapitalize="characters"
                spellCheck={false}
                autoComplete="off"
                maxLength={15}
                value={form.gstin}
                onChange={set("gstin", (v) => v.toUpperCase().replace(/[^0-9A-Z]/g, ""))}
                onBlur={check("gstin")}
                className="uppercase tracking-wider"
              />
            </Field>
            {gstState ? (
              <p className="-mt-2 flex items-center gap-1.5 text-shop-xs font-medium text-shop-primary-ink" role="status">
                <CheckCircle2 className="size-3.5" aria-hidden /> Valid GSTIN · registered in {gstState}
              </p>
            ) : null}
          </Section>
        </div>

        <Section n={3} title="Secure your account">
          <div className="grid gap-2">
            <Field label="Password" error={errors.password} required hint="At least 8 characters. Longer, with numbers and symbols, is stronger.">
              <PasswordInput name="password" autoComplete="new-password" maxLength={100} value={form.password} onChange={set("password")} />
            </Field>
            <StrengthMeter value={form.password} />
          </div>
        </Section>

        <div className="grid gap-3">
          {errors._ ? <Notice tone="danger">{errors._}</Notice> : null}
          <Button type="submit" size="lg" block loading={busy}>
            Create business account
          </Button>
          <p className="text-center text-shop-xs text-shop-muted">
            By creating an account you agree to the{" "}
            <Link to="/pages/terms" className="underline hover:text-shop-ink">
              terms of use
            </Link>{" "}
            and{" "}
            <Link to="/pages/privacy" className="underline hover:text-shop-ink">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </form>
    </AuthCard>
  );
}
