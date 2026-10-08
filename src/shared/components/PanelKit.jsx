/**
 * Legacy panel kit — thin wrappers over shared/ui so un-migrated pages keep compiling and get the
 * new look, accessibility (real dialogs, ARIA tabs) and dark mode. New code: import from shared/ui.
 */
import { useId, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../ui/cn.js";
import { controlClass } from "../ui/form.jsx";
import { Button } from "../ui/Button.jsx";
import { StatusPill } from "../ui/Badge.jsx";
import { Dialog } from "../ui/Dialog.jsx";
import { Pagination } from "../ui/nav.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

export const FIELD = cn(controlClass, "h-9 py-1.5 [&:is(textarea)]:h-auto");

export function StatusBadge({ value, domain }) {
  return <StatusPill status={value} domain={domain} />;
}

/** Accessible tab strip (role=tablist, arrow keys). Content is rendered by the page. */
export function PanelTabs({ tabs, value, onChange }) {
  const id = useId();
  const refs = useRef([]);
  function onKeyDown(e, index) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (index + dir + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  }
  return (
    <div role="tablist" className="mt-3 flex w-fit max-w-full gap-1 overflow-x-auto rounded-md bg-surface-sunken p-1 no-scrollbar">
      {tabs.map((tab, i) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => (refs.current[i] = el)}
            id={`${id}-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-sm px-3 py-1 text-ui-sm font-medium transition-colors",
              active ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function PanelHeader({ title, subtitle, action }) {
  useDocumentTitle(typeof title === "string" ? title : null);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle ? <p className="mt-1 text-ui-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PanelPrimary({ children, onClick, to, type = "button", disabled }) {
  return (
    <Button variant="primary" onClick={onClick} to={to} type={type} disabled={disabled}>
      {children}
    </Button>
  );
}

export function PanelBack({ to, label = "Back to list" }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={ArrowLeft}
      className="-ml-2 mb-2"
      onClick={() => {
        if (location.key !== "default") navigate(-1);
        else navigate(to);
      }}
    >
      {label}
    </Button>
  );
}

function chipLabel(filter) {
  const match = (filter.options || []).find((opt) => opt.value === filter.value);
  return match?.label || filter.value;
}

export function PanelToolbar({ search, onSearch, searchPlaceholder = "Search", filters = [], onReset, extra, chips = false }) {
  const active = chips ? filters.filter((filter) => filter.value) : [];
  const searchOn = chips && String(search || "").trim();
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface p-3 shadow-xs" role="search">
      <div className="flex flex-wrap items-end gap-2">
        {onSearch ? (
          <label className="grid min-w-[200px] flex-1 gap-1 text-ui-xs font-medium text-fg-muted">
            Search
            <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder} className={FIELD} />
          </label>
        ) : null}
        {filters.map((filter) => (
          <label key={filter.key} className="grid min-w-[140px] gap-1 text-ui-xs font-medium text-fg-muted">
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
          <Button variant="ghost" size="md" onClick={onReset}>
            Reset
          </Button>
        ) : null}
        {extra}
      </div>
      {searchOn || active.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {searchOn ? (
            <button type="button" onClick={() => onSearch?.("")} className="rounded-full bg-primary-soft px-2 py-0.5 text-ui-xs font-medium text-primary-soft-fg">
              Search: {search.trim()} ×
            </button>
          ) : null}
          {active.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => filter.onChange("")}
              className="rounded-full bg-primary-soft px-2 py-0.5 text-ui-xs font-medium text-primary-soft-fg"
            >
              {filter.label}: {chipLabel(filter)} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PanelPager({ meta, page, onPage }) {
  if (!meta?.total) return null;
  return <Pagination className="mt-3" meta={meta} page={meta?.page || page} onPageChange={onPage} />;
}

export function PanelConfirm({ title, message, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onClose, children }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose?.()}
      title={title}
      description={message}
      size="sm"
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children ? <div className="grid gap-2">{children}</div> : null}
    </Dialog>
  );
}

/** Always-open dialog (render it conditionally). Backdrop clicks don't close it (forms inside). */
export function PanelModal({ title, onClose, children, wide = false }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()} title={title} size={wide ? "lg" : "md"} dirty>
      <div className="grid gap-2 text-ui-sm">{children}</div>
    </Dialog>
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
      className={cn(
        "relative z-[1] rounded-sm px-1.5 py-0.5 text-ui-xs font-medium disabled:opacity-40",
        danger ? "text-danger-fg hover:bg-danger-soft" : "text-primary-soft-fg hover:bg-primary-soft"
      )}
    >
      {children}
    </button>
  );
}
