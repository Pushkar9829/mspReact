import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, X, LogOut, LockKeyhole, Wallet } from "lucide-react";

import {
  useAccountDrawer,
  ACCOUNT_TABS,
  isAccountTabActive,
} from "../context/AccountDrawerContext.jsx";

import { useAuth } from "../../shared/context/AuthContext.jsx";
import { inr } from "../../shared/lib/format.js";
import { buttonClass } from "./shopUi.jsx";

export default function AccountDrawer() {
  const { open, closeAccount } = useAccountDrawer();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeAccount();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeAccount]);

  if (!open) return null;

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="My account">
      <button
        type="button"
        aria-label="Close account drawer"
        onClick={closeAccount}
        className="msr-fade absolute inset-0 bg-msr-brand/40 backdrop-blur-[2px]"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-msr-surface shadow-pop">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-base font-extrabold text-msr-ink">My account</h2>
          <button
            type="button"
            onClick={closeAccount}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl text-msr-muted transition hover:bg-white hover:text-msr-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {user ? (
          <>
            <div className="mx-4 rounded-2xl bg-msr-brand p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-bold">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold">{user.name || "Welcome back"}</p>
                  {user.email ? <p className="truncate text-[12px] text-white/60">{user.email}</p> : null}
                </div>
              </div>
              {user.ledgerBalance != null ? (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12px] text-white/70">
                    <Wallet className="h-4 w-4 text-msr-gold" />
                    Ledger balance
                  </span>
                  <span className="text-[14px] font-bold">{inr(user.ledgerBalance)}</span>
                </div>
              ) : null}
            </div>

            <nav className="msr-pane min-h-0 flex-1 overflow-y-auto p-4">
              <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">
                {ACCOUNT_TABS.map((item, i) => {
                  const active = isAccountTabActive(pathname, item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={closeAccount}
                      className={`group flex items-center gap-3 px-4 py-3 text-[13.5px] transition-colors ${
                        i ? "border-t border-msr-line" : ""
                      } ${active ? "bg-msr-primary-soft font-semibold text-msr-primary-ink" : "text-msr-ink hover:bg-msr-surface"}`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-msr-primary" : "text-msr-muted"}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-msr-subtle transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-msr-line bg-white p-4">
              <button
                type="button"
                onClick={() => {
                  logout();
                  closeAccount();
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-msr-line-strong text-[13px] font-semibold text-msr-danger transition hover:border-msr-danger hover:bg-msr-danger-soft"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-msr-primary-soft text-msr-primary">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-extrabold text-msr-ink">Sign in to your account</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-msr-muted">
              Track orders, manage addresses and saved items from one place.
            </p>
            <Link
              to="/login"
              state={{ from: pathname || "/account" }}
              onClick={closeAccount}
              className={buttonClass({ size: "lg", block: true, className: "mt-6" })}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              onClick={closeAccount}
              className={buttonClass({ variant: "secondary", size: "lg", block: true, className: "mt-3" })}
            >
              Create an account
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
