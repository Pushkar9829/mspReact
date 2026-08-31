import { Link } from "react-router-dom";

export function Logo({ light = false, compact = false }) {
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight ${light ? "text-white" : "text-msr-navy"}`}>
      <span className={compact ? "text-xl" : "text-2xl"}>MS</span>
      <span className={`ml-0.5 ${compact ? "text-xl" : "text-2xl"} text-msr-gold`}>₹</span>
      {!compact ? (
        <span className={`ml-2 hidden text-[10px] font-semibold uppercase tracking-[0.18em] sm:inline ${light ? "text-white/70" : "text-msr-muted"}`}>
          Market Server Price
        </span>
      ) : null}
    </span>
  );
}

export function QtyStepper({ value, onChange, size = "md" }) {
  const box = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10";
  const mid = size === "sm" ? "h-8 min-w-8 text-sm" : "h-10 min-w-10";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-msr-border bg-white">
      <button type="button" className={`${box} text-msr-muted hover:bg-msr-bg`} onClick={() => onChange(Math.max(1, value - 1))}>
        −
      </button>
      <span className={`${mid} grid place-items-center font-semibold`}>{value}</span>
      <button type="button" className={`${box} text-msr-navy hover:bg-msr-bg`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
      <span className="font-semibold text-msr-text">{value}</span>
    </span>
  );
}

export function SectionTitle({ title, to, action = "View All →" }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      {to ? (
        <Link to={to} className="min-w-0">
          <h2 className="text-[1.375rem] font-bold tracking-tight text-[#1a1c3d] hover:text-[#4b46ff] md:text-[1.5rem]">
            {title}
          </h2>
        </Link>
      ) : (
        <h2 className="text-[1.375rem] font-bold tracking-tight text-[#1a1c3d] md:text-[1.5rem]">{title}</h2>
      )}
      {to ? (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center rounded-lg px-2 py-1 text-[13px] font-semibold text-[#4b46ff] hover:bg-[#eef0ff] hover:text-[#2722b8]"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}
