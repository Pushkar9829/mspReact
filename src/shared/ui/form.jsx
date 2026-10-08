import { cloneElement, createContext, forwardRef, isValidElement, useContext, useId } from "react";
import { Checkbox as RCheckbox, Switch as RSwitch, RadioGroup as RRadio, Select as RSelect } from "radix-ui";
import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "./cn.js";

export const controlClass = cn(
  "w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 text-ui text-fg shadow-xs transition-colors",
  "placeholder:text-fg-subtle hover:border-fg-subtle/50",
  "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring/30 focus-visible:outline-offset-0",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70",
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/30"
);

const FieldContext = createContext(null);
/** Inside <Field>: { id, describedBy, invalid, required } for custom controls. */
export function useField() {
  return useContext(FieldContext);
}

function fieldProps(props) {
  const ctx = useContext(FieldContext);
  if (!ctx) return props;
  return {
    id: props.id || ctx.id,
    "aria-describedby": cn(props["aria-describedby"], ctx.describedBy) || undefined,
    "aria-invalid": props["aria-invalid"] ?? (ctx.invalid || undefined),
    required: props.required ?? ctx.required,
    ...props,
  };
}

export const Input = forwardRef(function Input({ className, size = "md", prefix, suffix, ...props }, ref) {
  const p = fieldProps(props);
  const h = size === "sm" ? "h-8 text-ui-sm" : "h-9";
  if (prefix || suffix) {
    return (
      <div className={cn("relative flex items-center", className)}>
        {prefix ? <span className="pointer-events-none absolute left-3 text-ui-sm text-fg-subtle [&_svg]:size-4">{prefix}</span> : null}
        <input ref={ref} className={cn(controlClass, h, prefix && "pl-8", suffix && "pr-10")} {...p} />
        {suffix ? <span className="absolute right-3 text-ui-sm text-fg-subtle [&_svg]:size-4">{suffix}</span> : null}
      </div>
    );
  }
  return <input ref={ref} className={cn(controlClass, h, className)} {...p} />;
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(controlClass, "min-h-20 py-2 leading-relaxed", className)} {...fieldProps(props)} />;
});

/** Native <select> (best on mobile, works in forms). options: [{ value, label, disabled }] or children. */
export const NativeSelect = forwardRef(function NativeSelect({ className, options, placeholder, children, size = "md", ...props }, ref) {
  return (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(controlClass, size === "sm" ? "h-8 text-ui-sm" : "h-9", "appearance-none pr-8")} {...fieldProps(props)}>
        {placeholder != null ? <option value="">{placeholder}</option> : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
});

const EMPTY = "__empty__";
/**
 * Radix Select. <Select value onValueChange options={[{value,label}]} placeholder="All" allowEmpty />
 * `allowEmpty` adds an option that maps to "" (Radix forbids empty values internally).
 */
export function Select({ value, onValueChange, onChange, options = [], placeholder = "Select…", allowEmpty, emptyLabel, className, size = "md", disabled, name, "aria-label": ariaLabel, id }) {
  const ctx = useContext(FieldContext);
  const handle = (v) => {
    const next = v === EMPTY ? "" : v;
    onValueChange?.(next);
    onChange?.(next);
  };
  return (
    <RSelect.Root value={value === "" || value == null ? (allowEmpty ? EMPTY : undefined) : String(value)} onValueChange={handle} disabled={disabled} name={name}>
      <RSelect.Trigger
        id={id || ctx?.id}
        aria-label={ariaLabel}
        aria-invalid={ctx?.invalid || undefined}
        aria-describedby={ctx?.describedBy}
        className={cn(controlClass, size === "sm" ? "h-8 text-ui-sm" : "h-9", "inline-flex items-center justify-between gap-2 text-left data-[placeholder]:text-fg-subtle", className)}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content position="popper" sideOffset={4} className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg animate-scale-in">
          <RSelect.Viewport>
            {allowEmpty ? <SelectItem value={EMPTY}>{emptyLabel || placeholder}</SelectItem> : null}
            {options.map((o) => (
              <SelectItem key={o.value} value={String(o.value)} disabled={o.disabled}>
                {o.label}
              </SelectItem>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

function SelectItem({ children, ...props }) {
  return (
    <RSelect.Item
      {...props}
      className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-ui-sm text-fg outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover"
    >
      <RSelect.ItemIndicator className="absolute left-2">
        <Check className="size-3.5" />
      </RSelect.ItemIndicator>
      <RSelect.ItemText>{children}</RSelect.ItemText>
    </RSelect.Item>
  );
}

export function Label({ className, children, required, optional, ...props }) {
  return (
    <label className={cn("text-ui-sm font-medium text-fg", className)} {...props}>
      {children}
      {required ? <span aria-hidden className="ml-0.5 text-danger-fg">*</span> : null}
      {optional ? <span className="ml-1 font-normal text-fg-subtle">(optional)</span> : null}
    </label>
  );
}

/**
 * Form field wrapper: label, hint, inline error and a11y wiring for the single child control.
 *   <Field label="Email" hint="We never share it" error={err?.fieldError("email")} required>
 *     <Input value={email} onChange={...} />
 *   </Field>
 * `name` + `errors` (ApiError or fields map) picks the error automatically: <Field name="email" errors={mutation.error}>.
 */
export function Field({ label, hint, error, errors, name, required, optional, className, children, id: idProp, labelHidden, horizontal }) {
  const auto = useId();
  const id = idProp || `f-${auto}`;
  const msg =
    error ||
    (name && errors
      ? typeof errors.fieldError === "function"
        ? errors.fieldError(name)
        : errors.fields?.[name] || errors[name]
      : undefined);
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = msg ? `${id}-err` : undefined;
  const ctx = { id, describedBy: cn(hintId, errId) || undefined, invalid: Boolean(msg), required };
  const child = isValidElement(children) && !children.props.id ? cloneElement(children, { id }) : children;
  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn(horizontal ? "grid gap-1.5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-start sm:gap-4" : "grid gap-1.5", className)}>
        {label ? (
          <Label htmlFor={id} required={required} optional={optional} className={cn(labelHidden && "sr-only", horizontal && "sm:pt-2")}>
            {label}
          </Label>
        ) : null}
        <div className="grid gap-1.5">
          {child}
          {msg ? (
            <p id={errId} className="text-ui-xs text-danger-fg" role="alert">
              {msg}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-ui-xs text-fg-subtle">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </FieldContext.Provider>
  );
}

/** Checkbox with optional inline label. checked may be true | false | "indeterminate". */
export function Checkbox({ checked, onCheckedChange, label, description, className, id: idProp, ...props }) {
  const auto = useId();
  const id = idProp || `cb-${auto}`;
  const box = (
    <RCheckbox.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-xs border border-border-strong bg-surface shadow-xs transition-colors",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "disabled:opacity-50",
        !label && className
      )}
      {...props}
    >
      <RCheckbox.Indicator className="text-white">
        {checked === "indeterminate" ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <div className="pt-0.5">{box}</div>
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-ui-sm font-medium text-fg">
          {label}
        </label>
        {description ? <p className="text-ui-xs text-fg-subtle">{description}</p> : null}
      </div>
    </div>
  );
}

export function Switch({ checked, onCheckedChange, label, description, className, id: idProp, ...props }) {
  const auto = useId();
  const id = idProp || `sw-${auto}`;
  const sw = (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-strong transition-colors data-[state=checked]:bg-primary disabled:opacity-50"
      {...props}
    >
      <RSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
    </RSwitch.Root>
  );
  if (!label) return sw;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-ui-sm font-medium text-fg">
          {label}
        </label>
        {description ? <p className="text-ui-xs text-fg-subtle">{description}</p> : null}
      </div>
      {sw}
    </div>
  );
}

/** <RadioGroup value onValueChange options={[{ value, label, description }]} orientation="vertical" /> */
export function RadioGroup({ options = [], className, orientation = "vertical", ...props }) {
  const auto = useId();
  return (
    <RRadio.Root className={cn(orientation === "horizontal" ? "flex flex-wrap gap-4" : "grid gap-2.5", className)} orientation={orientation} {...props}>
      {options.map((o) => {
        const id = `${auto}-${o.value}`;
        return (
          <div key={o.value} className="flex items-start gap-2.5">
            <RRadio.Item
              id={id}
              value={o.value}
              disabled={o.disabled}
              className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-border-strong bg-surface data-[state=checked]:border-primary disabled:opacity-50"
            >
              <RRadio.Indicator className="size-2 rounded-full bg-primary" />
            </RRadio.Item>
            <div className="grid gap-0.5">
              <label htmlFor={id} className="text-ui-sm font-medium text-fg">
                {o.label}
              </label>
              {o.description ? <p className="text-ui-xs text-fg-subtle">{o.description}</p> : null}
            </div>
          </div>
        );
      })}
    </RRadio.Root>
  );
}

/** Groups form sections with a title on the left (Stripe-style settings form). */
export function FormSection({ title, description, children, className }) {
  return (
    <div className={cn("grid gap-4 border-b border-border py-6 first:pt-0 last:border-0 md:grid-cols-[16rem_1fr] md:gap-8", className)}>
      <div>
        <h3 className="text-ui font-semibold text-fg">{title}</h3>
        {description ? <p className="mt-1 text-ui-sm text-fg-muted">{description}</p> : null}
      </div>
      <div className="grid max-w-2xl gap-4">{children}</div>
    </div>
  );
}

/** Sticky footer for long forms. */
export function FormActions({ children, className }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4", className)}>{children}</div>;
}
