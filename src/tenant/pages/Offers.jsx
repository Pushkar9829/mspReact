import { useState } from "react";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { prettyStatus, rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { COUPON_STATUSES, OFFER_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

function isoInput(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 16);
}

export default function Offers() {
  const offersQuery = useListQuery();
  const couponsQuery = useListQuery();
  const offers = useApi(() => api.listOffers(offersQuery.query), [offersQuery.query]);
  const coupons = useApi(() => api.listCoupons(couponsQuery.query), [couponsQuery.query]);
  const offerRows = rowsOf(offers.data);
  const couponRows = rowsOf(coupons.data);
  const [open, setOpen] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function createOffer(e) {
    e.preventDefault();
    setBusy("offer");
    setMsg("");
    const form = new FormData(e.currentTarget);
    try {
      await api.createOffer({
        name: String(form.get("name") || "").trim(),
        type: String(form.get("type") || "percent"),
        value: Number(form.get("value") || 0),
        startsAt: form.get("startsAt"),
        endsAt: form.get("endsAt"),
        status: "draft",
      });
      setOpen("");
      offers.reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function createCoupon(e) {
    e.preventDefault();
    setBusy("coupon");
    setMsg("");
    const form = new FormData(e.currentTarget);
    try {
      await api.createCoupon({
        code: String(form.get("code") || "").trim(),
        name: String(form.get("name") || "").trim(),
        type: String(form.get("type") || "percent"),
        value: Number(form.get("value") || 0),
        minCartValue: Number(form.get("minCartValue") || 0),
      });
      setOpen("");
      coupons.reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function approve(id) {
    setBusy(id);
    setMsg("");
    try {
      await api.approveOffer(id);
      offers.reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function disable(id) {
    setBusy(id);
    setMsg("");
    try {
      await api.disableCoupon(id);
      coupons.reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Offers</h1>
          <p className="mt-1 text-sm text-msr-muted">Catalog promotions and checkout coupons.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen("offer")} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold">
            New offer
          </button>
          <button type="button" onClick={() => setOpen("coupon")} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
            New coupon
          </button>
        </div>
      </div>
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-msr-muted">Catalog offers</h2>
      <PanelToolbar
        search={offersQuery.q}
        onSearch={offersQuery.setQ}
        searchPlaceholder="Offer name"
        onReset={offersQuery.reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: offersQuery.filters.status || "",
            onChange: (value) => offersQuery.setFilter("status", value),
            options: statusOptions(OFFER_STATUSES),
          },
        ]}
      />
      <PanelState loading={offers.loading && !offers.data} error={offers.error} empty={!offerRows.length} emptyText="No offers match these filters.">
        <PanelTable
          rows={offerRows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "type", label: "Type", render: (row) => prettyStatus(row.type) },
            { key: "value", label: "Value", render: (row) => (row.type === "percent" ? `${row.value}%` : inr(row.value)) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            {
              key: "actions",
              label: "",
              render: (row) =>
                row.status === "draft" || row.status === "pending_approval" ? (
                  <ActionBtn disabled={busy === rowId(row)} onClick={() => approve(rowId(row))}>
                    Activate
                  </ActionBtn>
                ) : null,
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(offers.data)} page={offersQuery.page} onPage={offersQuery.setPage} />

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-msr-muted">Coupons</h2>
      <PanelToolbar
        search={couponsQuery.q}
        onSearch={couponsQuery.setQ}
        searchPlaceholder="Code or name"
        onReset={couponsQuery.reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: couponsQuery.filters.status || "",
            onChange: (value) => couponsQuery.setFilter("status", value),
            options: statusOptions(COUPON_STATUSES),
          },
        ]}
      />
      <PanelState loading={coupons.loading && !coupons.data} error={coupons.error} empty={!couponRows.length} emptyText="No coupons match these filters.">
        <PanelTable
          rows={couponRows}
          rowKey={rowId}
          columns={[
            { key: "code", label: "Code", render: (row) => <span className="font-semibold">{row.code}</span> },
            { key: "name", label: "Name" },
            { key: "value", label: "Value", render: (row) => (row.type === "percent" ? `${row.value}%` : inr(row.value)) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            {
              key: "actions",
              label: "",
              render: (row) =>
                row.status !== "disabled" ? (
                  <ActionBtn danger disabled={busy === rowId(row)} onClick={() => disable(rowId(row))}>
                    Disable
                  </ActionBtn>
                ) : null,
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(coupons.data)} page={couponsQuery.page} onPage={couponsQuery.setPage} />

      {open === "offer" ? (
        <PanelModal title="Create offer" onClose={() => setOpen("")}>
          <form className="grid gap-3" onSubmit={createOffer}>
            <input name="name" required placeholder="Offer name" className={FIELD} />
            <select name="type" className={FIELD} defaultValue="percent">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
              <option value="flash">Flash</option>
            </select>
            <input name="value" type="number" min="0" required placeholder="Value" className={FIELD} />
            <label className="grid gap-1 text-xs font-semibold text-msr-muted">
              Starts
              <input name="startsAt" type="datetime-local" required defaultValue={isoInput(0)} className={FIELD} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-msr-muted">
              Ends
              <input name="endsAt" type="datetime-local" required defaultValue={isoInput(7)} className={FIELD} />
            </label>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "offer"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "offer" ? "Creating…" : "Create offer"}
            </button>
          </form>
        </PanelModal>
      ) : null}
      {open === "coupon" ? (
        <PanelModal title="Create coupon" onClose={() => setOpen("")}>
          <form className="grid gap-3" onSubmit={createCoupon}>
            <input name="code" required placeholder="CODE" className={FIELD} />
            <input name="name" required placeholder="Coupon name" className={FIELD} />
            <select name="type" className={FIELD} defaultValue="percent">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
            <input name="value" type="number" min="0" required placeholder="Value" className={FIELD} />
            <input name="minCartValue" type="number" min="0" placeholder="Min cart value" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "coupon"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "coupon" ? "Creating…" : "Create coupon"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
