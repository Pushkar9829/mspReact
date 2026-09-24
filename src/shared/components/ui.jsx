export function Logo({ light = false, compact = false, slogan = "भाव भी भरोसा भी" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-baseline font-extrabold tracking-tight ${light ? "text-white" : "text-msr-ink"}`}>
        <span className={compact ? "text-[1.35rem] leading-none" : "text-[1.65rem] leading-none"}>MS</span>
        <span className={`ml-px ${compact ? "text-[1.35rem] leading-none" : "text-[1.65rem] leading-none"} text-msr-gold`}>₹</span>
      </span>
      {!compact ? (
        <span className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${light ? "text-white/65" : "text-msr-muted"}`}>
            Market Server Price
          </span>
          <span className={`text-[11px] font-bold tracking-wide ${light ? "text-msr-gold" : "text-msr-primary"}`}>{slogan}</span>
        </span>
      ) : slogan ? (
        <span className={`hidden text-[10px] font-bold tracking-wide sm:inline ${light ? "text-msr-gold" : "text-msr-primary"}`}>
          {slogan}
        </span>
      ) : null}
    </span>
  );
}
