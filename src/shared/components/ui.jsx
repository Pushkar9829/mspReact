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
