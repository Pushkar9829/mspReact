import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, X } from "lucide-react";
import { cn } from "./cn.js";
import { Popover } from "./overlays.jsx";
import { Button, buttonClass } from "./Button.jsx";
import { formatDate, istDaysAgo, istToday, parseIstDate, toIstDateValue } from "../lib/format.js";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 90 days", days: 89 },
];

// "YYYY-MM-DD" (IST day) <-> local Date at midnight for the calendar UI.
function toLocal(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : undefined;
}
function fromLocal(date) {
  if (!date) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * Date range in IST calendar days ("YYYY-MM-DD" strings, matches the API `from` / `to` params).
 *   <DateRangePicker from={table.filters.from} to={table.filters.to} onChange={({ from, to }) => table.setFilters({ from, to })} />
 */
export function DateRangePicker({ from, to, onChange, placeholder = "Any date", className, align = "start" }) {
  const [open, setOpen] = useState(false);
  const selected = { from: toLocal(from), to: toLocal(to) };
  const label = from || to ? `${from ? formatDate(parseIstDate(from)) : "…"} – ${to ? formatDate(parseIstDate(to)) : "…"}` : placeholder;
  return (
    <div className={cn("inline-flex items-center", className)}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        align={align}
        className="p-0"
        trigger={
          <button type="button" className={buttonClass({ variant: "secondary", size: "sm", className: cn("justify-start", (from || to) && "pr-8") })} aria-label={`Date range: ${label}`}>
            <CalendarDays aria-hidden />
            <span className={cn("truncate", !from && !to && "text-fg-muted")}>{label}</span>
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:flex-col sm:border-b-0 sm:border-r">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="xs"
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  onChange?.({ from: istDaysAgo(p.days), to: istToday() });
                  setOpen(false);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <DayPicker
            mode="range"
            numberOfMonths={1}
            selected={selected}
            defaultMonth={selected.from || new Date()}
            onSelect={(range) => onChange?.({ from: fromLocal(range?.from), to: fromLocal(range?.to || range?.from) })}
            disabled={{ after: toLocal(toIstDateValue(new Date())) }}
            className="p-3 text-ui-sm"
            classNames={{
              months: "flex",
              month_caption: "flex h-8 items-center justify-center font-medium",
              nav: "absolute right-3 top-3 flex gap-1",
              button_previous: "grid size-7 place-items-center rounded-md hover:bg-surface-hover",
              button_next: "grid size-7 place-items-center rounded-md hover:bg-surface-hover",
              weekday: "w-9 text-ui-xs font-normal text-fg-subtle",
              day: "p-0",
              day_button: "size-9 rounded-md text-ui-sm hover:bg-surface-hover",
              selected: "[&>button]:bg-primary [&>button]:text-fg-on-primary",
              range_middle: "[&>button]:bg-primary-soft [&>button]:text-primary-soft-fg",
              today: "font-semibold text-primary-soft-fg",
              outside: "text-fg-subtle opacity-50",
              disabled: "opacity-30",
            }}
          />
        </div>
      </Popover>
      {from || to ? (
        <button type="button" aria-label="Clear date range" onClick={() => onChange?.({ from: "", to: "" })} className="-ml-7 grid size-5 place-items-center rounded-sm text-fg-subtle hover:text-fg">
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default DateRangePicker;
