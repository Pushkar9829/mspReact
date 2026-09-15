const fieldClass =
  "h-11 w-full rounded-xl border border-[#ece6d4] bg-white px-3 text-sm text-msr-navy outline-none placeholder:text-[#9aa0b4] focus:border-msr-gold";

export function AccountHead({ kicker = "My account", title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6a12]">{kicker}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-msr-navy md:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#8b8ea3]">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AccountEmpty({ icon: Icon, title, text, children }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[#ead9a0] bg-white px-6 py-14 text-center">
      {Icon ? (
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fffaf0] text-[#8a6a12]">
          <Icon className="h-7 w-7" strokeWidth={1.6} />
        </div>
      ) : null}
      <p className="mt-4 text-base font-extrabold text-msr-navy">{title}</p>
      {text ? <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-msr-muted">{text}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

export function AccountCard({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[#ece6d4] bg-white p-5 shadow-[0_8px_24px_rgba(8,10,61,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function AccountField({ label, className = "", children }) {
  return (
    <label className={`block text-[12px] font-semibold text-[#6b6f7e] ${className}`}>
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export { fieldClass as accountField };
