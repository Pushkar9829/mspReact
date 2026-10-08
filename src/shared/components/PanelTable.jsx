/**
 * Legacy table helpers, now thin wrappers over shared/ui. New pages: <DataTable> from shared/ui.
 */
import { cn } from "../ui/cn.js";
import { StatCard } from "../ui/Card.jsx";
import { EmptyState, ErrorState, SkeletonText } from "../ui/feedback.jsx";

export function PanelTable({ columns, rows, rowKey, onRowClick, selectedKey }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface shadow-xs">
      <table className="w-full text-left text-ui-sm">
        <thead className="bg-surface-2 text-ui-xs text-fg-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className="border-b border-border px-3 py-2 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = rowKey ? rowKey(row) : row._id || row.id;
            const selected = selectedKey != null && selectedKey !== "" && String(selectedKey) === String(id);
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                aria-selected={selected || undefined}
                className={cn("border-b border-border last:border-0", selected && "bg-primary-soft/60", onRowClick && "cursor-pointer hover:bg-surface-hover")}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 align-top text-fg">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PanelStat({ label, value, hint }) {
  return <StatCard label={label} value={value} hint={hint} />;
}

export function PanelState({ loading, error, empty, emptyText = "Nothing here yet.", children }) {
  if (loading) return <SkeletonText lines={4} className="mt-6" />;
  if (error) return <ErrorState error={error} compact className="mt-2" />;
  if (empty) return <EmptyState title={emptyText} compact className="mt-2" />;
  return children;
}
