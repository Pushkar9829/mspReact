import { useMemo, useState } from "react";
import { Popover as RPopover } from "radix-ui";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "./cn.js";
import { controlClass, useField } from "./form.jsx";
import { Spinner } from "./Spinner.jsx";
import { useDebouncedValue } from "../hooks/useDebouncedValue.js";

/**
 * Searchable select. Static options or async search.
 *
 * Static:  <Combobox value={id} onChange={setId} options={[{ value, label, description }]} />
 * Async:   <Combobox value={id} onChange={(v, option) => …}
 *            queryKey={["users", "search"]} search={(q, { signal }) => api.listUsers({ q, limit: 20 })}
 *            mapOption={(u) => ({ value: u._id, label: u.name, description: u.email })}
 *            selectedLabel={user?.name} />
 * `clearable` adds a "clear" button (onChange("")). `emptyText` when nothing matches.
 */
export function Combobox({
  value,
  onChange,
  options: staticOptions,
  search,
  queryKey = ["combobox"],
  mapOption = (o) => o,
  selectedLabel,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results",
  clearable = false,
  disabled,
  className,
  size = "md",
  align = "start",
  "aria-label": ariaLabel,
  renderOption,
}) {
  const field = useField();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const asyncMode = typeof search === "function";

  const remote = useQuery({
    queryKey: [...queryKey, "search", dq],
    queryFn: ({ signal }) => Promise.resolve(search(dq, { signal })),
    enabled: asyncMode && open,
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    if (!asyncMode) return staticOptions || [];
    const rows = Array.isArray(remote.data) ? remote.data : remote.data?.data || [];
    return rows.map(mapOption);
  }, [asyncMode, staticOptions, remote.data, mapOption]);

  const [picked, setPicked] = useState(null);
  const current = options.find((o) => String(o.value) === String(value)) || (picked && String(picked.value) === String(value) ? picked : null);
  const label = current?.label || selectedLabel || (value ? String(value) : "");

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <RPopover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            id={field?.id}
            aria-invalid={field?.invalid || undefined}
            aria-describedby={field?.describedBy}
            className={cn(controlClass, size === "sm" ? "h-8 text-ui-sm" : "h-9", "inline-flex items-center justify-between gap-2 text-left", clearable && value && "pr-14")}
          >
            <span className={cn("truncate", !label && "text-fg-subtle")}>{label || placeholder}</span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          </button>
        </RPopover.Trigger>
        {clearable && value && !disabled ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => {
              setPicked(null);
              onChange?.("", null);
            }}
            className="absolute right-8 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <RPopover.Portal>
        <RPopover.Content
          align={align}
          sideOffset={4}
          collisionPadding={8}
          className="z-50 w-[max(var(--radix-popover-trigger-width),16rem)] overflow-hidden rounded-md border border-border bg-surface text-fg shadow-lg data-[state=open]:animate-scale-in"
        >
          <Command shouldFilter={!asyncMode} loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden className="size-4 text-fg-subtle" />
              <Command.Input value={q} onValueChange={setQ} placeholder={searchPlaceholder} className="h-9 w-full bg-transparent text-ui-sm outline-none placeholder:text-fg-subtle" />
              {asyncMode && remote.isFetching ? <Spinner className="size-3.5 text-fg-subtle" /> : null}
            </div>
            <Command.List className="max-h-64 overflow-y-auto p-1">
              {!remote.isFetching || !asyncMode ? <Command.Empty className="px-2 py-6 text-center text-ui-sm text-fg-subtle">{remote.error ? remote.error.message : emptyText}</Command.Empty> : null}
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={asyncMode ? String(o.value) : `${o.label} ${o.description || ""} ${o.value}`}
                  disabled={o.disabled}
                  onSelect={() => {
                    setPicked(o);
                    onChange?.(o.value, o);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-ui-sm outline-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-surface-hover"
                >
                  <Check aria-hidden className={cn("size-3.5 shrink-0", String(o.value) === String(value) ? "opacity-100" : "opacity-0")} />
                  {renderOption ? (
                    renderOption(o)
                  ) : (
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.description ? <span className="block truncate text-ui-xs text-fg-subtle">{o.description}</span> : null}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

export default Combobox;
