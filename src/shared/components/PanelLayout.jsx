import { useMemo, useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "./ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function NavItems({ links }) {
  return links.map((link) => {
    const Icon = link.icon;
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) =>
          `mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${
            isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`
        }
      >
        <Icon className="h-4 w-4" />
        {link.label}
      </NavLink>
    );
  });
}

export default function PanelLayout({
  eyebrow,
  links = [],
  groups,
  homeTo = "/",
  homeLabel = "← Marketplace",
  loginTo = "/login",
  sidebarClass = "bg-msr-navy",
  roomy = false,
  badge = "",
  storeName = "",
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navGroups = groups?.length ? groups : [{ label: "", links }];
  const flatLinks = useMemo(() => navGroups.flatMap((group) => group.links), [navGroups]);
  const current = [...flatLinks]
    .sort((a, b) => b.to.length - a.to.length)
    .find((link) => (link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`)));

  function signOut() {
    logout();
    navigate(loginTo);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const contentClass = roomy
    ? "msr-pane min-h-0 flex-1 overflow-y-auto p-4 md:p-6"
    : "msr-pane min-h-0 flex-1 overflow-y-auto p-3 md:p-5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_label]:text-[13px] [&_p]:text-[13px]";

  return (
    <div className="panel-shell flex h-dvh overflow-hidden bg-msr-bg text-[13px]">
      <aside className={`hidden h-full w-48 shrink-0 flex-col text-white md:flex ${sidebarClass}`}>
        <div className="shrink-0 px-4 py-4">
          <Logo light compact />
          <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">{eyebrow}</p>
        </div>
        <nav className="msr-pane min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {navGroups.map((group) => (
            <div key={group.label || "nav"} className="mb-3">
              {group.label ? (
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-white/40">{group.label}</p>
              ) : null}
              <NavItems links={group.links} />
            </div>
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
          <div className="flex min-w-0 items-center gap-2">
            {groups?.length ? (
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-msr-border md:hidden"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
            ) : (
              <div className="md:hidden">
                <Logo compact />
              </div>
            )}
            {groups?.length ? <p className="truncate text-[13px] font-semibold text-msr-ink">{current?.label || eyebrow}</p> : null}
            {badge || storeName ? (
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                {storeName ? <span className="truncate text-[13px] font-semibold text-msr-ink">{storeName}</span> : null}
                {badge ? <span className="rounded-full bg-msr-bg px-2 py-0.5 text-[11px] font-bold text-msr-navy">{badge}</span> : null}
                <span className="truncate text-[13px] text-msr-muted">{user?.name}</span>
              </div>
            ) : (
              <p className="hidden text-[13px] text-msr-muted md:block">
                {user?.name} · <span className="text-msr-text">{user?.email}</span>
              </p>
            )}
          </div>
          {!groups?.length ? (
            <div className="flex max-w-[60vw] items-center gap-2 overflow-x-auto md:hidden">
              {flatLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className="whitespace-nowrap rounded-full bg-msr-bg px-3 py-1 text-xs font-semibold">
                  {link.label}
                </NavLink>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={signOut} className="inline-flex shrink-0 items-center gap-1 text-[13px] text-msr-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>
        <div className={contentClass}>
          <Outlet />
        </div>
      </div>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={closeMenu} />
          <aside className={`absolute inset-y-0 left-0 flex w-52 flex-col text-white ${sidebarClass}`}>
            <div className="flex items-center justify-between px-4 py-4">
              <Logo light compact />
              <button type="button" onClick={closeMenu} aria-label="Close menu" className="text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="msr-pane min-h-0 flex-1 overflow-y-auto px-2" onClick={closeMenu}>
              {navGroups.map((group) => (
                <div key={group.label || "drawer"} className="mb-3">
                  {group.label ? (
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-white/40">{group.label}</p>
                  ) : null}
                  <NavItems links={group.links} />
                </div>
              ))}
            </nav>
            <div className="p-4">
              <Link to={homeTo} onClick={closeMenu} className="block rounded-lg px-2.5 py-1.5 text-[13px] text-white/70">
                {homeLabel}
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
