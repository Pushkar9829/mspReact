import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MailWarning, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES } from "../auth.js";

/**
 * Banner for buyers whose email is not verified (or after a 403 EMAIL_NOT_VERIFIED at checkout).
 * Storefront only; hidden in the admin panels.
 */
export function EmailVerificationBanner() {
  const { user, emailBlocked } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const panel = pathname.startsWith("/tenant") || pathname.startsWith("/super-admin");
  const show = user && user.role === ROLES.BUYER && (user.emailVerified === false || emailBlocked) && !panel && (!dismissed || emailBlocked);
  if (!show) return null;

  async function resend() {
    setBusy(true);
    try {
      await api.resendVerification(user.email);
      setSent(true);
      toast.success("Verification email sent", { description: `Check ${user.email}` });
    } catch (err) {
      toast.error(err.message || "Could not send the email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 text-[13px] text-amber-900">
      <div className="msr-gutter flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
        <MailWarning aria-hidden className="size-4 shrink-0" />
        <p className="min-w-0 flex-1">
          {emailBlocked ? "Please verify your email address to place orders." : "Verify your email address to unlock checkout."} We sent a link to{" "}
          <span className="font-semibold">{user.email}</span>.
        </p>
        <button type="button" onClick={resend} disabled={busy || sent} className="font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-60">
          {sent ? "Email sent" : busy ? "Sending…" : "Resend email"}
        </button>
        {!emailBlocked ? (
          <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)} className="rounded-sm p-0.5 hover:bg-amber-100">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

