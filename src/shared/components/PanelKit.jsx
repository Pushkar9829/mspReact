import { prettyStatus } from "../auth.js";

export const FIELD =
  "w-full rounded-xl border border-msr-border bg-white px-3 py-2 text-sm outline-none focus:border-msr-navy";

const TONE = {
  active: "bg-emerald-50 text-msr-success",
  published: "bg-emerald-50 text-msr-success",
  delivered: "bg-emerald-50 text-msr-success",
  paid: "bg-emerald-50 text-msr-success",
  trial: "bg-indigo-50 text-msr-navy",
  confirmed: "bg-indigo-50 text-msr-navy",
  shipped: "bg-indigo-50 text-msr-navy",
  assigned: "bg-indigo-50 text-msr-navy",
  out_for_delivery: "bg-indigo-50 text-msr-navy",
  pending: "bg-amber-50 text-[#b45309]",
  processing: "bg-amber-50 text-[#b45309]",
  review: "bg-amber-50 text-[#b45309]",
  waiting_customer: "bg-amber-50 text-[#b45309]",
  unassigned: "bg-amber-50 text-[#b45309]",
  ready_to_ship: "bg-amber-50 text-[#b45309]",
  suspended: "bg-red-50 text-msr-danger",
  locked: "bg-red-50 text-msr-danger",
  cancelled: "bg-red-50 text-msr-danger",
  refunded: "bg-red-50 text-msr-danger",
  failed: "bg-red-50 text-msr-danger",
  unpublished: "bg-slate-100 text-msr-muted",
  draft: "bg-slate-100 text-msr-muted",
  archived: "bg-slate-100 text-msr-muted",
  closed: "bg-slate-100 text-msr-muted",
  resolved: "bg-slate-100 text-msr-muted",
};

export function StatusBadge({ value }) {
  if (!value) return <span className="text-msr-muted">—</span>;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[value] || "bg-msr-bg text-msr-muted"}`}>
      {prettyStatus(value)}
    </span>
  );
}

export function PanelToolbar({ search, onSearch, searchPlaceholder = "Search", filters = [], onReset, extra }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm md:p-4">
      <div className="flex flex-wrap items-end gap-3">
        {onSearch ? (
          <label className="grid min-w-[200px] flex-1 gap-1 text-xs font-semibold text-msr-muted">
            Search
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className={FIELD} />
          </label>
        ) : null}
        {filters.map((filter) => (
          <label key={filter.key} className="grid min-w-[140px] gap-1 text-xs font-semibold text-msr-muted">
            {filter.label}
            {filter.type === "date" ? (
              <input type="date" value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className={FIELD} />
            ) : (
              <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className={FIELD}>
                <option value="">{filter.all || "All"}</option>
                {(filter.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}
        {onReset ? (
          <button type="button" onClick={onReset} className="text-sm font-semibold text-msr-purple">
            Reset
          </button>
        ) : null}
        {extra}
      </div>
    </div>
  );
}

export function PanelPager({ meta, page, onPage }) {
  const total = meta?.total || 0;
  const pages = meta?.pages || 0;
  const limit = meta?.limit || 20;
  const current = meta?.page || page || 1;
  if (!total && !pages) return null;
  const from = total ? (current - 1) * limit + 1 : 0;
  const to = Math.min(total, current * limit);
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-msr-muted">{total ? `${from}–${to} of ${total}` : "0 results"}</p>
      {pages > 1 ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => onPage(current - 1)}
            className="rounded-xl border border-msr-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={current >= pages}
            onClick={() => onPage(current + 1)}
            className="rounded-xl border border-msr-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PanelModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="msr-pane max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-msr-muted">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ActionBtn({ children, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-xs font-bold ${danger ? "text-msr-danger" : "text-msr-purple"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
