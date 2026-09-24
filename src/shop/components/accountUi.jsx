import { EmptyState, inputClass } from "./shopUi.jsx";

const fieldClass = inputClass;

export function AccountHead({ kicker = "My account", title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-msr-primary">{kicker}</p> : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-msr-ink">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-msr-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AccountEmpty({ icon, title, text, children }) {
  return (
    <EmptyState icon={icon} title={title} text={text} className="mt-6">
      {children}
    </EmptyState>
  );
}

export function AccountCard({ children, className = "" }) {
  return <div className={`rounded-2xl border border-msr-line bg-white p-5 shadow-card ${className}`}>{children}</div>;
}

export function AccountField({ label, className = "", children }) {
  return (
    <label className={`block text-[12px] font-semibold text-msr-muted ${className}`}>
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export { fieldClass as accountField };
