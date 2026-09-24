export function PanelTable({ columns, rows, rowKey, onRowClick, selectedKey }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-msr-bg text-[12px] text-msr-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 font-semibold">
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
                className={`border-t border-msr-border ${selected ? "bg-[#eef0ff]" : ""} ${onRowClick ? "cursor-pointer hover:bg-msr-bg/80" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 align-top">
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
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[12px] text-msr-muted">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
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
