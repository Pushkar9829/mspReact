import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { ACCOUNT_TABS, isAccountTabActive } from "../context/AccountDrawerContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";

export default function AccountLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) {
    return (
      <div className="msr-gutter flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-[#ece6d4] bg-white px-8 py-12 text-center shadow-[0_16px_40px_rgba(8,10,61,0.06)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#fffaf0] text-[#8a6a12]">
            <LockKeyhole className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-msr-navy">My account</h1>
          <p className="mt-2 text-sm leading-relaxed text-msr-muted">
            Sign in to manage orders, addresses, coupons and saved items.
          </p>
          <Link
            to="/login"
            state={{ from: pathname || "/account" }}
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-msr-navy text-sm font-bold text-white"
          >
            Sign in
          </Link>
          <Link to="/register" className="mt-4 block text-sm font-bold text-msr-navy hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="bg-msr-bg">
      <div className="h-[3px] bg-gradient-to-r from-msr-gold via-[#ead9a0] to-msr-gold" />
      <div className="msr-gutter py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#ece6d4] bg-white p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-msr-navy text-sm font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-msr-navy">{user.name || "Welcome"}</p>
                <p className="truncate text-[12px] text-[#8b8ea3]">{user.email}</p>
              </div>
            </div>
            <p className="mb-2 hidden px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6a12] lg:block">
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
                        ? "bg-msr-navy text-white shadow-[0_8px_18px_rgba(8,10,61,0.22)]"
                        : "bg-white text-msr-navy ring-1 ring-[#ece6d4] hover:ring-[#ead9a0]"
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
