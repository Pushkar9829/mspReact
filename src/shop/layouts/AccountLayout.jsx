import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { ACCOUNT_TABS, isAccountTabActive } from "../context/AccountDrawerContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { buttonClass } from "../components/shopUi.jsx";

export default function AccountLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const guestOk = pathname.startsWith("/account/wishlist") || pathname.startsWith("/account/help");
  if (!user && !guestOk) {
    return (
      <div className="msr-gutter flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl border border-msr-line bg-white px-8 py-12 text-center shadow-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-msr-primary-soft text-msr-primary">
            <LockKeyhole className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-msr-ink">My account</h1>
          <p className="mt-2 text-sm leading-relaxed text-msr-muted">
            Sign in to manage orders, addresses, coupons and saved items.
          </p>
          <Link to="/login" state={{ from: pathname || "/account" }} className={buttonClass({ size: "lg", block: true, className: "mt-7" })}>
            Sign in
          </Link>
          <Link to="/register" className="mt-4 block text-sm font-bold text-msr-primary hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const initial = (user?.name || user?.email || "G").charAt(0).toUpperCase();

  return (
    <div className="bg-msr-bg">
      <div className="msr-gutter py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-32">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-msr-line bg-white p-4 shadow-card">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-msr-ink text-sm font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-msr-ink">{user?.name || "Guest"}</p>
                <p className="truncate text-[12px] text-msr-subtle">{user?.email || "Sign in to check out"}</p>
              </div>
            </div>
            <p className="mb-2 hidden px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-msr-subtle lg:block">
              My account
            </p>
            <nav className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
              {ACCOUNT_TABS.map((item) => {
                const Icon = item.icon;
                const active = isAccountTabActive(pathname, item.to);
                return (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === "/account"}
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-msr-ink text-white shadow-lift"
                        : "border border-msr-line bg-white text-msr-ink hover:border-msr-primary/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
