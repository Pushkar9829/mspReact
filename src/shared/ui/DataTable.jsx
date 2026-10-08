import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Rows3, Rows4, Settings2, X } from "lucide-react";
import { cn } from "./cn.js";
import { Checkbox } from "./form.jsx";
import { Button, IconButton } from "./Button.jsx";
import { DropdownMenu, MenuCheckboxItem, MenuLabel, MenuRadioGroup, MenuSeparator } from "./overlays.jsx";
import { EmptyState, ErrorState, Skeleton } from "./feedback.jsx";
import { Pagination } from "./nav.jsx";
import { saveBlob } from "../api/client.js";

function readPref(key, fallback) {
  if (!key) return fallback;
  try {
    const v = JSON.parse(localStorage.getItem(`msr-table:${key}`) || "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key, value) {
  if (!key) return;
  try {
    localStorage.setItem(`msr-table:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function csvCell(v) {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function plainValue(col, row) {
  if (typeof col.csv === "function") return col.csv(row);
  if (col.accessorFn) return col.accessorFn(row);
  if (col.accessorKey) return col.accessorKey.split(".").reduce((o, k) => (o == null ? o : o[k]), row);
  return "";
}

/**
 * Server-driven data table.
 *
 *   const table = useUrlTableState({ filters: ["status"], defaults: { limit: 20 } });
 *   const q = useQuery({ queryKey: keys.orders.list(table.query), queryFn: () => api.listOrders(table.query), ...listQueryOptions });
 *
 *   <DataTable
 *     columns={[
 *       { id: "number", header: "Order", accessorKey: "orderNumber", sortKey: "orderNumber", primary: true },
 *       { id: "total", header: "Total", align: "right", cell: (row) => <Money value={row.grandTotal} />, csv: (row) => row.grandTotal },
 *       { id: "status", header: "Status", cell: (row) => <StatusPill status={row.status} />, mobile: "meta" },
 *     ]}
 *     data={q.data?.data} meta={q.data?.meta} table={table}
 *     loading={q.isPending} fetching={q.isFetching} error={q.error} onRetry={q.refetch}
 *     rowHref={(row) => `/tenant/orders/${row._id}`}
 *     selectable bulkActions={(rows, clear) => <Button size="sm" onClick={…}>Export</Button>}
 *     emptyState={<EmptyState title="No orders" />} exportFilename="orders" storageKey="tenant-orders" />
 *
 * Column: { id, header, accessorKey? | accessorFn?, cell?: (row) => node, sortKey?, align?: "left"|"right"|"center",
 *           width?, hideable? (default true), defaultHidden?, primary? (row link + mobile title),
 *           mobile?: "title" | "subtitle" | "meta" | "hidden", csv?: (row) => value, className? }
 * Rows are reachable by keyboard: the primary cell renders a real <Link> stretched over the row.
 * Other interactive cells must use `stopPropagation`-free controls; they sit above the link (z-index).
 */
export function DataTable({
  columns = [],
  data,
  meta,
  table: urlTable,
  loading = false,
  fetching = false,
  error,
  onRetry,
  getRowId = (row) => String(row._id ?? row.id),
  rowHref,
  onRowClick,
  selectable = false,
  bulkActions,
  emptyState,
  exportFilename,
  storageKey,
  pagination = true,
  toolbar,
  caption,
  className,
  skeletonRows,
}) {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [density, setDensity] = useState(() => readPref(storageKey && `${storageKey}:density`, "comfortable"));
  const [visibility, setVisibility] = useState(() =>
    readPref(storageKey && `${storageKey}:cols`, Object.fromEntries(columns.filter((c) => c.defaultHidden).map((c) => [c.id, false])))
  );
  const [selection, setSelection] = useState({});

  useEffect(() => writePref(storageKey && `${storageKey}:density`, density), [storageKey, density]);
  useEffect(() => writePref(storageKey && `${storageKey}:cols`, visibility), [storageKey, visibility]);
  // Selection is per page: clear it when the page/filters change.
  const pageKey = JSON.stringify(urlTable?.query || meta || null);
  useEffect(() => setSelection({}), [pageKey]);

  const primaryId = (columns.find((c) => c.primary) || columns[0])?.id;

  const defs = useMemo(() => {
    const list = columns.map((col) => ({
      id: col.id,
      accessorKey: col.accessorKey,
      accessorFn: col.accessorFn,
      header: col.header,
      enableHiding: col.hideable !== false && col.id !== primaryId,
      meta: col,
      cell: (ctx) => {
        const row = ctx.row.original;
        const content = col.cell ? col.cell(row) : (ctx.getValue() ?? <span className="text-fg-subtle">—</span>);
        if (col.id === primaryId && rowHref) {
          const href = rowHref(row);
          if (href) {
            return (
              <Link to={href} className="font-medium text-fg outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring">
                {content}
              </Link>
            );
          }
        }
        return content;
      },
    }));
    if (selectable) {
      list.unshift({
        id: "__select",
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all rows on this page"
            checked={table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(v) => table.toggleAllRowsSelected(Boolean(v))}
          />
        ),
        cell: ({ row }) => <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(Boolean(v))} />,
        meta: { width: 40, className: "relative z-[1]" },
      });
    }
    return list;
  }, [columns, selectable, primaryId, rowHref]);

  const t = useReactTable({
    data: rows,
    columns: defs,
    getRowId,
    state: { columnVisibility: visibility, rowSelection: selection },
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    enableRowSelection: selectable,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const selectedRows = t.getSelectedRowModel().rows.map((r) => r.original);
  const visibleCols = t.getVisibleLeafColumns();
  const cellPad = density === "compact" ? "py-1.5" : "py-2.5";
  const showSkeleton = loading && !rows.length;

  function exportCsv() {
    const cols = columns.filter((c) => visibility[c.id] !== false && c.csv !== false);
    const lines = [cols.map((c) => csvCell(typeof c.header === "string" ? c.header : c.id)).join(",")];
    rows.forEach((row) => lines.push(cols.map((c) => csvCell(plainValue(c, row))).join(",")));
    saveBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${exportFilename || "export"}.csv`);
  }

  function SortHeader({ col, children }) {
    const key = col.sortKey;
    if (!key || !urlTable) return children;
    const active = urlTable.sort === key;
    const Icon = !active ? ChevronsUpDown : urlTable.order === "asc" ? ArrowUp : ArrowDown;
    return (
      <button type="button" onClick={() => urlTable.toggleSort(key)} className={cn("-mx-1 inline-flex items-center gap-1 rounded-xs px-1 hover:text-fg", active && "text-fg")}>
        {children}
        <Icon aria-hidden className={cn("size-3.5", !active && "opacity-50")} />
      </button>
    );
  }

  const ariaSort = (col) => (col.sortKey && urlTable?.sort === col.sortKey ? (urlTable.order === "asc" ? "ascending" : "descending") : undefined);
  const align = (col) => (col?.align === "right" ? "text-right" : col?.align === "center" ? "text-center" : "text-left");
  const mobileCols = columns.filter((c) => visibility[c.id] !== false && c.mobile !== "hidden");
  const titleCol = columns.find((c) => c.mobile === "title") || columns.find((c) => c.id === primaryId);

  return (
    <div className={cn("grid gap-3", className)}>
      {toolbar || exportFilename || storageKey ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          <div className="flex items-center gap-1">
            {exportFilename ? <IconButton icon={Download} label="Download this page as CSV" variant="secondary" size="sm" onClick={exportCsv} disabled={!rows.length} /> : null}
            <DropdownMenu trigger={<IconButton icon={Settings2} label="Table settings" variant="secondary" size="sm" />}>
              <MenuLabel>Density</MenuLabel>
              <MenuRadioGroup
                value={density}
                onValueChange={setDensity}
                options={[
                  { value: "comfortable", label: "Comfortable", icon: Rows3 },
                  { value: "compact", label: "Compact", icon: Rows4 },
                ]}
              />
              <MenuSeparator />
              <MenuLabel>Columns</MenuLabel>
              {t
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <MenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(Boolean(v))}>
                    {typeof c.columnDef.header === "string" ? c.columnDef.header : c.id}
                  </MenuCheckboxItem>
                ))}
            </DropdownMenu>
          </div>
        </div>
      ) : null}

      {selectable && selectedRows.length ? (
        <div role="region" aria-label="Bulk actions" className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-ui-sm text-primary-soft-fg shadow-sm">
          <span className="font-medium">{selectedRows.length} selected</span>
          <span aria-hidden className="h-4 w-px bg-primary/30" />
          <div className="flex flex-wrap items-center gap-2">{bulkActions?.(selectedRows, () => setSelection({}))}</div>
          <Button size="xs" variant="ghost" className="ml-auto" rightIcon={X} onClick={() => setSelection({})}>
            Clear
          </Button>
        </div>
      ) : null}

      <div className={cn("relative overflow-hidden rounded-lg border border-border bg-surface shadow-xs", fetching && !loading && "after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:animate-pulse after:bg-primary")}>
        {error && !rows.length ? (
          <ErrorState error={error} onRetry={onRetry} compact />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden max-h-[calc(100dvh-14rem)] overflow-auto md:block">
              <table className="w-full border-collapse text-ui-sm" aria-busy={loading || fetching || undefined}>
                {caption ? <caption className="sr-only">{caption}</caption> : null}
                <thead className="sticky top-0 z-10 bg-surface-2">
                  {t.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => {
                        const col = h.column.columnDef.meta || {};
                        return (
                          <th
                            key={h.id}
                            scope="col"
                            aria-sort={ariaSort(col)}
                            style={col.width ? { width: col.width } : undefined}
                            className={cn("whitespace-nowrap border-b border-border px-[var(--cell-px)] py-2 text-ui-xs font-medium text-fg-muted", align(col))}
                          >
                            {h.isPlaceholder ? null : <SortHeader col={col}>{flexRender(h.column.columnDef.header, h.getContext())}</SortHeader>}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {showSkeleton
                    ? Array.from({ length: skeletonRows || Math.min(urlTable?.limit || 10, 10) }, (_, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          {visibleCols.map((c) => (
                            <td key={c.id} className={cn("px-[var(--cell-px)]", cellPad)}>
                              <Skeleton className={cn("h-4", c.id === "__select" ? "w-4" : "w-3/4")} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : t.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          data-state={row.getIsSelected() ? "selected" : undefined}
                          onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                          className={cn(
                            "relative border-b border-border transition-colors last:border-0 data-[state=selected]:bg-primary-soft/50",
                            (rowHref || onRowClick) && "cursor-pointer hover:bg-surface-hover"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const col = cell.column.columnDef.meta || {};
                            const isPrimary = cell.column.id === primaryId;
                            return (
                              <td key={cell.id} className={cn("px-[var(--cell-px)] align-middle text-fg", cellPad, align(col), col.align === "right" && "tabular-nums", !isPrimary && rowHref && "[&_a]:relative [&_a]:z-[1] [&_button]:relative [&_button]:z-[1]", col.className)}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {showSkeleton
                ? Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="grid gap-2 p-4">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </li>
                  ))
                : t.getRowModel().rows.map((row) => {
                    const r = row.original;
                    const href = rowHref?.(r);
                    const render = (c) => (c.cell ? c.cell(r) : plainValue(c, r) ?? "—");
                    const others = mobileCols.filter((c) => c !== titleCol);
                    return (
                      <li key={row.id} className={cn("relative flex gap-3 p-4", row.getIsSelected() && "bg-primary-soft/50")}>
                        {selectable ? (
                          <div className="relative z-[1] pt-0.5">
                            <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(Boolean(v))} />
                          </div>
                        ) : null}
                        <div className="grid min-w-0 flex-1 gap-1.5">
                          <div className="text-ui font-medium text-fg">
                            {href ? (
                              <Link to={href} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-ring">
                                {render(titleCol)}
                              </Link>
                            ) : (
                              render(titleCol)
                            )}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-ui-sm [&_a]:relative [&_a]:z-[1] [&_button]:relative [&_button]:z-[1]">
                            {others.map((c) => (
                              <div key={c.id} className={cn("min-w-0", c.mobile === "subtitle" && "col-span-2")}>
                                {c.mobile !== "subtitle" ? <dt className="text-ui-2xs text-fg-subtle">{typeof c.header === "string" ? c.header : ""}</dt> : null}
                                <dd className={cn("truncate text-fg", c.align === "right" && "tabular-nums")}>{render(c)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </li>
                    );
                  })}
            </ul>

            {!loading && !rows.length ? emptyState || <EmptyState title="No results" description={urlTable?.activeCount ? "Try changing or clearing the filters." : undefined} action={urlTable?.activeCount ? <Button size="sm" onClick={urlTable.reset}>Clear filters</Button> : null} /> : null}
          </>
        )}
      </div>

      {pagination && (meta || urlTable) && (rows.length || (meta?.total ?? 0) > 0) ? (
        <Pagination meta={meta} page={urlTable?.page} limit={urlTable?.limit} onPageChange={urlTable?.setPage} onLimitChange={urlTable?.setLimit} />
      ) : null}
    </div>
  );
}

export default DataTable;
