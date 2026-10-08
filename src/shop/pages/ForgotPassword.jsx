/** /forgot-password — request a reset link. The API answers the same for any email (no enumeration). */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, KeyRound, MailCheck, RotateCw } from "lucide-react";
import { Button, Field, Input, Notice } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { api } from "../../shared/api/index.js";
import { AuthCard } from "../components/buying/AuthCard.jsx";

export default function ForgotPassword() {
  useDocumentTitle("Reset your password");
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(e) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter the email you signed up with");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(err?.status === 429 ? "Too many requests. Please wait a few minutes and try again." : err?.fields?.email || err?.message || "Could not send the link");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard
        role="status"
        icon={MailCheck}
        title="Check your inbox"
        description={
          <p className="text-shop-text">
            If an account exists for <span className="font-semibold text-shop-ink">{sentTo}</span>, we’ve sent a link to reset the password. It expires in about an hour.
          </p>
        }
      >
        <ol className="mt-5 grid gap-2 rounded-xl border border-shop-line bg-shop-page/60 p-4 text-shop-sm text-shop-text">
          {["Open the email from MS₹ and tap “Reset password”.", "Choose a new password of at least 8 characters.", "Sign in with it. Other devices are signed out for safety."].map((t, i) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-xs font-bold text-shop-primary-ink">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-shop-sm text-shop-muted">No email after a few minutes? Check spam, or send it again.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button to="/login" leftIcon={ArrowLeft}>
            Back to sign in
          </Button>
          <Button variant="secondary" leftIcon={RotateCw} onClick={() => setSentTo("")}>
            Send again
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Forgot your password?"
      description="Enter your account email and we’ll send you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-shop-primary-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {location.state?.expired ? (
        <Notice className="mt-5" tone="warning">
          That reset link has expired or was already used. Request a new one below.
        </Notice>
      ) : null}
      <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
        <Field label="Email" error={error} required>
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Button type="submit" size="lg" block loading={busy}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
