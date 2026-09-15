export function PanelTable({ columns, rows, rowKey, onRowClick }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-msr-bg text-msr-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey ? rowKey(row) : row._id || row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-msr-border ${onRowClick ? "cursor-pointer hover:bg-msr-bg/70" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 align-top">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PanelStat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-msr-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      {hint ? <p className="mt-2 text-xs text-msr-muted">{hint}</p> : null}
    </div>
  );
}

export function PanelState({ loading, error, empty, emptyText = "Nothing here yet.", children }) {
  if (loading) return <p className="mt-6 text-sm text-msr-muted">Loading…</p>;
  if (error) return <p className="mt-6 text-sm text-msr-danger">{error}</p>;
  if (empty) return <p className="mt-6 text-sm text-msr-muted">{emptyText}</p>;
  return children;
}
