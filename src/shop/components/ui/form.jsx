import { cloneElement, forwardRef, isValidElement, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn.js";

export const inputClass =
  "h-11 w-full rounded-control border border-shop-line-strong bg-shop-card px-3 text-shop-base text-shop-ink placeholder:text-shop-subtle transition-colors hover:border-shop-muted focus:border-shop-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-shop-primary aria-[invalid=true]:border-shop-danger disabled:bg-shop-well disabled:text-shop-muted";

/**
 * Label + control + hint + error, wired for screen readers (id, aria-describedby, aria-invalid).
 *   <Field label="PIN code" hint="6 digits" error={errors.postalCode} required><Input … /></Field>
 * `error` may be a string or an ApiError (its `fields[name]` is used).
 */
export function Field({ label, hint, error, name, required, optional, className, children }) {
  const id = useId();
  const message = typeof error === "string" ? error : name && error?.fieldError ? error.fieldError(name) : error?.fields?.[name];
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = message ? `${id}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-describedby": [hintId, errId, children.props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
        "aria-invalid": message ? true : children.props["aria-invalid"],
        required: required || children.props.required,
      })
    : children;
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <label htmlFor={children?.props?.id || id} className="text-shop-sm font-semibold text-shop-ink">
          {label}
          {required ? <span className="text-shop-danger" aria-hidden> *</span> : null}
          {optional ? <span className="font-normal text-shop-subtle"> (optional)</span> : null}
        </label>
      ) : null}
      {control}
      {hint && !message ? (
        <p id={hintId} className="text-shop-xs text-shop-muted">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={errId} role="alert" className="text-shop-xs font-medium text-shop-danger-ink">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, prefix, suffix, ...props }, ref) {
  if (!prefix && !suffix) return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  return (
    <div className="relative flex items-center">
      {prefix ? <span className="pointer-events-none absolute left-3 text-shop-base text-shop-muted">{prefix}</span> : null}
      <input ref={ref} className={cn(inputClass, prefix && "pl-12", suffix && "pr-10", className)} {...props} />
      {suffix ? <span className="absolute right-2 flex items-center">{suffix}</span> : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputClass, "h-auto py-2.5 leading-relaxed", className)} {...props} />;
});

/** Native select (best on mobile). options: [{ value, label }] or strings. */
export const Select = forwardRef(function Select({ className, options = [], placeholder, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(inputClass, "appearance-none pr-9", className)} {...props}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-shop-muted" aria-hidden />
    </div>
  );
});

/** Checkbox with a 44 px tall hit area. */
export function Checkbox({ label, description, className, ...props }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-shop-line-strong accent-[var(--shop-primary)]" {...props} />
      <span className="min-w-0">
        <span className="block text-shop-base text-shop-ink">{label}</span>
        {description ? <span className="block text-shop-xs text-shop-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Radio({ label, description, className, ...props }) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <input type="radio" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--shop-primary)]" {...props} />
      <span className="min-w-0">
        <span className="block text-shop-base text-shop-ink">{label}</span>
        {description ? <span className="block text-shop-xs text-shop-muted">{description}</span> : null}
      </span>
    </label>
  );
}
