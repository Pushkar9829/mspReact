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
    <div className="panel-shell flex h-dvh overflow-hidden bg-msr-bg text-[13px]">
      <aside className={`hidden h-full w-56 shrink-0 flex-col text-white md:flex ${sidebarClass}`}>
        <div className="shrink-0 px-4 py-4">
          <Logo light compact />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">{eyebrow}</p>
        </div>
        <nav className="msr-pane min-h-0 flex-1 overflow-y-auto px-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${
                  isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-4">
          <Link to={homeTo} className="block rounded-lg px-2.5 py-1.5 text-[13px] text-white/70 hover:bg-white/10">
            {homeLabel}
          </Link>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-msr-border bg-white px-4 py-2 md:px-5">
          <div className="md:hidden">
            <Logo compact />
          </div>
          <p className="hidden text-[13px] text-msr-muted md:block">
            {user?.name} · <span className="text-msr-text">{user?.email}</span>
          </p>
          <div className="flex max-w-[60vw] items-center gap-2 overflow-x-auto md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="whitespace-nowrap rounded-full bg-msr-bg px-3 py-1 text-xs font-semibold">
                {l.label}
              </NavLink>
            ))}
          </div>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1 text-[13px] text-msr-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>
        <div className="msr-pane min-h-0 flex-1 overflow-y-auto p-3 md:p-5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_label]:text-[13px] [&_p]:text-[13px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
