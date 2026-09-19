import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, X, UserRound, LogOut, LockKeyhole } from "lucide-react";

import {
  useAccountDrawer,
  ACCOUNT_TABS,
  isAccountTabActive,
} from "../context/AccountDrawerContext.jsx";

import { useAuth } from "../../shared/context/AuthContext.jsx";
import { inr } from "../../shared/lib/format.js";

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

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close account drawer"
        onClick={closeAccount}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Drawer */}
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="h-[3px] bg-gradient-to-r from-msr-gold via-[#ead9a0] to-msr-gold" />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eceef4] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eef0ff] text-[#0b1460]">
              <UserRound className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[#1a1c3d]">
                My Account
              </h2>

              {user ? (
                <p className="mt-0.5 truncate text-xs text-[#8b8ea3]">
                  {user.name || user.email}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-[#8b8ea3]">
                  Manage your account
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={closeAccount}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#6b7280] transition hover:bg-[#f4f5f9] hover:text-[#1a1c3d]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user ? (
          <div className="border-b border-[#eceef4] bg-[#fafbff] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0b1460] text-sm font-bold text-white">
                {(user.name || user.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1a1c3d]">
                  {user.name || "Welcome back"}
                </p>

                {user.email ? (
                  <p className="truncate text-xs text-[#8b8ea3]">
                    {user.email}
                  </p>
                ) : null}
                {user.ledgerBalance != null ? (
                  <p className="mt-1 text-xs font-bold text-[#0b1460]">
                    Ledger {inr(user.ledgerBalance)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Navigation */}
        {user ? (
          <nav className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-[#9ca0b2]">
              Account
            </p>

            <div className="space-y-1">
              {ACCOUNT_TABS.map((item) => {
                const active = isAccountTabActive(pathname, item.to);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    onClick={closeAccount}
                    className={[
                      "group flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm transition",
                      active
                        ? "bg-[#0b1460] font-semibold text-white shadow-sm"
                        : "text-[#1a1c3d] hover:bg-[#f5f6fa]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition",
                        active
                          ? "bg-white/10"
                          : "bg-[#f5f6fa] group-hover:bg-white",
                      ].join(" ")}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>

                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>

                    <ChevronRight
                      className={[
                        "h-4 w-4 shrink-0 transition-transform",
                        active
                          ? "opacity-100"
                          : "opacity-40 group-hover:translate-x-0.5",
                      ].join(" ")}
                    />
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : (
          /* Guest State */
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#eef0ff] text-[#0b1460]">
              <LockKeyhole className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-lg font-extrabold text-[#1a1c3d]">
              Sign in to your account
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-[#73778c]">
              Manage your orders, addresses, saved items and account details
              from one place.
            </p>

            <Link
              to="/login"
              state={{ from: pathname || "/account" }}
              onClick={closeAccount}
              className="mt-6 w-full rounded-xl bg-[#0b1460] px-4 py-3.5 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#08104d]"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              onClick={closeAccount}
              className="mt-4 text-sm font-bold text-[#0b1460] hover:underline"
            >
              Create an account
            </Link>
          </div>
        )}

        {/* Footer */}
        {user ? (
          <div className="border-t border-[#eceef4] bg-white p-4">
            <button
              type="button"
              onClick={() => {
                logout();
                closeAccount();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-msr-danger transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}