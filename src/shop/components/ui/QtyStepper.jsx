import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "./cn.js";
import { Money } from "./Price.jsx";
import { qtyModel } from "../../lib/qtyRules.js";

/** Snap a typed qty: 0 removes; otherwise ≥ min, a multiple of step (rounded up), ≤ max. */
export function snapQty(raw, { min = 1, max = Infinity, step = 1 } = {}) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return 0;
  const s = Math.max(1, Number(step) || 1);
  const lo = Math.max(1, Math.ceil((Number(min) || 1) / s) * s);
  const hi = Number.isFinite(Number(max)) ? Math.floor(Number(max) / s) * s : Infinity;
  let next = Math.max(lo, Math.ceil(n / s) * s);
  if (next > hi) next = hi;
  return next;
}

function rulesText({ min, step, max }) {
  return [min > 1 ? `min ${min}` : "", step > 1 ? `steps of ${step}` : "", Number.isFinite(Number(max)) ? `max ${max}` : ""].filter(Boolean).join(", ");
}

/**
 * Quantity stepper: − [qty] + with 44 px targets, typed entry snapped to min/step/max, an inline hint
 * when a value had to be adjusted, and an optional line total.
 *
 *   <QtyStepper value={line.qty} rules={line.rules}
 *               onChange={(qty) => actions.setQty.mutate({ cartItemId, qty })}
 *               lineTotal={line.lineTotal} pending={line.pending} removable />
 *
 * Pass the server `rules` (cart line / variant): below `bulkFrom` it steps by 1, from `bulkFrom` by the
 * pack multiple, capped at the order max. Without `rules`, plain `min` / `step` / `max` apply.
 *
 * Changes are committed after a short pause (`commitDelay`, default 350 ms) so rapid taps send one
 * request. `onChange(0)` means remove (only when `removable`; otherwise − stops at `min`).
 */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  step = 1,
  max = Infinity,
  removable = true,
  disabled = false,
  pending = false,
  lineTotal,
  size = "md",
  rules,
  label = "Quantity",
  commitDelay = 350,
  block = false, // stretch to the container width (product cards)
  showHint = true, // product cards show their own one-line nudge instead
  className,
}) {
  const [draft, setDraft] = useState(String(value));
  const [hint, setHint] = useState("");
  const timer = useRef(null);
  const local = useRef(Number(value));
  const s = Math.max(1, Number(step) || 1);
  const lo = Math.max(1, Math.ceil((Number(min) || 1) / s) * s);
  const hi = Number.isFinite(Number(max)) && max != null ? Math.floor(Number(max) / s) * s : Infinity;
  const model = rules ? qtyModel(rules) : null;

  useEffect(() => {
    if (!timer.current) {
      local.current = Number(value);
      setDraft(String(value));
    }
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function schedule(next) {
    local.current = next;
    setDraft(String(next));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (next !== Number(value)) onChange?.(next);
    }, commitDelay);
  }

  function bump(dir) {
    const cur = local.current;
    let next;
    if (model) {
      next = model.next(cur, dir);
      if (next === 0 && !removable) next = 1;
      if (dir > 0 && next === cur) setHint(Number.isFinite(model.max) ? `Max ${model.max} for this item` : "");
      else setHint(dir > 0 && model.bulkFrom && cur < model.bulkFrom && next >= model.bulkFrom ? "Bulk price applies from here" : "");
      if (next !== cur) schedule(next);
      return;
    }
    if (dir > 0) next = cur < lo ? lo : cur + s;
    else next = cur - s < lo ? (removable ? 0 : lo) : cur - s;
    if (next > hi) {
      setHint(`Max ${hi} for this item`);
      next = hi;
    } else setHint("");
    if (next !== cur) schedule(next);
  }

  function commitTyped() {
    const typed = draft.trim();
    if (!typed || Number(typed) === local.current) {
      setDraft(String(local.current));
      return;
    }
    let next = model ? model.snap(typed) : snapQty(typed, { min: lo, max: hi, step: s });
    if (next == null) {
      setDraft(String(local.current));
      return;
    }
    if (next === 0 && !removable) next = lo;
    if (next > 0 && next !== Math.floor(Number(typed))) setHint(`Set to ${next} (${model ? model.describe() : rulesText({ min: lo, step: s, max: hi })})`);
    else setHint("");
    clearTimeout(timer.current);
    timer.current = null;
    local.current = next;
    setDraft(String(next));
    if (next !== Number(value)) onChange?.(next);
  }

  const h = size === "sm" ? "h-9 pointer-coarse:h-11" : "h-11";
  const btn = cn("grid shrink-0 place-items-center text-shop-ink transition-colors hover:bg-shop-hover disabled:opacity-40", size === "sm" ? "w-9 pointer-coarse:w-11" : "w-11");
  const atMin = model ? local.current <= 1 : local.current <= lo;
  const atMax = model ? Number.isFinite(model.max) && local.current >= model.max : local.current >= hi;
  return (
    <div className={cn(block ? "grid w-full min-w-0 gap-1" : "inline-grid gap-1", className)}>
      <div className={cn("flex items-center gap-3", block && "min-w-0")}>
        <div
          className={cn(
            "inline-flex items-stretch overflow-hidden bg-shop-card outline outline-1 -outline-offset-1",
            block ? "w-full min-w-0 rounded-full outline-shop-primary/50" : "rounded-control outline-shop-line-strong",
            h,
            disabled && "opacity-60"
          )}
          role="group"
          aria-label={label}
        >
          <button type="button" className={btn} onClick={() => bump(-1)} disabled={disabled || (!removable && atMin)} aria-label={atMin && removable ? "Remove" : `Decrease by ${s}`}>
            {atMin && removable ? <Trash2 className="size-4" strokeWidth={1.75} aria-hidden /> : <Minus className="size-4" strokeWidth={2} aria-hidden />}
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={label}
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={commitTyped}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "ArrowUp") (e.preventDefault(), bump(1));
              if (e.key === "ArrowDown") (e.preventDefault(), bump(-1));
              if (e.key === "Escape") {
                setDraft(String(local.current));
                e.currentTarget.blur();
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            className={cn("min-w-0 border-x border-shop-line bg-transparent text-center text-shop-base font-semibold tabular-nums text-shop-ink focus:outline-none focus-visible:bg-shop-primary-soft", block ? "w-0 flex-1" : "w-12")}
          />
          <button type="button" className={btn} onClick={() => bump(1)} disabled={disabled || atMax} aria-label={`Increase by ${s}`}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        {lineTotal !== undefined ? <Money value={lineTotal} pending={pending} className="text-shop-base font-semibold text-shop-ink" /> : null}
      </div>
      <p className={cn("min-h-4 text-shop-xs", hint ? "font-medium text-shop-warning-ink" : "text-shop-muted", !showHint && "sr-only")} aria-live="polite">
        {hint || (model ? (model.isBulk(local.current) ? model.describe() : "") : lo > 1 || s > 1 ? rulesText({ min: lo, step: s, max: hi }) : "")}
      </p>
    </div>
  );
}

export default QtyStepper;
