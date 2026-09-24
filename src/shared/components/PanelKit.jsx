import { prettyStatus } from "../auth.js";

export const FIELD =
  "w-full rounded-lg border border-msr-border bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-msr-navy";

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

export function PanelTabs({ tabs, value, onChange }) {
  return (
    <div className="mt-3 flex gap-1 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-semibold ${
              active ? "bg-msr-navy text-white" : "text-msr-muted hover:bg-msr-bg hover:text-msr-navy"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PanelToolbar({ search, onSearch, searchPlaceholder = "Search", filters = [], onReset, extra }) {
  return (
    <div className="mt-3 rounded-xl bg-white p-2.5 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
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
          <button type="button" onClick={onReset} className="text-[13px] font-semibold text-msr-purple">
            Reset
          </button>
        ) : null}
        {extra}
      </div>
    </div>
  );
}

function pageWindow(current, pages) {
  const width = 5;
  let start = Math.max(1, current - 2);
  let end = Math.min(pages, start + width - 1);
  start = Math.max(1, end - width + 1);
  const list = [];
  for (let n = start; n <= end; n += 1) list.push(n);
  return list;
}

export function PanelPager({ meta, page, onPage }) {
  const total = meta?.total || 0;
  const pages = Math.max(meta?.pages || 0, total ? 1 : 0);
  const limit = meta?.limit || 20;
  const current = meta?.page || page || 1;
  if (!total) return null;
  const from = (current - 1) * limit + 1;
  const to = Math.min(total, current * limit);
  const numbers = pageWindow(current, pages);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[12px] text-msr-muted">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPage(current - 1)}
          className="rounded-md border border-msr-border bg-white px-2 py-1 text-[12px] font-semibold disabled:opacity-40"
        >
          Prev
        </button>
        {numbers[0] > 1 ? (
          <button
            type="button"
            onClick={() => onPage(1)}
            className="min-w-7 rounded-md border border-msr-border bg-white px-2 py-1 text-[12px] font-semibold text-msr-navy"
          >
            1
          </button>
        ) : null}
        {numbers[0] > 2 ? <span className="px-0.5 text-[12px] text-msr-muted">…</span> : null}
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`min-w-7 rounded-md px-2 py-1 text-[12px] font-semibold ${
              n === current ? "bg-msr-navy text-white" : "border border-msr-border bg-white text-msr-navy"
            }`}
          >
            {n}
          </button>
        ))}
        {numbers[numbers.length - 1] < pages - 1 ? <span className="px-0.5 text-[12px] text-msr-muted">…</span> : null}
        {numbers[numbers.length - 1] < pages ? (
          <button
            type="button"
            onClick={() => onPage(pages)}
            className="min-w-7 rounded-md border border-msr-border bg-white px-2 py-1 text-[12px] font-semibold text-msr-navy"
          >
            {pages}
          </button>
        ) : null}
        <button
          type="button"
          disabled={current >= pages}
          onClick={() => onPage(current + 1)}
          className="rounded-md border border-msr-border bg-white px-2 py-1 text-[12px] font-semibold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function PanelModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={onClose}>
      <div
        className="msr-pane max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 text-[13px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-[12px] text-msr-muted">
            Close
          </button>
        </div>
        <div className="mt-3 grid gap-2 [&_button[type=submit]]:rounded-lg [&_button[type=submit]]:py-2 [&_button[type=submit]]:text-[13px]">{children}</div>
      </div>
    </div>
  );
}

export function ActionBtn({ children, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${danger ? "text-msr-danger" : "text-msr-purple"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
