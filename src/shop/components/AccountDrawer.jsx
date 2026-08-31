import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { useAccountDrawer, ACCOUNT_TABS } from "../../shared/context/AccountDrawerContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";

export default function AccountDrawer() {
  const { open, closeAccount } = useAccountDrawer();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") closeAccount();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeAccount]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close account" onClick={closeAccount} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eceef4] px-4 py-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#1a1c3d]">My account</h2>
            {user ? <p className="text-[12px] text-[#8b8ea3]">{user.name}</p> : null}
          </div>
          <button type="button" onClick={closeAccount} className="grid h-9 w-9 place-items-center rounded-md hover:bg-msr-bg" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {user ? (
          <nav className="min-h-0 flex-1 overflow-y-auto p-2">
            {ACCOUNT_TABS.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={closeAccount}
                  className={`mb-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm ${
                    active ? "bg-[#0b1460] font-semibold text-white" : "text-[#1a1c3d] hover:bg-msr-bg"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex flex-1 flex-col justify-center px-6 text-center">
            <p className="text-sm text-[#6b7280]">Sign in to manage orders, addresses and saved items.</p>
            <Link
              to="/login"
              state={{ from: "/account" }}
              onClick={closeAccount}
              className="mt-5 rounded-md bg-[#0b1460] px-4 py-3 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
            <Link to="/register" onClick={closeAccount} className="mt-3 text-sm font-semibold text-[#0b1460]">
              Create an account
            </Link>
          </div>
        )}

        {user ? (
          <div className="border-t border-[#eceef4] p-3">
            <button
              type="button"
              onClick={() => {
                logout();
                closeAccount();
              }}
              className="w-full rounded-md px-3 py-2.5 text-sm font-semibold text-msr-danger hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
