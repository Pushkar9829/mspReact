import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Dialog as RDialog } from "radix-ui";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, CornerDownLeft, Monitor, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { allows } from "../auth.js";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";
import { Kbd } from "../ui/display.jsx";
import { Spinner } from "../ui/Spinner.jsx";

const item = "flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-ui-sm text-fg outline-none data-[selected=true]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle";
const heading = "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-ui-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle";

/** Opens on Ctrl/Cmd+K. Returns [open, setOpen]. */
export function useCommandPaletteHotkey() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [open, setOpen];
}

/**
 * Global command palette: navigation (permission-filtered nav config), quick entity search and
 * theme commands.
 *   searchers: [{ id, label, icon, req, search: (q) => Promise<{data}|[]>, map: (row) => ({ id, label, description, to }) }]
 */
export function CommandPalette({ open, onOpenChange, nav, searchers = [] }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q.trim(), 250);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const navItems = useMemo(
    () => (nav?.groups || []).flatMap((g) => g.items.filter((i) => allows(user, i.req)).map((i) => ({ ...i, group: g.label }))),
    [nav, user]
  );
  const allowedSearchers = useMemo(() => searchers.filter((s) => allows(user, s.req)), [searchers, user]);

  const results = useQueries({
    queries: allowedSearchers.map((s) => ({
      queryKey: ["command", s.id, dq],
      queryFn: () => s.search(dq),
      enabled: open && dq.length >= 2,
      staleTime: 30_000,
      retry: false,
    })),
  });
  const searching = results.some((r) => r.isFetching);

  function go(to) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in" />
        <RDialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-lg data-[state=open]:animate-scale-in">
          <RDialog.Title className="sr-only">Command palette</RDialog.Title>
          <RDialog.Description className="sr-only">Search pages, records and commands</RDialog.Description>
          <Command loop shouldFilter={true} filter={(value, search, keywords) => {
            // Entity results are already server-filtered: always keep them.
            if (value.startsWith("entity:")) return 1;
            const hay = `${value} ${(keywords || []).join(" ")}`.toLowerCase();
            return search.toLowerCase().split(/\s+/).every((w) => hay.includes(w)) ? 1 : 0;
          }}>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search aria-hidden className="size-4 text-fg-subtle" />
              <Command.Input value={q} onValueChange={setQ} placeholder="Search pages, orders, products…" className="h-12 w-full bg-transparent text-ui outline-none placeholder:text-fg-subtle" />
              {searching ? <Spinner className="size-4 text-fg-subtle" /> : <Kbd>Esc</Kbd>}
            </div>
            <Command.List className={`max-h-[60vh] overflow-y-auto p-2 ${heading}`}>
              <Command.Empty className="px-3 py-8 text-center text-ui-sm text-fg-subtle">{dq.length >= 2 && searching ? "Searching…" : "No results"}</Command.Empty>
              {allowedSearchers.map((s, i) => {
                const res = results[i];
                const rows = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
                if (dq.length < 2 || !rows.length) return null;
                return (
                  <Command.Group key={s.id} heading={s.label}>
                    {rows.slice(0, 5).map((row) => {
                      const m = s.map(row);
                      const Icon = s.icon;
                      return (
                        <Command.Item key={`${s.id}-${m.id}`} value={`entity:${s.id}:${m.id}`} onSelect={() => go(m.to)} className={item}>
                          {Icon ? <Icon aria-hidden /> : null}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{m.label}</span>
                            {m.description ? <span className="block truncate text-ui-xs text-fg-subtle">{m.description}</span> : null}
                          </span>
                          <ArrowRight aria-hidden />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                );
              })}
              <Command.Group heading="Go to">
                {navItems.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Command.Item key={n.to} value={`${n.label} ${n.group}`} keywords={n.keywords} onSelect={() => go(n.to)} className={item}>
                      {Icon ? <Icon aria-hidden /> : null}
                      <span className="flex-1">{n.label}</span>
                      <span className="text-ui-xs text-fg-subtle">{n.group}</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
              <Command.Group heading="Theme">
                {[
                  ["light", "Light theme", Sun],
                  ["dark", "Dark theme", Moon],
                  ["system", "System theme", Monitor],
                ].map(([value, label, Icon]) => (
                  <Command.Item
                    key={value}
                    value={`${label} appearance`}
                    onSelect={() => {
                      setTheme(value);
                      onOpenChange(false);
                    }}
                    className={item}
                  >
                    <Icon aria-hidden />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-2 text-ui-xs text-fg-subtle">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft aria-hidden className="size-3" /> open
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> move
              </span>
            </div>
          </Command>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export default CommandPalette;
