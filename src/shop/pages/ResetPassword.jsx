/** /reset-password?token= — set a new password from the emailed link. */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, LogIn, Mail, XCircle } from "lucide-react";
import { Button, Field, Notice } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { api } from "../../shared/api/index.js";
import { PasswordInput, StrengthMeter } from "../components/buying/PasswordField.jsx";
import { AuthCard } from "../components/buying/AuthCard.jsx";

export default function ResetPassword() {
  useDocumentTitle("Set a new password");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(token.length >= 10 ? "form" : "invalid");

  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (password.length < 8) v.password = "Use at least 8 characters";
    if (confirm !== password) v.confirm = "The passwords don’t match";
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector(`#reset-form [name="${Object.keys(v)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword({ token, password });
      setState("done");
    } catch (err) {
      if (err?.code === "INVALID_TOKEN" || err?.fields?.token) setState("invalid");
      else setErrors({ password: err?.fields?.password, _: err?.fields?.password ? undefined : err?.message || "Could not reset the password" });
    } finally {
      setBusy(false);
    }
  }

  if (state === "done") {
    return (
      <AuthCard role="status" icon={CheckCircle2} title="Password changed" description={<p className="text-shop-text">For your security we signed you out on all devices. Sign in with your new password.</p>}>
        <Button className="mt-6" size="lg" block to="/login" state={{ reset: true }} leftIcon={LogIn}>
          Sign in
        </Button>
      </AuthCard>
    );
  }

  if (state === "invalid") {
    return (
      <AuthCard role="alert" icon={XCircle} tone="danger" title="This link doesn’t work" description={<p className="text-shop-text">Reset links expire after a while and can be used once. Request a new one and use the latest email.</p>}>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button to="/forgot-password" state={{ expired: true }} leftIcon={Mail}>
            Get a new link
          </Button>
          <Button to="/login" variant="secondary">
            Back to sign in
          </Button>
        </div>
      </AuthCard>
    );
  }

  const mismatch = confirm && password && confirm.length >= password.length && confirm !== password;

  return (
    <AuthCard
      icon={KeyRound}
      title="Set a new password"
      description="Choose a password you don’t use on other sites."
      footer={
        <Link to="/login" className="font-semibold text-shop-primary-ink hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form id="reset-form" onSubmit={submit} noValidate className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Field label="New password" error={errors.password} required hint="At least 8 characters">
            <PasswordInput name="password" autoComplete="new-password" maxLength={100} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <StrengthMeter value={password} />
        </div>
        <Field label="Confirm new password" error={errors.confirm || (mismatch ? "The passwords don’t match" : undefined)} required>
          <PasswordInput name="confirm" autoComplete="new-password" maxLength={100} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {errors._ ? <Notice tone="danger">{errors._}</Notice> : null}
        <Button type="submit" size="lg" block loading={busy}>
          Save new password
        </Button>
      </form>
    </AuthCard>
  );
}
