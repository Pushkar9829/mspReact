export function Logo({ light = false, compact = false, slogan = "भाव भी भरोसा भी" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-baseline font-extrabold tracking-tight ${light ? "text-white" : "text-msr-navy"}`}>
        <span className={compact ? "text-xl" : "text-2xl"}>MS</span>
        <span className={`ml-0.5 ${compact ? "text-xl" : "text-2xl"} text-msr-gold`}>₹</span>
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        {!compact ? (
          <span className={`hidden text-[10px] font-semibold uppercase tracking-[0.18em] sm:inline ${light ? "text-white/70" : "text-msr-muted"}`}>
            Market Server Price
          </span>
        ) : null}
        <span className={`text-[10px] font-bold tracking-wide sm:text-[11px] ${light ? "text-msr-gold" : "text-msr-accent"}`}>
          {slogan}
        </span>
      </span>
    </span>
  );
}
