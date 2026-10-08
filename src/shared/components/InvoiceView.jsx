import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { formatDate, inr, paymentLabel } from "../lib/format.js";
import { Alert, Button, Card, EmptyState, ErrorState, Skeleton, SkeletonText, Tabs, TabPanel, cn, toast } from "../ui/index.js";

/* Print: only the document is printed, always in light colours. */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .msr-print-doc, .msr-print-doc * { visibility: visible !important; }
  .msr-print-doc { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
  @page { margin: 12mm; }
}`;

/** While printing, drop the panel's dark class so the document prints with light tokens. */
function usePrintLight() {
  useEffect(() => {
    let wasDark = false;
    const before = () => {
      wasDark = document.documentElement.classList.contains("dark");
      if (wasDark) document.documentElement.classList.remove("dark");
    };
    const after = () => {
      if (wasDark) document.documentElement.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
}

const money = (v) => inr(v);

function Party({ title, party }) {
  if (!party) return null;
  return (
    <div className="min-w-0">
      <p className="text-ui-2xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</p>
      <p className="mt-1 font-semibold text-fg">{party.legalName || party.company || party.name || "—"}</p>
      {party.company && party.name && party.company !== party.name ? <p className="text-ui-sm">{party.name}</p> : null}
      {party.address ? <p className="text-ui-sm text-fg-muted">{party.address}</p> : null}
      {party.state ? <p className="text-ui-sm text-fg-muted">State: {party.state}</p> : null}
      <p className="text-ui-sm">
        GSTIN: <span className="font-semibold">{party.gstin || "Unregistered"}</span>
      </p>
      {party.phone ? <p className="text-ui-sm text-fg-muted">{party.phone}</p> : null}
      {party.email ? <p className="text-ui-sm text-fg-muted">{party.email}</p> : null}
    </div>
  );
}

/**
 * GST tax invoice or credit note, rendered from the server document (no client maths).
 *   <InvoiceDocument invoice={invoice} />  ·  <InvoiceDocument invoice={creditNote} kind="credit_note" />
 */
export function InvoiceDocument({ invoice, kind = "invoice", className }) {
  if (!invoice) return null;
  const isCredit = kind === "credit_note";
  const inter = invoice.supplyType === "inter";
  const t = invoice.totals || {};
  const number = isCredit ? invoice.creditNoteNumber : invoice.invoiceNumber;
  return (
    <article className={cn("rounded-lg border border-border bg-surface p-5 text-fg shadow-xs sm:p-8", className)} aria-label={`${isCredit ? "Credit note" : "Tax invoice"} ${number}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-title font-bold tracking-tight">{isCredit ? "Credit Note" : "Tax Invoice"}</h2>
          {invoice.status === "cancelled" ? <p className="mt-1 inline-block rounded-sm bg-danger-soft px-2 py-0.5 text-ui-xs font-bold text-danger-fg">CANCELLED</p> : null}
          {invoice.placeOfSupplyUnknown ? <p className="mt-1 text-ui-xs text-warning-fg">Place of supply could not be determined — IGST applied; review required.</p> : null}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-ui-sm">
          <dt className="text-fg-subtle">{isCredit ? "Credit note no." : "Invoice no."}</dt>
          <dd className="font-semibold">{number}</dd>
          <dt className="text-fg-subtle">Date</dt>
          <dd>{formatDate(invoice.issuedAt)}</dd>
          {isCredit ? (
            <>
              <dt className="text-fg-subtle">Against invoice</dt>
              <dd>{invoice.invoiceNumber}</dd>
            </>
          ) : null}
          <dt className="text-fg-subtle">Order no.</dt>
          <dd>{invoice.orderNumber}</dd>
          {invoice.poNumber ? (
            <>
              <dt className="text-fg-subtle">PO no.</dt>
              <dd>{invoice.poNumber}</dd>
            </>
          ) : null}
          {invoice.paymentMethod ? (
            <>
              <dt className="text-fg-subtle">Payment</dt>
              <dd>{paymentLabel(invoice.paymentMethod)}</dd>
            </>
          ) : null}
          <dt className="text-fg-subtle">Place of supply</dt>
          <dd>{invoice.placeOfSupply || "—"}</dd>
        </dl>
      </header>

      <section className="grid gap-6 border-b border-border py-4 sm:grid-cols-3">
        <Party title="Sold by" party={invoice.seller} />
        <Party title="Bill to" party={invoice.buyer} />
        {invoice.shipTo ? <Party title="Ship to" party={invoice.shipTo} /> : null}
      </section>

      {isCredit && invoice.reason ? <p className="border-b border-border py-3 text-ui-sm">Reason: {invoice.reason}</p> : null}

      <div className="overflow-x-auto py-4">
        <table className="w-full min-w-[40rem] text-left text-ui-xs">
          <thead className="border-b border-border-strong text-fg-subtle">
            <tr>
              <th scope="col" className="py-2 pr-2 font-medium">#</th>
              <th scope="col" className="py-2 pr-2 font-medium">Description</th>
              <th scope="col" className="py-2 pr-2 font-medium">HSN/SAC</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">Qty</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">Rate (incl.)</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">Discount</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">Taxable</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">GST %</th>
              {inter ? (
                <th scope="col" className="py-2 pr-2 text-right font-medium">IGST</th>
              ) : (
                <>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">CGST</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">SGST</th>
                </>
              )}
              <th scope="col" className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((line, idx) => (
              <tr key={`${line.sku || line.description}-${idx}`} className="border-b border-border align-top">
                <td className="py-2 pr-2">{idx + 1}</td>
                <td className="py-2 pr-2">
                  <span className="font-semibold">{line.description}</span>
                  {line.sku ? <span className="block text-fg-subtle">{line.sku}</span> : null}
                </td>
                <td className="py-2 pr-2">{line.hsn || "—"}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.qty ?? "—"}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{money(line.unitPrice)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.discount ? `−${money(line.discount)}` : "—"}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{money(line.taxableValue)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{line.taxRate != null ? `${line.taxRate}%` : "—"}</td>
                {inter ? (
                  <td className="py-2 pr-2 text-right tabular-nums">{money(line.igst)}</td>
                ) : (
                  <>
                    <td className="py-2 pr-2 text-right tabular-nums">{money(line.cgst)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{money(line.sgst)}</td>
                  </>
                )}
                <td className="py-2 text-right font-semibold tabular-nums">{money(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex justify-end">
        <dl className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-y-1 text-ui-sm">
          <dt className="text-fg-subtle">Gross amount</dt>
          <dd className="text-right tabular-nums">{money(t.grossAmount)}</dd>
          {t.discount ? (
            <>
              <dt className="text-fg-subtle">Discount{invoice.couponCode ? ` (${invoice.couponCode})` : ""}</dt>
              <dd className="text-right tabular-nums">−{money(t.discount)}</dd>
            </>
          ) : null}
          <dt className="text-fg-subtle">Taxable value</dt>
          <dd className="text-right tabular-nums">{money(t.taxableValue)}</dd>
          {inter ? (
            <>
              <dt className="text-fg-subtle">IGST</dt>
              <dd className="text-right tabular-nums">{money(t.igst)}</dd>
            </>
          ) : (
            <>
              <dt className="text-fg-subtle">CGST</dt>
              <dd className="text-right tabular-nums">{money(t.cgst)}</dd>
              <dt className="text-fg-subtle">SGST</dt>
              <dd className="text-right tabular-nums">{money(t.sgst)}</dd>
            </>
          )}
          <dt className="border-t border-border-strong pt-1 font-bold">{isCredit ? "Credit total" : "Invoice total"}</dt>
          <dd className="border-t border-border-strong pt-1 text-right font-bold tabular-nums">{money(t.grandTotal)}</dd>
        </dl>
      </section>

      <footer className="mt-6 border-t border-border pt-3 text-ui-xs text-fg-subtle">
        Prices include GST. {inter ? "Inter-state supply: IGST applies." : "Intra-state supply: CGST and SGST apply."} This is a computer-generated document and does not need a signature.
      </footer>
    </article>
  );
}

function PdfPreview({ orderId, apiClient }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    setError(null);
    apiClient
      .invoicePdfBlob(orderId)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, apiClient]);
  if (error) return <ErrorState error={error} title="Couldn’t load the PDF" />;
  if (!url) return <Skeleton className="h-[70vh] w-full" />;
  return <iframe title="Invoice PDF" src={url} className="h-[75vh] w-full rounded-lg border border-border bg-surface" />;
}

/**
 * Invoice inside a panel: document view (printable), PDF preview, download, credit notes.
 *   <InvoicePanel orderId={id} apiClient={api} />
 * The page provides the PageHeader (with back navigation); `actions` render the Print/PDF buttons
 * when `showActions` (default true).
 */
export function InvoicePanel({ orderId, apiClient = defaultApi, showActions = true }) {
  usePrintLight();
  const invoice = useQuery({ queryKey: keys.orders.sub(orderId, "invoice"), queryFn: () => apiClient.getInvoice(orderId), retry: false });
  const notes = useQuery({ queryKey: keys.orders.sub(orderId, "credit-notes"), queryFn: () => apiClient.getCreditNotes(orderId), enabled: Boolean(invoice.data) });
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState("document");
  const creditNotes = Array.isArray(notes.data) ? notes.data : [];

  if (invoice.isPending) {
    return (
      <Card padded>
        <SkeletonText lines={8} />
      </Card>
    );
  }
  if (invoice.error) {
    return invoice.error.status === 404 ? (
      <EmptyState icon={FileText} title="No invoice for this order yet" description="The GST invoice is issued when the order is confirmed." />
    ) : (
      <ErrorState error={invoice.error} onRetry={invoice.refetch} />
    );
  }

  async function download() {
    setDownloading(true);
    try {
      await apiClient.downloadInvoicePdf(orderId, `${invoice.data.invoiceNumber || "invoice"}.pdf`);
    } catch (err) {
      toast.error("Couldn't download the invoice PDF", { description: err?.message || undefined });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <style>{PRINT_CSS}</style>
      {showActions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Tabs
            variant="pill"
            value={tab}
            onValueChange={setTab}
            aria-label="Invoice view"
            tabs={[
              { value: "document", label: "Document" },
              { value: "pdf", label: "PDF preview" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" leftIcon={Printer} onClick={() => window.print()} disabled={tab !== "document"}>
              Print
            </Button>
            <Button size="sm" leftIcon={Download} loading={downloading} onClick={download} variant="primary">
              Download PDF
            </Button>
          </div>
        </div>
      ) : null}
      {tab === "pdf" ? (
        <PdfPreview orderId={orderId} apiClient={apiClient} />
      ) : (
        <>
          <InvoiceDocument invoice={invoice.data} className="msr-print-doc" />
          {creditNotes.length ? (
            <section className="grid grid-cols-[minmax(0,1fr)] gap-3 print:hidden" aria-label="Credit notes">
              <h2 className="text-ui-lg font-semibold text-fg">Credit notes</h2>
              {creditNotes.map((cn_) => (
                <InvoiceDocument key={cn_._id} invoice={cn_} kind="credit_note" />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Standalone invoice route (/invoice/:id) for buyers and staff outside the panels. */
export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg px-4 py-6 text-fg print:p-0">
      <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-4">
        <div className="print:hidden">
          <Button leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        {id ? <InvoicePanel orderId={id} /> : <Alert tone="danger">Missing order id.</Alert>}
      </div>
    </div>
  );
}
