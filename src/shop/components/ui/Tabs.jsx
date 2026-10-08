import { Tabs as RTabs } from "radix-ui";
import { useSearchParams } from "react-router-dom";
import { cn } from "./cn.js";

/**
 * Accessible tabs (Radix: roving focus, arrow keys, aria-selected/controls).
 *   <Tabs tabs={[{ value: "about", label: "About" }, { value: "reviews", label: "Reviews", count: 12 }]} urlParam="tab">
 *     <TabPanel value="about">…</TabPanel>
 *   </Tabs>
 * Controlled with value/onValueChange, or kept in the URL with `urlParam`.
 */
export function Tabs({ tabs = [], value, onValueChange, defaultValue, urlParam, className, listClassName, children, "aria-label": ariaLabel }) {
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
          { replace: true, preventScrollReset: true }
        )
    : onValueChange;
  return (
    <RTabs.Root value={current} onValueChange={change} defaultValue={value === undefined && !urlParam ? first : undefined} className={className}>
      <RTabs.List aria-label={ariaLabel} className={cn("no-scrollbar flex max-w-full gap-1 overflow-x-auto border-b border-shop-line", listClassName)}>
        {tabs.map((t) => (
          <RTabs.Trigger
            key={t.value}
            value={t.value}
            disabled={t.disabled}
            className="relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-shop-base font-semibold text-shop-muted transition-colors hover:text-shop-ink data-[state=active]:border-shop-primary data-[state=active]:text-shop-ink"
          >
            {t.label}
            {t.count != null ? <span className="rounded-full bg-shop-well px-1.5 text-shop-xs tabular-nums text-shop-muted">{t.count}</span> : null}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}

export function TabPanel({ value, className, children, forceMount }) {
  return (
    <RTabs.Content value={value} forceMount={forceMount} className={cn("pt-5 outline-none", className)}>
      {children}
    </RTabs.Content>
  );
}

export default Tabs;
