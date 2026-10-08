import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileSearch, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { api, saveBlob } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { Alert, Badge, Button, CSV_TYPES, Card, CardBody, CardHeader, Code, ConfirmDialog, Field, FileDropzone, MB, PageHeader, RadioGroup, StatCard, UnsavedChangesDialog, toast } from "../../shared/ui/index.js";

/** Columns accepted by POST /products/bulk-upload (catalog/service.js PRODUCT_CSV_COLUMNS). */
const COLUMNS = [
  ["sku", "Required. Existing SKU → the product is updated."],
  ["name", "Required."],
  ["sellingPrice", "Required. Rupees incl. GST, e.g. 425 or 425.50."],
  ["listPrice", "MRP. Defaults to the selling price."],
  ["status", "draft | pending_review | scheduled | published (published/scheduled need products.publish)."],
  ["scheduledAt", "ISO date-time in the future, required for status=scheduled."],
  ["publish", "true/false. true publishes the row (needs products.publish)."],
  ["packSize", "e.g. 10 kg."],
  ["availableQty", "Sets the absolute sellable stock of the product’s main variant (with warehouseId: in that warehouse; else the default warehouse). Not added to existing stock. Empty keeps stock untouched."],
  ["warehouseId", "Warehouse id for availableQty."],
  ["categoryId", "Category id."],
  ["brandId", "Brand id."],
  ["hsn", "HSN code."],
  ["tags", "Separated by ; (semicolon)."],
  ["description", "Plain text; quote it if it contains commas."],
  ["bulkEligible", "true/false."],
  ["moq / maxQty / packMultiple / caseQty / leadTimeDays", "Whole numbers (wholesale rules)."],
  ["tierPrices", "Quantity slabs: 10-49@95;50@90 (min-max@unitPrice)."],
];
const HEADER = ["sku", "name", "slug", "status", "sellingPrice", "listPrice", "packSize", "availableQty", "warehouseId", "categoryId", "brandId", "hsn", "tags", "description", "publish", "bulkEligible", "moq", "maxQty", "packMultiple", "caseQty", "leadTimeDays", "tierPrices"];

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadTemplate() {
  const example = { sku: "SAMPLE-SKU-1", name: "Sample product", status: "draft", sellingPrice: "99", listPrice: "120", packSize: "1 pc", hsn: "1006", tags: "new;sample", description: "Short description", publish: "false", bulkEligible: "false", moq: "1", packMultiple: "1", caseQty: "1", leadTimeDays: "0" };
  const lines = [HEADER.join(","), HEADER.map((h) => csvCell(example[h] || "")).join(",")];
  saveBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), "products-import-template.csv");
}

function countRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => l.trim()).length;
}

const STOCK_MODES = [
  { value: "set", label: "Set stock from the file", description: "availableQty replaces the current sellable stock (reserved and committed units are untouched)." },
  { value: "skip", label: "Ignore the stock column", description: "Only product details are imported; stock stays as it is." },
];

function ErrorList({ errors }) {
  const entries = Object.entries(errors || {});
  if (!entries.length) return <span className="text-fg-subtle">—</span>;
  return (
    <ul className="grid gap-0.5">
      {entries.map(([field, msg]) => (
        <li key={field}>
          {field !== "_" && field !== "row" ? <Code>{field}</Code> : null} <span className="text-danger-fg">{msg}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ProductImport() {
  const can = useCan();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState(null);
  const [mode, setMode] = useState("set");
  const [busy, setBusy] = useState(null); // "check" | "import"
  const [preview, setPreview] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const blocker = useUnsavedChangesGuard(Boolean(file && preview && !result) || busy === "import");

  function reset() {
    setFile(null);
    setRows(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowAll(false);
  }

  async function pick(files) {
    const f = files[0];
    setResult(null);
    setPreview(null);
    setError(null);
    setFile(f);
    try {
      setRows(countRows(await f.text()));
    } catch {
      setRows(null);
    }
  }

  async function check(nextMode = mode) {
    if (!file) return;
    setBusy("check");
    setError(null);
    setResult(null);
    try {
      setPreview(await api.importProductsCsv(file, { dryRun: true, availableQtyMode: nextMode }));
    } catch (err) {
      setPreview(null);
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!file) return;
    setBusy("import");
    setError(null);
    try {
      const res = await api.importProductsCsv(file, { availableQtyMode: mode });
      setResult(res);
      setPreview(null);
      const n = (res.created?.length || 0) + (res.updated?.length || 0);
      if (n) toast.success(`${n} product${n === 1 ? "" : "s"} imported`, { description: res.errors?.length ? `${res.errors.length} row(s) failed — see the report.` : undefined });
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.products.all }), queryClient.invalidateQueries({ queryKey: keys.inventory.all })]);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setBusy(null);
    }
  }

  function downloadErrors() {
    const lines = [["row", "sku", "code", "error"].join(",")];
    (result?.errors || []).forEach((e) => lines.push([e.index + 2, e.sku, e.code, e.message].map(csvCell).join(",")));
    saveBlob(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `import-errors-${file?.name || "products"}.csv`);
  }

  async function exportCatalog() {
    setExporting(true);
    try {
      await api.exportProductsCsv();
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const errors = result?.errors || [];
  const summary = preview?.summary;
  const previewRows = (preview?.rows || []).filter((r) => showAll || !r.ok);
  const stockRows = (preview?.rows || []).filter((r) => r.ok && r.stock).length;
  return (
    <>
      <PageHeader
        title="Import products"
        description="Create or update many products at once from a CSV file (max 1,000 rows, 2 MB). Check the file first, then import."
        back="/tenant/products"
        breadcrumbs={[{ label: "Products", to: "/tenant/products" }, { label: "Import" }]}
        secondaryActions={
          <>
            <Button size="sm" leftIcon={FileSpreadsheet} onClick={downloadTemplate}>
              Template
            </Button>
            <Button size="sm" leftIcon={Download} loading={exporting} onClick={exportCatalog}>
              Export current catalog
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card>
            <CardHeader title="1. Choose your file" description="The server parses and validates every row. Nothing is saved until you import." />
            <CardBody className="grid gap-4">
              <FileDropzone accept={CSV_TYPES} maxSize={2 * MB} onFiles={pick} label="Drop a .csv file or click to choose" hint="UTF-8 CSV with a header row · up to 2 MB" disabled={Boolean(busy)} />
              {file ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-ui-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-fg">{file.name}</span>
                    <span className="text-fg-muted"> · {rows != null ? `${rows} data row${rows === 1 ? "" : "s"}` : "rows unknown"}</span>
                  </span>
                  <Button size="sm" variant={preview ? "secondary" : "primary"} leftIcon={FileSearch} loading={busy === "check"} onClick={() => check()} disabled={rows === 0 || rows > 1000 || busy === "import"}>
                    {preview ? "Check again" : "Check file"}
                  </Button>
                </div>
              ) : null}
              {rows > 1000 ? <Alert tone="danger">This file has {rows} rows; split it into files of at most 1,000 rows.</Alert> : null}
              <Field label="Stock column (availableQty)">
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => {
                    setMode(v);
                    if (preview) check(v);
                  }}
                  options={STOCK_MODES}
                />
              </Field>
              {!can("products.publish") ? <Alert tone="info">Rows asking to publish or schedule will be rejected because you don’t hold products.publish.</Alert> : null}
              {error ? (
                <Alert tone="danger" title="The server couldn’t process this file">
                  {error.message}
                  {error.requestId ? <span className="block font-mono text-ui-2xs opacity-80">Reference: {error.requestId}</span> : null}
                </Alert>
              ) : null}
            </CardBody>
          </Card>

          {preview ? (
            <Card>
              <CardHeader
                title="2. Preview"
                description={`Dry run · nothing saved yet · stock ${preview.availableQtyMode === "skip" ? "ignored" : "set from the file"}`}
                actions={
                  <Button size="sm" variant="primary" leftIcon={Upload} disabled={!summary?.valid || busy === "check"} loading={busy === "import"} onClick={() => setConfirming(true)}>
                    Import {summary?.valid || 0} valid row{summary?.valid === 1 ? "" : "s"}
                  </Button>
                }
              />
              <CardBody className="grid gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="New products" value={summary?.create ?? 0} />
                  <StatCard label="Updates" value={summary?.update ?? 0} hint="Existing SKUs" />
                  <StatCard label="Valid rows" value={summary?.valid ?? 0} hint={`of ${summary?.total ?? 0}`} />
                  <StatCard label="Rows with errors" value={summary?.invalid ?? 0} hint={summary?.invalid ? "Skipped on import" : "None"} />
                </div>
                {summary?.invalid ? (
                  <Alert tone="warning">{summary.invalid} row(s) have errors and will be skipped. Fix them in your spreadsheet and check again, or import the valid rows now.</Alert>
                ) : (
                  <Alert tone="success" icon={CheckCircle2}>
                    Every row is valid.
                  </Alert>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-ui-sm font-medium text-fg">{showAll ? "All rows" : "Rows with errors"}</p>
                  <Button size="xs" variant="ghost" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Only rows with errors" : "Show all rows"}
                  </Button>
                </div>
                {previewRows.length ? (
                  <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
                    <table className="w-full min-w-[36rem] text-ui-sm">
                      <caption className="sr-only">Dry-run result per row</caption>
                      <thead className="sticky top-0 bg-surface-2 text-ui-xs text-fg-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left font-medium">Row</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium">SKU</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium">Action</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Stock</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium">Problems</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r) => (
                          <tr key={r.index} className="border-t border-border align-top">
                            <td className="px-3 py-2 tabular-nums text-fg-muted">{r.index + 2}</td>
                            <td className="px-3 py-2">{r.sku ? <Code>{r.sku}</Code> : <span className="text-fg-subtle">—</span>}</td>
                            <td className="px-3 py-2">
                              {!r.ok ? <Badge tone="danger">Skipped</Badge> : r.action === "update" ? <Badge tone="info">Update</Badge> : <Badge tone="success">Create</Badge>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.stock ? `= ${Number(r.stock.qty).toLocaleString("en-IN")}` : <span className="text-fg-subtle">—</span>}</td>
                            <td className="px-3 py-2">
                              <ErrorList errors={r.errors} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-ui-sm text-fg-muted">No rows with errors.</p>
                )}
                <p className="text-ui-xs text-fg-subtle">Row numbers count the header as row 1, matching your spreadsheet.</p>
              </CardBody>
            </Card>
          ) : null}

          {result ? (
            <Card>
              <CardHeader
                title="3. Results"
                actions={
                  <>
                    {errors.length ? (
                      <Button size="sm" leftIcon={Download} onClick={downloadErrors}>
                        Error report
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" leftIcon={RotateCcw} onClick={reset}>
                      Import another file
                    </Button>
                  </>
                }
              />
              <CardBody className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Created" value={result.created?.length ?? 0} />
                  <StatCard label="Updated" value={result.updated?.length ?? 0} />
                  <StatCard label="Failed rows" value={errors.length} />
                </div>
                {errors.length ? (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-ui-sm">
                      <caption className="sr-only">Rows that failed</caption>
                      <thead className="bg-surface-2 text-ui-xs text-fg-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left font-medium">Row</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium">SKU</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.map((e) => (
                          <tr key={`${e.index}-${e.sku}`} className="border-t border-border align-top">
                            <td className="px-3 py-2 tabular-nums text-fg-muted">{e.index + 2}</td>
                            <td className="px-3 py-2">{e.sku ? <Code>{e.sku}</Code> : <span className="text-fg-subtle">—</span>}</td>
                            <td className="px-3 py-2">{e.fields && Object.keys(e.fields).length ? <ErrorList errors={e.fields} /> : <span className="text-danger-fg">{e.message}</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Alert tone="success" icon={CheckCircle2}>
                    Every row was imported{result.availableQtyMode === "skip" ? " (stock column ignored)" : ""}.
                  </Alert>
                )}
                {(result.created?.length || 0) + (result.updated?.length || 0) > 0 ? (
                  <Button size="sm" className="justify-self-start" to="/tenant/products">
                    View products
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <Card className="content-start">
          <CardHeader title="Columns" description="Header names are case-sensitive. Unknown columns are ignored." />
          <CardBody>
            <dl className="grid gap-2.5 text-ui-sm">
              {COLUMNS.map(([name, help]) => (
                <div key={name}>
                  <dt className="font-mono text-ui-xs font-medium text-fg">{name}</dt>
                  <dd className="text-fg-muted">{help}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Import ${summary?.valid || 0} product row${summary?.valid === 1 ? "" : "s"}?`}
        description={`${summary?.create || 0} new, ${summary?.update || 0} updated${summary?.invalid ? `; ${summary.invalid} row(s) with errors are skipped` : ""}. ${
          mode === "set" && stockRows ? `Stock is SET (not added) for ${stockRows} row(s).` : "Stock is not changed."
        } Saved changes can’t be undone in bulk.`}
        confirmLabel="Import"
        onConfirm={commit}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
