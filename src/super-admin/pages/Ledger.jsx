import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, Plus, ReceiptIndianRupee, SlidersHorizontal } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { inr, parseIstDate } from "../../shared/lib/format.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Combobox,
  ConfirmDialog,
  DataTable,
  DateRangePicker,
  DateTime,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  Input,
  Money,
  PageHeader,
  Pagination,
  RelativeTime,
  Sheet,
  Skeleton,
  StatCard,
  Switch,
  Textarea,
  Tooltip,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, TenantRequired, useTenantScope } from "./lib/tenantScope.jsx";
import { numStr, parseNum, refId } from "./lib/catalogShared.jsx";

const KIND_LABELS = { opening: "Opening balance", order: "Order", reversal: "Order reversal", payment: "Payment received", adjustment: "Adjustment", limit: "Credit limit change" };

function TermsBadges({ terms }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {terms?.creditEnabled ? <Badge tone="success">Credit</Badge> : null}
      {terms?.purchaseOrderEnabled ? <Badge tone="info">PO</Badge> : null}
      {!terms?.creditEnabled && !terms?.purchaseOrderEnabled ? <Badge tone="neutral">No terms</Badge> : null}
    </span>
  );
}

export default function Ledger() {
  const can = useCan();
  const scope = useTenantScope();
  const tenantId = scope.tenantId;
  const [params, setParams] = useSearchParams();
  const accountId = params.get("account") || "";
  const table = useUrlTableState({ filters: [], defaults: { limit: 20 }, reserved: ["account", "tenant"] });
  const [setupOpen, setSetupOpen] = useState(false);

  const openAccount = (userId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (userId) next.set("account", userId);
      else next.delete("account");
      return next;
    });

  const q = useQuery({
    queryKey: keys.ledger.list({ ...table.query, tenant: tenantId }),
    queryFn: () => scope.api.listLedgerAccounts(table.query),
    enabled: Boolean(tenantId),
    ...listQueryOptions,
  });

  const canManage = can("ledger.manage");
  const header = (
    <PageHeader
      title="Credit ledger"
      description="Buyer credit and purchase-order accounts for one store: limits, payment terms, statements, payments received and adjustments."
      breadcrumbs={[{ label: "Credit ledger" }]}
      primaryAction={
        tenantId && canManage ? (
          <Button variant="primary" leftIcon={Plus} onClick={() => setSetupOpen(true)}>
            Give a buyer terms
          </Button>
        ) : null
      }
    />
  );

  if (!tenantId) {
    return (
      <>
        {header}
        <TenantRequired value={tenantId} onChange={scope.setTenant} icon={HandCoins} description="Credit accounts are kept per store. Pick the store whose buyer accounts you want to see." />
      </>
    );
  }

  const columns = [
    {
      id: "buyer",
      header: "Buyer",
      primary: true,
      csv: (a) => a.buyer?.name || "",
      cell: (a) => (
        <button type="button" onClick={() => openAccount(refId(a.userId))} className="grid text-left focus-visible:outline-2 focus-visible:outline-ring">
          <span className="font-medium text-fg hover:underline">{a.buyer?.name || "Buyer"}</span>
          <span className="text-ui-xs text-fg-subtle">{a.buyer?.email}</span>
        </button>
      ),
    },
    { id: "phone", header: "Phone", accessorFn: (a) => a.buyer?.phone, defaultHidden: true },
    { id: "terms", header: "Terms", csv: (a) => [a.buyerTerms?.creditEnabled && "credit", a.buyerTerms?.purchaseOrderEnabled && "po"].filter(Boolean).join("+"), cell: (a) => <TermsBadges terms={a.buyerTerms} />, mobile: "meta" },
    { id: "days", header: "Payment days", align: "right", accessorFn: (a) => a.buyerTerms?.paymentDays, mobile: "hidden" },
    { id: "limit", header: "Credit limit", align: "right", csv: (a) => a.creditLimit, cell: (a) => <Money value={a.creditLimit} /> },
    { id: "balance", header: "Available credit", align: "right", csv: (a) => a.balance, cell: (a) => <Money value={a.balance} />, mobile: "meta" },
    { id: "updated", header: "Last activity", csv: (a) => a.updatedAt, cell: (a) => <RelativeTime value={a.updatedAt} />, mobile: "hidden" },
  ];

  return (
    <>
      {header}
      <DataTable
        storageKey="sa-ledger"
        exportFilename="ledger-accounts"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        columns={columns}
        toolbar={
          <FilterBar table={table} searchPlaceholder="Search buyer name or email">
            <TenantFilter value={tenantId} onChange={scope.setTenant} placeholder="Choose tenant" />
          </FilterBar>
        }
        emptyState={
          <EmptyState
            icon={HandCoins}
            title={table.q ? "No accounts match" : "No credit accounts yet"}
            description={table.q ? "Try another name or email." : "Accounts are created when a buyer is given credit or purchase-order terms."}
            action={
              !table.q && canManage ? (
                <Button size="sm" variant="primary" leftIcon={Plus} onClick={() => setSetupOpen(true)}>
                  Give a buyer terms
                </Button>
              ) : null
            }
          />
        }
      />
      <AccountSheet tenantId={tenantId} tenantApi={scope.api} userId={accountId} onClose={() => openAccount("")} canManage={canManage} />
      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} tenantId={tenantId} tenantApi={scope.api} onDone={(uid) => openAccount(uid)} />
    </>
  );
}

/* ------------------------------------------------------------------ terms form */

function termsForm(account) {
  const t = account?.buyerTerms || {};
  return {
    creditEnabled: Boolean(t.creditEnabled),
    purchaseOrderEnabled: Boolean(t.purchaseOrderEnabled),
    creditLimit: numStr(account?.creditLimit ?? 0),
    paymentDays: numStr(t.paymentDays ?? 30),
  };
}

function termsErrors(f) {
  const e = {};
  const limit = parseNum(f.creditLimit);
  const days = parseNum(f.paymentDays);
  if (limit === undefined) e.creditLimit = "Enter a limit (0 for none)";
  else if (!Number.isFinite(limit) || limit < 0 || limit > 1e9) e.creditLimit = "Between 0 and 1,000,000,000";
  if (days === undefined) e.paymentDays = "Enter the payment period in days";
  else if (!Number.isInteger(days) || days < 0 || days > 365) e.paymentDays = "Whole number of days, 0–365";
  return e;
}

function termsBody(f, base) {
  const next = { creditEnabled: f.creditEnabled, purchaseOrderEnabled: f.purchaseOrderEnabled, creditLimit: parseNum(f.creditLimit), paymentDays: parseNum(f.paymentDays) };
  if (!base) return next;
  const prev = { creditEnabled: base.creditEnabled, purchaseOrderEnabled: base.purchaseOrderEnabled, creditLimit: parseNum(base.creditLimit), paymentDays: parseNum(base.paymentDays) };
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== prev[k]));
}

function TermsFields({ form, setForm, errors, apiError, disabled }) {
  const err = (k) => errors[k] || apiError?.fieldError?.(k);
  return (
    <div className="grid gap-4">
      <Switch label="Credit terms" description="Buyer can check out on credit up to the limit." checked={form.creditEnabled} onCheckedChange={(v) => setForm({ ...form, creditEnabled: Boolean(v) })} disabled={disabled} />
      <Switch label="Purchase orders" description="Buyer can check out with a purchase order." checked={form.purchaseOrderEnabled} onCheckedChange={(v) => setForm({ ...form, purchaseOrderEnabled: Boolean(v) })} disabled={disabled} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Credit limit" required error={err("creditLimit")} hint="Changing it moves the available credit by the difference.">
          <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="₹" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} disabled={disabled} />
        </Field>
        <Field label="Payment period" required error={err("paymentDays")}>
          <Input type="number" min={0} max={365} step={1} suffix="days" value={form.paymentDays} onChange={(e) => setForm({ ...form, paymentDays: e.target.value })} disabled={disabled} />
        </Field>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ account sheet */

function AccountSheet({ tenantId, tenantApi, userId, onClose, canManage }) {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: "", to: "" });
  const [action, setAction] = useState(null); // "payment" | "adjustment"
  const open = Boolean(userId);
  const stmtQuery = {
    page,
    limit: 20,
    ...(range.from ? { from: parseIstDate(range.from)?.toISOString() } : {}),
    ...(range.to ? { to: parseIstDate(range.to, { endOfDay: true })?.toISOString() } : {}),
  };
  const q = useQuery({
    queryKey: keys.ledger.sub(`${tenantId}:${userId}`, "statement", stmtQuery),
    queryFn: () => tenantApi.getLedgerStatement(userId, stmtQuery),
    enabled: open,
    ...listQueryOptions,
  });
  const account = q.data?.account;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setPage(1);
          setRange({ from: "", to: "" });
        }
      }}
      size="xl"
      title={account?.buyer?.name || "Credit account"}
      description={account?.buyer?.email}
    >
      {q.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refetch} compact />
      ) : (
        <div className="grid gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Available credit" value={<Money value={account?.balance} />} />
            <StatCard label="Credit limit" value={<Money value={account?.creditLimit} />} />
            <StatCard label="Payment period" value={account?.buyerTerms?.paymentDays != null ? `${account.buyerTerms.paymentDays} days` : "—"} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TermsBadges terms={account?.buyerTerms} />
            <span className="text-ui-xs text-fg-subtle">
              Store: <TenantLink tenant={tenantId} />
            </span>
            {account?.userId ? (
              <Link to={`/super-admin/users/${refId(account.userId)}`} className="text-ui-xs text-primary-soft-fg hover:underline">
                Buyer profile
              </Link>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              {canManage ? (
                <>
                  <Button size="sm" leftIcon={ReceiptIndianRupee} onClick={() => setAction("payment")}>
                    Record payment
                  </Button>
                  <Button size="sm" leftIcon={SlidersHorizontal} onClick={() => setAction("adjustment")}>
                    Adjust balance
                  </Button>
                </>
              ) : (
                <Tooltip content="Requires ledger.manage">
                  <span tabIndex={0} className="inline-flex">
                    <Button size="sm" disabled>
                      Record payment
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {account ? <TermsCard key={`${account._id}:${account.updatedAt}`} account={account} userId={userId} tenantApi={tenantApi} canManage={canManage} /> : null}

          <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-ui font-semibold text-fg">Statement</h3>
                <p className="text-ui-xs text-fg-subtle">
                  Opening <Money value={q.data?.openingBalance} /> · Closing <Money value={q.data?.closingBalance} /> · dates in IST
                </p>
              </div>
              <DateRangePicker
                from={range.from}
                to={range.to}
                onChange={(r) => {
                  setRange({ from: r.from || "", to: r.to || "" });
                  setPage(1);
                }}
              />
            </div>
            <DataTable
              pagination={false}
              data={q.data?.data}
              loading={q.isPending}
              fetching={q.isFetching}
              error={q.error}
              onRetry={q.refetch}
              columns={[
                { id: "date", header: "Date", cell: (e) => <DateTime value={e.createdAt} />, mobile: "meta" },
                {
                  id: "entry",
                  header: "Entry",
                  primary: true,
                  cell: (e) => (
                    <span className="grid">
                      <span className="text-fg">{KIND_LABELS[e.kind] || e.kind}</span>
                      {e.note ? <span className="text-ui-xs text-fg-muted">{e.note}</span> : null}
                      {e.reference ? <span className="font-mono text-ui-2xs text-fg-subtle">Ref: {e.reference}</span> : null}
                      {e.orderId ? (
                        <Link to={`/super-admin/orders/${refId(e.orderId)}`} className="text-ui-xs text-primary-soft-fg hover:underline">
                          View order
                        </Link>
                      ) : null}
                    </span>
                  ),
                },
                { id: "amount", header: "Amount", align: "right", cell: (e) => <Money value={e.type === "debit" ? -e.amount : e.amount} signed tone /> },
                { id: "after", header: "Balance after", align: "right", cell: (e) => <Money value={e.balanceAfter} />, mobile: "meta" },
              ]}
              emptyState={<EmptyState compact title="No entries" description={range.from || range.to ? "Nothing in this date range." : "No ledger activity yet."} />}
            />
            {q.data?.meta && q.data.meta.total > 20 ? <Pagination meta={q.data.meta} page={page} limit={20} onPageChange={setPage} compact /> : null}
          </section>
        </div>
      )}
      {account ? <MoneyActionDialog kind={action} onOpenChange={(o) => !o && setAction(null)} account={account} userId={userId} tenantApi={tenantApi} /> : null}
    </Sheet>
  );
}

function TermsCard({ account, userId, tenantApi, canManage }) {
  const [base] = useState(() => termsForm(account));
  const [form, setForm] = useState(base);
  const [errors, setErrors] = useState({});
  const [confirmLimit, setConfirmLimit] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  const save = useApiMutation((body) => tenantApi.setLedgerTerms(userId, body), {
    invalidate: [keys.ledger.all],
    success: "Terms saved",
    error: false,
  });

  function submit(e) {
    e.preventDefault();
    const next = termsErrors(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = termsBody(form, base);
    if (!Object.keys(body).length) return;
    if (body.creditLimit !== undefined) setConfirmLimit(true);
    else save.mutate(body);
  }

  return (
    <Card>
      <CardHeader title="Terms" description={account.buyerTerms?.updatedAt ? <>Last changed <RelativeTime value={account.buyerTerms.updatedAt} /></> : undefined} />
      <CardBody>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <TermsFields form={form} setForm={setForm} errors={errors} apiError={save.error} disabled={!canManage} />
          {save.error && !Object.keys(save.error.fields || {}).length ? <Alert tone="danger">{save.error.message}</Alert> : null}
          {canManage ? (
            <div className="flex justify-end gap-2">
              <Button onClick={() => setForm(base)} disabled={!dirty || save.isPending}>
                Reset
              </Button>
              <Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty}>
                Save terms
              </Button>
            </div>
          ) : null}
        </form>
      </CardBody>
      <ConfirmDialog
        open={confirmLimit}
        onOpenChange={setConfirmLimit}
        title="Change the credit limit?"
        description={`The limit goes from ${inr(parseNum(base.creditLimit))} to ${inr(parseNum(form.creditLimit))}. A ledger entry is written and the buyer’s available credit moves by the same difference (never below zero).`}
        confirmLabel="Change limit"
        onConfirm={() => save.mutateAsync(termsBody(form, base))}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ payment / adjustment */

function MoneyActionDialog({ kind, onOpenChange, account, userId, tenantApi }) {
  const isPayment = kind === "payment";
  const [form, setForm] = useState({ amount: "", reference: "", note: "" });
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [lastKind, setLastKind] = useState(null);
  if (kind !== lastKind) {
    setLastKind(kind);
    if (kind) {
      setForm({ amount: "", reference: "", note: "" });
      setErrors({});
      setConfirming(false);
    }
  }
  const mutation = useApiMutation(
    (body) => (isPayment ? tenantApi.recordLedgerPayment(userId, body) : tenantApi.adjustLedger(userId, body)),
    { invalidate: [keys.ledger.all], success: isPayment ? "Payment recorded" : "Balance adjusted", error: false, onSuccess: () => onOpenChange(false) }
  );
  const buyer = account?.buyer?.name || "this buyer";
  const amount = parseNum(form.amount);
  const err = (k) => errors[k] || mutation.error?.fieldError?.(k);

  function review(e) {
    e.preventDefault();
    const next = {};
    if (amount === undefined) next.amount = "Enter an amount";
    else if (!Number.isFinite(amount)) next.amount = "Enter a number";
    else if (isPayment && amount <= 0) next.amount = "Must be more than 0";
    else if (!isPayment && amount === 0) next.amount = "Must not be 0";
    else if (Math.abs(amount) > 1e9) next.amount = "Too large";
    if (isPayment && form.reference.length > 120) next.reference = "At most 120 characters";
    if (!isPayment && !form.note.trim()) next.note = "Explain the adjustment (kept in the statement)";
    if (form.note.length > 500) next.note = "At most 500 characters";
    setErrors(next);
    if (!Object.keys(next).length) setConfirming(true);
  }

  const body = isPayment
    ? { amount, ...(form.reference.trim() ? { reference: form.reference.trim() } : {}), ...(form.note.trim() ? { note: form.note.trim() } : {}) }
    : { amount, note: form.note.trim() };

  return (
    <>
      <Dialog
        open={Boolean(kind) && !confirming}
        onOpenChange={onOpenChange}
        dirty={Boolean(form.amount || form.note || form.reference)}
        title={isPayment ? `Record a payment from ${buyer}` : `Adjust ${buyer}’s balance`}
        description={isPayment ? "Money received outside the platform (bank transfer, cheque…). It restores available credit." : "A signed manual correction: positive adds available credit, negative removes it (never below zero)."}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="sa-ledger-money" variant="primary">
              Review
            </Button>
          </>
        }
      >
        <form id="sa-ledger-money" onSubmit={review} noValidate className="grid gap-4">
          <Field label="Amount" required error={err("amount")} hint={isPayment ? undefined : "Use a minus sign to reduce available credit, e.g. -500"}>
            <Input type="number" inputMode="decimal" step="0.01" min={isPayment ? 0.01 : undefined} prefix="₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
          </Field>
          {isPayment ? (
            <Field label="Reference" optional error={err("reference")} hint="UTR, cheque number…">
              <Input value={form.reference} maxLength={120} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
          ) : null}
          <Field label="Note" required={!isPayment} optional={isPayment} error={err("note")} hint={`${form.note.length}/500`}>
            <Textarea rows={3} value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </form>
      </Dialog>
      <ConfirmDialog
        open={Boolean(kind) && confirming}
        onOpenChange={(o) => !o && setConfirming(false)}
        title={isPayment ? `Record ${inr(amount)} received from ${buyer}?` : `${amount > 0 ? "Add" : "Remove"} ${inr(Math.abs(amount || 0))} ${amount > 0 ? "to" : "from"} ${buyer}’s available credit?`}
        description="A ledger entry is written immediately and shows on the buyer’s statement. Entries can’t be edited or deleted; a mistake needs a correcting adjustment."
        confirmLabel={isPayment ? "Record payment" : "Apply adjustment"}
        tone={!isPayment && amount < 0 ? "danger" : "primary"}
        cancelLabel="Back"
        onConfirm={() => mutation.mutateAsync(body)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ set up a new account */

function SetupDialog({ open, onOpenChange, tenantId, tenantApi, onDone }) {
  const [buyer, setBuyer] = useState("");
  const [form, setForm] = useState(() => termsForm(null));
  const [errors, setErrors] = useState({});
  const save = useApiMutation((body) => tenantApi.setLedgerTerms(buyer, body), {
    invalidate: [keys.ledger.all],
    success: "Buyer terms saved",
    error: false,
    onSuccess: () => {
      onOpenChange(false);
      onDone?.(buyer);
      setBuyer("");
      setForm(termsForm(null));
    },
  });

  function submit(e) {
    e.preventDefault();
    const next = termsErrors(form);
    if (!buyer) next.buyer = "Choose a buyer";
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(termsBody(form));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={Boolean(buyer)}
      busy={save.isPending}
      title="Give a buyer credit terms"
      description={
        <>
          Opens (or updates) the buyer’s account with <TenantLink tenant={tenantId} />. A non-zero limit is credited as available balance.
        </>
      }
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="sa-ledger-setup" variant="primary" loading={save.isPending}>
            Save terms
          </Button>
        </>
      }
    >
      <form id="sa-ledger-setup" onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Buyer" required error={errors.buyer}>
          <Combobox
            value={buyer}
            onChange={(v) => setBuyer(v || "")}
            queryKey={keys.users.custom("buyer-search")}
            search={(text) => api.withTenant(null).listUsers({ q: text, role: "buyer", limit: 20 })}
            mapOption={(u) => ({ value: String(u._id || u.id), label: u.name || u.email, description: u.email })}
            placeholder="Search buyers by name or email"
            clearable
          />
        </Field>
        <TermsFields form={form} setForm={setForm} errors={errors} apiError={save.error} />
        {save.error && !Object.keys(save.error.fields || {}).length ? <Alert tone="danger">{save.error.message}</Alert> : null}
      </form>
    </Dialog>
  );
}
