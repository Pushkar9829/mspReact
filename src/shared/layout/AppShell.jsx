import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Dialog as RDialog } from "radix-ui";
import { Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { filterNav, matchNav } from "./navUtils.js";
import { usePanelTheme } from "../theme/ThemeProvider.jsx";
import { useSocketConnection } from "../realtime/socket.js";
import { cn } from "../ui/cn.js";
import { IconButton } from "../ui/Button.jsx";
import { Tooltip } from "../ui/overlays.jsx";
import { Kbd } from "../ui/display.jsx";
import { PageSkeleton } from "../ui/feedback.jsx";
import { RouteErrorBoundary } from "../ui/ErrorBoundary.jsx";
import { Breadcrumbs } from "../ui/nav.jsx";
import { Logo } from "../components/ui.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { NotificationBell } from "./NotificationBell.jsx";
import { UserMenu } from "./UserMenu.jsx";
import { CommandPalette, useCommandPaletteHotkey } from "./CommandPalette.jsx";

const COLLAPSE_KEY = "msr-sidebar-collapsed";

function NavList({ groups, collapsed, onNavigate }) {
  return groups.map((group) => (
    <div key={group.label} className="mb-4">
      {!collapsed ? <p className="px-3 pb-1 text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle">{group.label}</p> : <div className="mx-3 mb-2 h-px bg-border" />}
      <ul className="grid gap-0.5">
        {group.items.map((item) => {
          const Icon = item.icon;
          const link = (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-3 text-ui-sm font-medium transition-colors",
                  isActive ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                  collapsed && "justify-center px-0"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span aria-hidden className="absolute -left-2 top-1.5 h-5 w-0.5 rounded-full bg-primary" /> : null}
                  {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
                  <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                  {item.badge && !collapsed ? <span className="ml-auto">{item.badge}</span> : null}
                </>
              )}
            </NavLink>
          );
          return <li key={item.to}>{collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}</li>;
        })}
      </ul>
    </div>
  ));
}

function Brand({ eyebrow, collapsed, homeTo }) {
  return (
    <Link to={homeTo} className={cn("flex min-w-0 items-center gap-2 rounded-md", collapsed && "justify-center")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-navy text-[13px] font-extrabold text-white" style={{ background: "var(--brand-navy)" }}>
        MS<span className="text-[var(--brand-gold)]">₹</span>
      </span>
      {!collapsed ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-ui-sm font-semibold text-fg">MS₹ Market</span>
          <span className="block truncate text-ui-2xs text-fg-subtle">{eyebrow}</span>
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Panel shell: collapsible sidebar (icon rail), topbar (breadcrumbs, command palette, bell, theme,
 * user menu), mobile nav sheet, per-route error boundary + Suspense, document.title per route.
 *
 *   <AppShell nav={superAdminNav} eyebrow="Company console" searchers={[…]} topbarStart={<TenantSwitcher/>} />
 */
export function AppShell({ nav, eyebrow, searchers = [], topbarStart, homeTo }) {
  usePanelTheme();
  useSocketConnection(true);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useCommandPaletteHotkey();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  useEffect(() => setMobileOpen(false), [pathname]);

  const groups = useMemo(() => filterNav(nav, user), [nav, user]);
  const current = matchNav(nav, pathname);
  const home = homeTo || nav?.base || "/";

  // Section title as the default document.title; PageHeader (a child effect) refines it.
  useLayoutEffect(() => {
    document.title = `${current?.label || eyebrow} · MS₹`;
  }, [current?.label, eyebrow, pathname]);

  const crumbs = [{ label: nav?.title || eyebrow, to: home }];
  if (current && current.to !== home) crumbs.push({ label: current.label, to: current.to });
  if (pathname !== (current?.to || home) && current) crumbs.push({ label: "Details" });

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-fg">
      <a href="#main" className="sr-only z-[60] rounded-md bg-surface px-3 py-2 text-ui-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside aria-label="Primary" className={cn("hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
        <div className={cn("flex h-14 shrink-0 items-center border-b border-border", collapsed ? "justify-center px-2" : "px-4")}>
          <Brand eyebrow={eyebrow} collapsed={collapsed} homeTo={home} />
        </div>
        <nav aria-label={`${eyebrow} navigation`} className="msr-pane min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <NavList groups={groups} collapsed={collapsed} />
        </nav>
        <div className={cn("flex shrink-0 border-t border-border p-2", collapsed ? "justify-center" : "justify-end")}>
          <IconButton icon={collapsed ? PanelLeftOpen : PanelLeftClose} label={collapsed ? "Expand sidebar" : "Collapse sidebar"} size="sm" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:px-5">
          <IconButton icon={Menu} label="Open navigation" className="md:hidden" onClick={() => setMobileOpen(true)} />
          <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
            <Breadcrumbs items={crumbs} className="hidden md:block" />
            <p className="truncate text-ui-sm font-semibold md:hidden">{current?.label || eyebrow}</p>
          </div>
          {topbarStart ? <div className="hidden min-w-0 sm:block">{topbarStart}</div> : null}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-8 items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 text-ui-sm text-fg-subtle hover:border-border-strong hover:text-fg-muted lg:flex lg:w-56"
          >
            <Search aria-hidden className="size-4" />
            <span className="flex-1 text-left">Search…</span>
            <Kbd>Ctrl K</Kbd>
          </button>
          <IconButton icon={Search} label="Search (Ctrl+K)" className="lg:hidden" onClick={() => setPaletteOpen(true)} />
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />
        </header>
        <main id="main" tabIndex={-1} className="msr-pane panel-legacy min-h-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-[90rem] p-4 md:p-6 lg:p-8">
            {topbarStart ? <div className="mb-4 sm:hidden">{topbarStart}</div> : null}
            <RouteErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </RouteErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile navigation: accessible sheet (focus trap, Escape, scroll lock) */}
      <RDialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <RDialog.Portal>
          <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in md:hidden" />
          <RDialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-lg outline-none data-[state=open]:animate-slide-in-left md:hidden">
            <RDialog.Title className="sr-only">Navigation</RDialog.Title>
            <RDialog.Description className="sr-only">{eyebrow} sections</RDialog.Description>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand eyebrow={eyebrow} homeTo={home} />
              <RDialog.Close asChild>
                <IconButton icon={X} label="Close navigation" size="sm" />
              </RDialog.Close>
            </div>
            <nav aria-label={`${eyebrow} navigation`} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <NavList groups={groups} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="border-t border-border p-3">
              <Link to="/" className="block rounded-md px-3 py-2 text-ui-sm text-fg-muted hover:bg-surface-hover">
                ← Storefront
              </Link>
            </div>
          </RDialog.Content>
        </RDialog.Portal>
      </RDialog.Root>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} nav={nav} searchers={searchers} />
    </div>
  );
}

export { Logo, filterNav, matchNav };
export default AppShell;
