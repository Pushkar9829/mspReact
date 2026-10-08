import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, LockKeyhole, LogIn, ShieldAlert } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { homeFor } from "../auth.js";

function Centered({ icon: Icon, tone = "neutral", title, children, actions }) {
  const ring = { neutral: "bg-surface-sunken text-fg-muted", danger: "bg-danger-soft text-danger-fg", warning: "bg-warning-soft text-warning-fg" }[tone];
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className={`grid size-12 place-items-center rounded-full ${ring}`}>
        <Icon aria-hidden className="size-6" />
      </div>
      <h1 className="text-title font-semibold text-fg">{title}</h1>
      <div className="text-ui-sm text-fg-muted">{children}</div>
      {actions ? <div className="flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** 403 inside a panel. */
export function ForbiddenPage({ permission }) {
  useDocumentTitle("No access");
  const { user } = useAuth();
  return (
    <Centered
      icon={LockKeyhole}
      tone="warning"
      title="You don’t have access to this page"
      actions={
        <Button variant="primary" to={homeFor(user?.role)}>
          Go to dashboard
        </Button>
      }
    >
      <p>Your role doesn’t include the permission needed here. Ask an administrator to update your role if you need it.</p>
      {permission ? <p className="mt-2 font-mono text-ui-xs text-fg-subtle">{permission}</p> : null}
    </Centered>
  );
}

/** 404 inside a panel. */
export function NotFoundPage({ home }) {
  useDocumentTitle("Not found");
  const { pathname } = useLocation();
  const { user } = useAuth();
  return (
    <Centered
      icon={Compass}
      title="Page not found"
      actions={
        <Button variant="primary" to={home || homeFor(user?.role)}>
          Back to dashboard
        </Button>
      }
    >
      <p>
        Nothing lives at <span className="font-mono text-fg">{pathname}</span>. It may have moved, or the link is wrong.
      </p>
    </Centered>
  );
}

const REASONS = {
  TOKEN_REUSE: {
    title: "You were signed out for your security",
    body: "We detected that an old sign-in token was used again, which can mean someone copied your session. All your sessions were ended. Sign in again, and change your password if you didn’t expect this.",
  },
  TOKEN_REVOKED: {
    title: "Your session has ended",
    body: "You were signed out everywhere — your password, role or account status changed, or someone chose “Sign out everywhere”. Please sign in again.",
  },
  ACCOUNT_INACTIVE: {
    title: "Your account is not active",
    body: "This account has been suspended or is pending activation. Contact your store administrator or MS₹ support.",
  },
  TENANT_SUSPENDED: {
    title: "This store is suspended",
    body: "Access for this store’s staff is paused by the marketplace. Contact MS₹ support to reactivate it. Buyers are not affected.",
  },
  SESSION_EXPIRED: {
    title: "Your session expired",
    body: "You’ve been signed out after a period of inactivity. Sign in again to continue where you left off.",
  },
};

/** Full-screen explanation after a hard logout. */
export function SessionEndedScreen() {
  const { endedReason, clearEndedReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const info = REASONS[endedReason] || REASONS.SESSION_EXPIRED;
  const blocked = endedReason === "ACCOUNT_INACTIVE" || endedReason === "TENANT_SUSPENDED";
  useDocumentTitle(info.title);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg p-4" role="alertdialog" aria-modal="true" aria-labelledby="session-ended-title">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
        <div className={`mx-auto grid size-12 place-items-center rounded-full ${blocked || endedReason === "TOKEN_REUSE" ? "bg-danger-soft text-danger-fg" : "bg-warning-soft text-warning-fg"}`}>
          <ShieldAlert aria-hidden className="size-6" />
        </div>
        <h1 id="session-ended-title" className="mt-4 text-title font-semibold text-fg">
          {info.title}
        </h1>
        <p className="mt-2 text-ui-sm text-fg-muted">{info.body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              clearEndedReason();
              navigate("/", { replace: true });
            }}
          >
            Go to storefront
          </Button>
          <Button
            variant="primary"
            leftIcon={LogIn}
            onClick={() => {
              clearEndedReason();
              navigate("/login", { replace: true, state: { from: location.pathname } });
            }}
          >
            Sign in again
          </Button>
        </div>
        <p className="mt-4 text-ui-xs text-fg-subtle">
          Need help? <Link className="underline" to="/help" onClick={clearEndedReason}>Contact support</Link>
        </p>
      </div>
    </div>
  );
}
