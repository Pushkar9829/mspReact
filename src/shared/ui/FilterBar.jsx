import { Command } from "cmdk";
import { Check, PlusCircle, Search, X } from "lucide-react";
import { cn } from "./cn.js";
import { Input } from "./form.jsx";
import { Popover } from "./overlays.jsx";
import { Button, buttonClass } from "./Button.jsx";
import { Badge } from "./Badge.jsx";
import { DateRangePicker } from "./DateRangePicker.jsx";

/**
 * Faceted filter (single-select by default; `multiple` stores a comma-separated value).
 *   <FacetFilter title="Status" value={table.filters.status} onChange={(v) => table.setFilter("status", v)}
 *                options={statusOptions(ORDER_STATUSES)} />
 */
export function FacetFilter({ title, value, onChange, options = [], multiple = false }) {
  const selected = new Set(String(value || "").split(",").filter(Boolean));
  const labels = options.filter((o) => selected.has(String(o.value))).map((o) => o.label);
  function toggle(v) {
    const key = String(v);
    if (!multiple) return onChange?.(selected.has(key) ? "" : key);
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    return onChange?.([...next].join(","));
  }
  return (
    <Popover
      align="start"
      className="w-60 p-0"
      trigger={
        <button type="button" className={buttonClass({ variant: "secondary", size: "sm", className: cn("border-dashed", selected.size && "border-solid") })}>
          <PlusCircle aria-hidden />
          {title}
          {selected.size ? (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
              {selected.size > 2 ? <Badge tone="primary">{selected.size} selected</Badge> : labels.map((l) => <Badge key={l} tone="primary">{l}</Badge>)}
            </>
          ) : null}
        </button>
      }
    >
      <Command loop>
        {options.length > 7 ? <Command.Input placeholder={title} className="h-9 w-full border-b border-border bg-transparent px-3 text-ui-sm outline-none" /> : null}
        <Command.List className="max-h-72 overflow-y-auto p-1">
          <Command.Empty className="px-2 py-4 text-center text-ui-sm text-fg-subtle">No match</Command.Empty>
          {options.map((o) => {
            const on = selected.has(String(o.value));
            return (
              <Command.Item
                key={o.value}
                value={`${o.label} ${o.value}`}
                onSelect={() => toggle(o.value)}
                className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-ui-sm outline-none data-[selected=true]:bg-surface-hover"
              >
                <span className={cn("grid size-4 place-items-center rounded-xs border", on ? "border-primary bg-primary text-white" : "border-border-strong")}>
                  {on ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
                {o.count != null ? <span className="text-ui-xs tabular-nums text-fg-subtle">{o.count}</span> : null}
              </Command.Item>
            );
          })}
        </Command.List>
        {selected.size ? (
          <div className="border-t border-border p-1">
            <Button size="sm" variant="ghost" className="w-full" onClick={() => onChange?.("")}>
              Clear filter
            </Button>
          </div>
        ) : null}
      </Command>
    </Popover>
  );
}

/**
 * Toolbar above a table, wired to useUrlTableState.
 *
 *   <FilterBar table={table} searchPlaceholder="Search orders"
 *     facets={[{ key: "status", title: "Status", options: statusOptions(ORDER_STATUSES) }]}
 *     dateRange={{ from: "from", to: "to" }}            // filter keys holding YYYY-MM-DD (IST)
 *     actions={<Button size="sm">Export</Button>} />
 */
export function FilterBar({ table, searchPlaceholder = "Search", search = true, facets = [], dateRange, actions, children, className }) {
  const fromKey = dateRange?.from || "from";
  const toKey = dateRange?.to || "to";
  const active = table?.activeCount > 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="search">
      {search && table ? (
        <Input
          size="sm"
          type="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={table.search}
          onChange={(e) => table.setSearch(e.target.value)}
          prefix={<Search aria-hidden />}
          className="w-full sm:w-64"
        />
      ) : null}
      {facets.map((f) => (
        <FacetFilter key={f.key} title={f.title} options={f.options} multiple={f.multiple} value={table?.filters?.[f.key]} onChange={(v) => table?.setFilter(f.key, v)} />
      ))}
      {dateRange && table ? (
        <DateRangePicker from={table.filters?.[fromKey]} to={table.filters?.[toKey]} onChange={({ from, to }) => table.setFilters({ [fromKey]: from, [toKey]: to })} />
      ) : null}
      {children}
      {active ? (
        <Button size="sm" variant="ghost" rightIcon={X} onClick={table.reset}>
          Reset
        </Button>
      ) : null}
      {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default FilterBar;
