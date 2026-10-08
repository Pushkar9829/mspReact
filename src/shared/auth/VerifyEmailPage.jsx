import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailCheck, MailWarning } from "lucide-react";
import { api } from "../api/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../ui/Button.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

/** /verify-email?token=… (link from the verification email). */
export default function VerifyEmailPage() {
  useDocumentTitle("Verify email");
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, reloadUser } = useAuth();
  const [state, setState] = useState(token ? "working" : "missing");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    api
      .verifyEmail(token)
      .then(() => {
        setState("done");
        if (user) reloadUser().catch(() => {});
      })
      .catch((err) => {
        setState("error");
        setMessage(err.message || "This link is invalid or has expired.");
      });
  }, [token, user, reloadUser]);

  return (
    <div className="grid min-h-dvh place-items-center bg-msr-bg p-4">
      <div className="w-full max-w-md rounded-2xl border border-msr-line bg-white p-8 text-center shadow-card">
        {state === "working" ? (
          <>
            <Spinner className="mx-auto size-6 text-msr-primary" />
            <h1 className="mt-4 text-xl font-extrabold text-msr-ink">Verifying your email…</h1>
          </>
        ) : state === "done" ? (
          <>
            <MailCheck aria-hidden className="mx-auto size-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-extrabold text-msr-ink">Email verified</h1>
            <p className="mt-2 text-sm text-msr-muted">Thanks! You can now place orders.</p>
            <Button variant="primary" className="mt-6" to={user ? "/" : "/login"}>
              {user ? "Continue shopping" : "Sign in"}
            </Button>
          </>
        ) : (
          <>
            <MailWarning aria-hidden className="mx-auto size-10 text-amber-600" />
            <h1 className="mt-4 text-xl font-extrabold text-msr-ink">We couldn’t verify this link</h1>
            <p className="mt-2 text-sm text-msr-muted">{state === "missing" ? "The verification link is incomplete." : message}</p>
            <p className="mt-2 text-sm text-msr-muted">Sign in and use “Resend email” on the banner to get a new link.</p>
            <Link to="/" className="mt-6 inline-block text-sm font-bold text-msr-primary hover:underline">
              Back to the shop
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
