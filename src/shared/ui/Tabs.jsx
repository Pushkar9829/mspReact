import { Tabs as RTabs } from "radix-ui";
import { useSearchParams } from "react-router-dom";
import { cn } from "./cn.js";

/**
 * Accessible tabs (roving focus, arrow keys, aria-selected).
 *
 *   <Tabs value={tab} onValueChange={setTab} tabs={[{ value: "overview", label: "Overview", count: 3 }, ...]}>
 *     <TabPanel value="overview">…</TabPanel>
 *   </Tabs>
 *
 * `urlParam="tab"` keeps the selected tab in the URL (?tab=) instead of `value`/`onValueChange`.
 * variant: "line" (default, page-level) | "pill" (inside cards / toolbars).
 */
export function Tabs({ tabs = [], value, onValueChange, defaultValue, urlParam, variant = "line", className, listClassName, children, "aria-label": ariaLabel }) {
  const [params, setParams] = useSearchParams();
  const first = defaultValue ?? tabs[0]?.value;
  const current = urlParam ? params.get(urlParam) || first : value;
  const change = urlParam
    ? (next) =>
        setParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            if (next === first) p.delete(urlParam);
            else p.set(urlParam, next);
            return p;
          },
          { replace: true }
        )
    : onValueChange;
  return (
    <RTabs.Root value={current} onValueChange={change} defaultValue={value === undefined && !urlParam ? first : undefined} className={cn("grid gap-4", className)}>
      <RTabs.List
        aria-label={ariaLabel}
        className={cn(
          "flex max-w-full overflow-x-auto no-scrollbar",
          variant === "line" ? "gap-4 border-b border-border" : "w-fit gap-1 rounded-md bg-surface-sunken p-1",
          listClassName
        )}
      >
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            disabled={t.disabled}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-ui-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:opacity-50",
              variant === "line"
                ? "-mb-px border-b-2 border-transparent px-0.5 pb-2.5 pt-1 data-[state=active]:border-primary data-[state=active]:text-fg"
                : "rounded-sm px-2.5 py-1 data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-xs"
            )}
          >
            {t.icon ? <t.icon aria-hidden className="size-4" /> : null}
            {t.label}
            {t.count != null ? <span className="rounded-full bg-surface-sunken px-1.5 text-ui-2xs tabular-nums text-fg-muted">{t.count}</span> : null}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}

export function TabPanel({ value, className, children, forceMount }) {
  return (
    <RTabs.Content value={value} className={cn("outline-none", className)} forceMount={forceMount}>
      {children}
    </RTabs.Content>
  );
}

export default Tabs;
