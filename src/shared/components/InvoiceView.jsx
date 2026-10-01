import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { formatDate, inr2, paymentLabel } from "../lib/format.js";

function Party({ title, party }) {
  if (!party) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 font-semibold">{party.legalName || party.company || party.name || "—"}</p>
      {party.company && party.name && party.company !== party.name ? <p className="text-sm">{party.name}</p> : null}
      {party.address ? <p className="text-sm text-slate-600">{party.address}</p> : null}
      {party.state ? <p className="text-sm text-slate-600">State: {party.state}</p> : null}
      <p className="text-sm">GSTIN: <span className="font-semibold">{party.gstin || "Unregistered"}</span></p>
      {party.phone ? <p className="text-sm text-slate-600">{party.phone}</p> : null}
    </div>
  );
}

export function InvoiceDocument({ invoice }) {
  const inter = invoice.supplyType === "inter";
  const t = invoice.totals || {};
  return (
    <article className="invoice-sheet mx-auto max-w-4xl bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black">Tax Invoice</h1>
          {invoice.status === "cancelled" ? (
            <p className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">CANCELLED</p>
          ) : null}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-sm">
          <dt className="text-slate-500">Invoice no.</dt>
          <dd className="font-semibold">{invoice.invoiceNumber}</dd>
          <dt className="text-slate-500">Invoice date</dt>
          <dd>{formatDate(invoice.issuedAt)}</dd>
          <dt className="text-slate-500">Order no.</dt>
          <dd>{invoice.orderNumber}</dd>
          {invoice.poNumber ? (
            <>
              <dt className="text-slate-500">PO no.</dt>
              <dd>{invoice.poNumber}</dd>
            </>
          ) : null}
          <dt className="text-slate-500">Payment</dt>
          <dd>{paymentLabel(invoice.paymentMethod)}</dd>
          <dt className="text-slate-500">Place of supply</dt>
          <dd>{invoice.placeOfSupply || "—"}</dd>
        </dl>
      </header>

      <section className="grid gap-6 border-b border-slate-200 py-4 sm:grid-cols-3">
        <Party title="Sold by" party={invoice.seller} />
        <Party title="Bill to" party={invoice.buyer} />
        <Party title="Ship to" party={invoice.shipTo} />
      </section>

      <div className="overflow-x-auto py-4">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-300 text-slate-500">
            <tr>
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">HSN/SAC</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Rate (incl.)</th>
              <th className="py-2 pr-2 text-right">Discount</th>
              <th className="py-2 pr-2 text-right">Taxable</th>
              <th className="py-2 pr-2 text-right">GST %</th>
              {inter ? (
                <th className="py-2 pr-2 text-right">IGST</th>
              ) : (
                <>
                  <th className="py-2 pr-2 text-right">CGST</th>
                  <th className="py-2 pr-2 text-right">SGST</th>
                </>
              )}
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((line, idx) => (
              <tr key={`${line.sku || line.description}-${idx}`} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-2">{idx + 1}</td>
                <td className="py-2 pr-2">
                  <span className="font-semibold">{line.description}</span>
                  {line.sku ? <span className="block text-slate-500">{line.sku}</span> : null}
                </td>
                <td className="py-2 pr-2">{line.hsn || "—"}</td>
                <td className="py-2 pr-2 text-right">{line.qty}</td>
                <td className="py-2 pr-2 text-right">{inr2(line.unitPrice)}</td>
                <td className="py-2 pr-2 text-right">{line.discount ? `−${inr2(line.discount)}` : "—"}</td>
                <td className="py-2 pr-2 text-right">{inr2(line.taxableValue)}</td>
                <td className="py-2 pr-2 text-right">{line.taxRate}%</td>
                {inter ? (
                  <td className="py-2 pr-2 text-right">{inr2(line.igst)}</td>
                ) : (
                  <>
                    <td className="py-2 pr-2 text-right">{inr2(line.cgst)}</td>
                    <td className="py-2 pr-2 text-right">{inr2(line.sgst)}</td>
                  </>
                )}
                <td className="py-2 text-right font-semibold">{inr2(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex justify-end">
        <dl className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-y-1 text-sm">
          <dt className="text-slate-500">Gross amount</dt>
          <dd className="text-right">{inr2(t.grossAmount)}</dd>
          {t.discount ? (
            <>
              <dt className="text-slate-500">Discount{invoice.couponCode ? ` (${invoice.couponCode})` : ""}</dt>
              <dd className="text-right">−{inr2(t.discount)}</dd>
            </>
          ) : null}
          <dt className="text-slate-500">Taxable value</dt>
          <dd className="text-right">{inr2(t.taxableValue)}</dd>
          {inter ? (
            <>
              <dt className="text-slate-500">IGST</dt>
              <dd className="text-right">{inr2(t.igst)}</dd>
            </>
          ) : (
            <>
              <dt className="text-slate-500">CGST</dt>
              <dd className="text-right">{inr2(t.cgst)}</dd>
              <dt className="text-slate-500">SGST</dt>
              <dd className="text-right">{inr2(t.sgst)}</dd>
            </>
          )}
          <dt className="border-t border-slate-300 pt-1 font-bold">Invoice total</dt>
          <dd className="border-t border-slate-300 pt-1 text-right font-bold">{inr2(t.grandTotal)}</dd>
        </dl>
      </section>

      <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
        Prices include GST. {inter ? "Inter-state supply: IGST applies." : "Intra-state supply: CGST and SGST apply."}{" "}
        This is a computer-generated invoice and does not need a signature.
      </footer>
    </article>
  );
}

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setError("");
    api
      .getInvoice(id)
      .then((data) => alive && setInvoice(data))
      .catch((err) => alive && setError(err.message || "Could not load invoice"));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 print:hidden">
        <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
          ← Back
        </button>
        {invoice ? (
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-msr-primary px-4 py-2 text-sm font-bold text-white">
            Print / Save PDF
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mx-auto max-w-4xl rounded-xl bg-white p-6 text-center text-sm text-slate-600">{error}</p>
      ) : invoice ? (
        <InvoiceDocument invoice={invoice} />
      ) : (
        <p className="mx-auto max-w-4xl p-6 text-center text-sm text-slate-500">Loading invoice…</p>
      )}
    </div>
  );
}
