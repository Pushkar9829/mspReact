/**
 * Email-link landing pages (all ?token=):
 *   /restock/confirm → GET /products/restock-alerts/confirm
 *   /unsubscribe     → POST /notifications/unsubscribe
 * A centred result card: working → success / error, each with clear next actions.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BellRing, CheckCircle2, Home, Loader2, MailX, Settings2, ShoppingBag, XCircle } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { Button, cn } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { useViewer } from "../hooks/useViewer.js";

function useTokenAction(run) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState({ status: token ? "working" : "missing", data: null, error: null });
  const once = useRef(false);
  useEffect(() => {
    if (!token || once.current) return;
    once.current = true;
    run(token)
      .then((data) => setState({ status: "done", data, error: null }))
      .catch((error) => setState({ status: "error", data: null, error }));
  }, [token, run]);
  return state;
}

const confirmRestock = (t) => api.confirmRestock(t);
const unsubscribe = (t) => api.unsubscribe(t);

const TONES = {
  working: "bg-shop-info-soft text-shop-info-ink",
  done: "bg-shop-primary-soft text-shop-primary-ink",
  error: "bg-shop-danger-soft text-shop-danger-ink",
};

/** Centred card: big status icon, kicker, title, text, actions; an optional footer note. */
function ResultCard({ status, icon: Icon, kicker, title, children, actions, note }) {
  const working = status === "working";
  return (
    <div className="msr-gutter grid min-h-[60dvh] place-items-center py-10">
      <div
        role={status === "error" ? "alert" : "status"}
        aria-busy={working || undefined}
        className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card text-center shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]"
      >
        <div className="px-6 pb-7 pt-8 sm:px-8">
          <span className={cn("mx-auto grid size-16 place-items-center rounded-full", TONES[status] || TONES.error)}>
            {working ? <Loader2 className="size-7 animate-spin" aria-hidden /> : <Icon className="size-8" strokeWidth={1.75} aria-hidden />}
          </span>
          {kicker ? <p className="mt-5 text-shop-xs font-semibold uppercase tracking-wide text-shop-muted">{kicker}</p> : null}
          <h1 className={cn("font-display text-shop-xl font-bold text-shop-ink sm:text-shop-2xl", kicker ? "mt-1" : "mt-5")}>{title}</h1>
          {children ? <div className="mx-auto mt-2 max-w-sm text-shop-base text-shop-muted">{children}</div> : null}
          {actions ? <div className="mt-6 grid gap-2">{actions}</div> : null}
        </div>
        {note ? <div className="border-t border-shop-line bg-shop-page/60 px-6 py-3 text-shop-sm text-shop-muted">{note}</div> : null}
      </div>
    </div>
  );
}

export function RestockConfirmPage() {
  useDocumentTitle("Confirm restock alert");
  const s = useTokenAction(confirmRestock);
  const slug = s.data?.slug || s.data?.product?.slug;
  const { signedIn } = useViewer();

  if (s.status === "working") {
    return <ResultCard status="working" kicker="Restock alert" title="Confirming your alert…">One moment while we confirm your email.</ResultCard>;
  }
  if (s.status === "done") {
    return (
      <ResultCard
        status="done"
        icon={BellRing}
        kicker="Restock alert"
        title="You’re on the list"
        actions={
          <>
            {slug ? (
              <Button to={`/product/${slug}`} size="lg" block leftIcon={ShoppingBag}>
                View the product
              </Button>
            ) : null}
            <Button to="/" size="lg" block variant={slug ? "secondary" : "primary"} leftIcon={Home}>
              Continue shopping
            </Button>
          </>
        }
        note={
          signedIn ? (
            <>
              Manage alerts under{" "}
              <Button to="/account/alerts" variant="link" className="text-shop-sm">
                My account → Restock alerts
              </Button>
            </>
          ) : (
            "We email you once, then the alert ends."
          )
        }
      >
        We’ll email you once when this item is back in stock.
      </ResultCard>
    );
  }
  return (
    <ResultCard
      status="error"
      icon={XCircle}
      kicker="Restock alert"
      title={s.status === "missing" ? "This link is incomplete" : "This link has expired or was already used"}
      actions={
        <>
          <Button to="/category/all" size="lg" block leftIcon={ShoppingBag}>
            Browse products
          </Button>
          <Button to="/" size="lg" block variant="secondary" leftIcon={Home}>
            Go to the shop
          </Button>
        </>
      }
      note="Open the product page and tap “Notify me” to ask for a new alert."
    >
      {s.status === "missing" ? "Copy the full link from the email, or ask for the alert again." : s.error?.message || "Open the product page and ask for a restock alert again."}
    </ResultCard>
  );
}

export function UnsubscribePage() {
  useDocumentTitle("Unsubscribe");
  const s = useTokenAction(unsubscribe);
  const { signedIn } = useViewer();
  const prefs = signedIn ? { to: "/account/notifications" } : { to: "/login", state: { from: "/account/notifications" } };
  const prefsLabel = signedIn ? "Manage all preferences" : "Sign in to manage preferences";

  if (s.status === "working") {
    return <ResultCard status="working" kicker="Email preferences" title="Updating your preferences…">One moment.</ResultCard>;
  }
  if (s.status === "done") {
    const category = s.data?.category ? String(s.data.category).replaceAll("_", " ") : "";
    return (
      <ResultCard
        status="done"
        icon={CheckCircle2}
        kicker="Email preferences"
        title="You’re unsubscribed"
        actions={
          <>
            <Button {...prefs} size="lg" block leftIcon={Settings2}>
              {prefsLabel}
            </Button>
            <Button to="/" size="lg" block variant="secondary" leftIcon={Home}>
              Continue shopping
            </Button>
          </>
        }
        note="Order and account emails (confirmations, invoices, security) still arrive."
      >
        You won’t get these emails any more{category ? <> (<span className="font-semibold text-shop-text">{category}</span>)</> : null}.
      </ResultCard>
    );
  }
  return (
    <ResultCard
      status="error"
      icon={MailX}
      kicker="Email preferences"
      title="We couldn’t use this link"
      actions={
        <>
          <Button {...prefs} size="lg" block leftIcon={Settings2}>
            {prefsLabel}
          </Button>
          <Button to="/" size="lg" block variant="secondary" leftIcon={Home}>
            Go to the shop
          </Button>
        </>
      }
      note="You can always turn email categories on or off from your account."
    >
      {s.status === "missing" ? "The link is incomplete. Copy the full link from the email." : s.error?.message || "The link is incomplete or has expired."}
    </ResultCard>
  );
}
