import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function PanelLayout({
  eyebrow,
  links,
  homeTo = "/",
  homeLabel = "← Marketplace",
  loginTo = "/login",
  sidebarClass = "bg-msr-navy",
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate(loginTo);
  }

  return (
    <div className="flex min-h-screen bg-msr-bg">
      <aside className={`hidden w-64 flex-col text-white md:flex ${sidebarClass}`}>
        <div className="px-5 py-5">
          <Logo light compact />
          <p className="mt-1 text-[11px] uppercase tracking-widest text-white/50">{eyebrow}</p>
        </div>
        <nav className="flex-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4">
          <Link to={homeTo} className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10">
            {homeLabel}
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-msr-border bg-white px-4 py-3 md:px-6">
          <div className="md:hidden">
            <Logo compact />
          </div>
          <p className="hidden text-sm text-msr-muted md:block">
            {user?.name} · <span className="text-msr-text">{user?.email}</span>
          </p>
          <div className="flex max-w-[60vw] items-center gap-2 overflow-x-auto md:hidden">
            {links.slice(0, 6).map((l) => (
              <NavLink key={l.to} to={l.to} className="whitespace-nowrap rounded-full bg-msr-bg px-3 py-1 text-xs font-semibold">
                {l.label}
              </NavLink>
            ))}
          </div>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1 text-sm text-msr-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
