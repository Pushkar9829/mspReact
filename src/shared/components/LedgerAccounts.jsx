import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CircleDollarSign, HandCoins, PiggyBank, Plus, Scale, Wallet } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useUrlTableState } from "../hooks/useUrlTableState.js";
import { useApiMutation } from "../hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard.js";
import { useCan } from "../context/AuthContext.jsx";
import { inr, parseIstDate } from "../lib/format.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Combobox,
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
  RadioGroup,
  SkeletonText,
  StatCard,
  Switch,
  Textarea,
  UnsavedChangesDialog,
  cn,
  toast,
} from "../ui/index.js";
import { PermissionGate } from "./PermissionGate.jsx";

const VIEW = ["ledger.view", "ledger.manage"];
const KIND_LABEL = { opening: "Credit line opened", order: "Order", reversal: "Order reversal", payment: "Payment received", adjustment: "Adjustment", limit: "Credit limit change" };
const LEDGER_KEYS = [keys.ledger.all, keys.customers.all];
const paise = (v) => (v == null ? null : Number(v) / 100);

/**
 * Credit position of one buyer with the store (API account shape):
 *   outstanding = dues owed now · available = unused credit (0..limit) · advance = overpayment held for the
 *   buyer (spent first on new orders, never extra credit) · spendable = available + advance.
 */
export function LedgerSummary({ account, compact = false }) {
  if (!account) return null;
  const items = [
    { label: "Outstanding", value: account.outstanding, hint: "Owed by the buyer", tone: Number(account.outstanding) > 0 ? "text-warning-fg" : "" },
    { label: "Available credit", value: account.available, hint: `of ${inr(account.creditLimit)} limit` },
    { label: "Advance", value: account.advance, hint: "Overpaid; used first on new orders" },
    { label: "Can spend now", value: account.spendable ?? (Number(account.available) || 0) + (Number(account.advance) || 0), hint: "Available + advance" },
  ];
  if (compact) {
    return (
      <dl className="grid gap-2 text-ui-sm">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-muted">
              {it.label}
              <span className="block text-ui-2xs text-fg-subtle">{it.hint}</span>
            </dt>
            <dd className={cn("font-medium tabular-nums text-fg", it.tone)}>
              <Money value={it.value} />
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-ui-xs text-fg-subtle">
          <span>{account.buyerTerms?.paymentDays ?? 30}-day terms</span>
          <TermsBadges terms={account.buyerTerms} />
        </div>
      </dl>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Outstanding" value={<Money value={account.outstanding} />} icon={CircleDollarSign} hint={Number(account.outstanding) > 0 ? `Due within ${account.buyerTerms?.paymentDays ?? 30} days of each order` : "Nothing owed"} />
      <StatCard label="Available credit" value={<Money value={account.available} />} icon={Wallet} hint={<>of <Money value={account.creditLimit} /> limit</>} />
      <StatCard label="Advance" value={<Money value={account.advance} />} icon={PiggyBank} hint="Overpayment, spent first on new orders" />
      <StatCard label="Can spend now" value={<Money value={account.spendable} />} icon={Scale} hint={<TermsBadges terms={account.buyerTerms} />} />
    </div>
  );
}

function TermsBadges({ terms = {} }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {terms.creditEnabled ? <Badge tone="success">Credit</Badge> : null}
      {terms.purchaseOrderEnabled ? <Badge tone="info">PO</Badge> : null}
      {!terms.creditEnabled && !terms.purchaseOrderEnabled ? <Badge tone="neutral">No terms</Badge> : null}
    </span>
  );
}

function useClient(apiClientProp, tenantId) {
  return useMemo(() => apiClientProp || (tenantId ? defaultApi.withTenant(tenantId) : defaultApi), [apiClientProp, tenantId]);
}

/**
 * Pick a buyer and open their account to give credit / PO terms.
 * Buyers come from the customers report (buyers who ordered from the store; needs reports.view).
 */
export function GrantTermsDialog({ open, onOpenChange, apiClient: apiClientProp, tenantId, scope = "default", onPick }) {
  const apiClient = useClient(apiClientProp, tenantId);
  const can = useCan();
  const [buyer, setBuyer] = useState(null);
  useEffect(() => {
    if (open) setBuyer(null);
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Give credit terms"
      description="Choose a buyer to enable credit or purchase-order checkout with your store."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!buyer}
            onClick={() => {
              onPick?.(buyer);
              onOpenChange(false);
            }}
          >
            Continue to terms
          </Button>
        </>
      }
    >
      {can(["reports.view", "orders.view", "ledger.view"]) ? (
        <Field label="Buyer" required hint="Buyers who ordered from this store or signed up through it.">
          <Combobox
            value={buyer?.userId || ""}
            onChange={(v, o) => setBuyer(v ? { userId: v, buyer: o?.raw } : null)}
            queryKey={["ledger", "buyer-search", scope, tenantId || "own"]}
            search={(q) => apiClient.listCustomersReport({ q, limit: 20 })}
            mapOption={(c) => ({ value: String(c.id || c._id), label: c.name || c.email, description: [c.company, c.email].filter(Boolean).join(" · "), raw: c })}
            placeholder="Search name, email or phone"
          />
        </Field>
      ) : (
        <Alert tone="info">Finding buyers requires reports.view, orders.view or ledger.view. Open the buyer from Customers instead.</Alert>
      )}
    </Dialog>
  );
}

/**
 * Customer credit accounts for a store (seller side).
 *   <LedgerAccounts customerHref={(userId) => `/tenant/customers/${userId}`} />
 *   <LedgerAccounts tenantId={id} onOpenAccount={(row) => openSheet(row.userId)} />      // super admin
 * Props: apiClient · tenantId (X-Tenant-Id + cache scope) · scope · prefix (URL param prefix, default "l_") ·
 *        customerHref(userId) (row link) · onOpenAccount({ userId, buyer, account? }) (row click and the
 *        "Give credit terms" result; without it the dialog navigates to customerHref(userId)) · showGrant (default true).
 * Requires ledger.view or ledger.manage and a tenant context.
 */
export default function LedgerAccounts({ apiClient: apiClientProp, tenantId, customerHref, onOpenAccount, scope: scopeProp = "default", prefix = "l_", showGrant = true }) {
  const can = useCan();
  const navigate = useNavigate();
  const apiClient = useClient(apiClientProp, tenantId);
  const scope = `${scopeProp}:${tenantId || "own"}`;
  const [grantOpen, setGrantOpen] = useState(false);
  const table = useUrlTableState({ defaults: { limit: 20 }, prefix });
  const q = useQuery({ queryKey: keys.ledger.list({ ...table.query, scope }), queryFn: () => apiClient.listLedgerAccounts(table.query), enabled: can(VIEW), ...listQueryOptions });
  if (!can(VIEW)) return <EmptyState icon={BookOpen} title="No access to credit accounts" description="Requires ledger.view." />;
  const uid = (r) => String(r.buyer?._id || r.userId?._id || r.userId);
  const canGrant = showGrant && (onOpenAccount || customerHref);
  function open(target) {
    if (onOpenAccount) onOpenAccount(target);
    else if (customerHref) navigate(customerHref(target.userId));
  }
  return (
    <>
      <DataTable
        storageKey={`ledger-${scopeProp}`}
        exportFilename="credit-accounts"
        caption="Credit accounts"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={customerHref && !onOpenAccount ? (r) => customerHref(uid(r)) : undefined}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Buyer name or email"
            actions={
              canGrant ? (
                <PermissionGate perm="ledger.manage">
                  <Button size="sm" leftIcon={Plus} onClick={() => setGrantOpen(true)}>
                    Give credit terms
                  </Button>
                </PermissionGate>
              ) : null
            }
          />
        }
        columns={[
          {
            id: "buyer",
            header: "Buyer",
            primary: true,
            accessorFn: (r) => r.buyer?.name || r.userId?.name,
            cell: (r) => (
              <span>
                {onOpenAccount ? (
                  <button type="button" className="font-medium text-fg hover:underline" onClick={() => onOpenAccount({ userId: uid(r), buyer: r.buyer || r.userId, account: r })}>
                    {r.buyer?.name || r.userId?.name || "Buyer"}
                  </button>
                ) : (
                  r.buyer?.name || r.userId?.name || "Buyer"
                )}
                <span className="block text-ui-xs font-normal text-fg-subtle">{r.buyer?.email || r.userId?.email}</span>
              </span>
            ),
          },
          { id: "terms", header: "Terms", cell: (r) => <TermsBadges terms={r.buyerTerms} />, csv: (r) => [r.buyerTerms?.creditEnabled && "credit", r.buyerTerms?.purchaseOrderEnabled && "po"].filter(Boolean).join("+"), mobile: "meta" },
          { id: "days", header: "Payment days", align: "right", accessorFn: (r) => r.buyerTerms?.paymentDays, defaultHidden: true },
          { id: "limit", header: "Credit limit", align: "right", cell: (r) => <Money value={r.creditLimit} />, csv: (r) => r.creditLimit },
          {
            id: "outstanding",
            header: "Outstanding",
            align: "right",
            cell: (r) => <Money value={r.outstanding} className={Number(r.outstanding) > 0 ? "font-medium text-warning-fg" : "text-fg-muted"} />,
            csv: (r) => r.outstanding,
            mobile: "meta",
          },
          { id: "available", header: "Available", align: "right", cell: (r) => <Money value={r.available ?? r.balance} />, csv: (r) => r.available ?? r.balance, mobile: "meta" },
          { id: "advance", header: "Advance", align: "right", cell: (r) => (Number(r.advance) > 0 ? <Money value={r.advance} className="text-success-fg" /> : <span className="text-fg-subtle">—</span>), csv: (r) => r.advance },
          { id: "updated", header: "Last activity", cell: (r) => <DateTime value={r.updatedAt} format="date" /> },
        ]}
        emptyState={
          <EmptyState
            icon={Wallet}
            title={table.activeCount ? "No accounts match" : "No credit accounts yet"}
            description="Give a buyer credit or purchase-order terms to open an account."
            compact
            action={canGrant && can("ledger.manage") ? <Button size="sm" onClick={() => setGrantOpen(true)}>Give credit terms</Button> : null}
          />
        }
      />
      <GrantTermsDialog open={grantOpen} onOpenChange={setGrantOpen} apiClient={apiClient} scope={scope} onPick={(b) => open({ userId: b.userId, buyer: b.buyer })} />
    </>
  );
}

/* ------------------------------------------------------------------ one account */

function termsForm(account) {
  const t = account?.buyerTerms || {};
  return {
    creditEnabled: Boolean(t.creditEnabled),
    purchaseOrderEnabled: Boolean(t.purchaseOrderEnabled),
    creditLimit: account?.creditLimit != null ? String(account.creditLimit) : "0",
    paymentDays: t.paymentDays != null ? String(t.paymentDays) : "30",
  };
}

function TermsCard({ userId, account, apiClient, readOnly }) {
  const [form, setForm] = useState(() => termsForm(account));
  const [initial, setInitial] = useState(() => termsForm(account));
  const accountKey = JSON.stringify(termsForm(account));
  useEffect(() => {
    setForm(JSON.parse(accountKey));
    setInitial(JSON.parse(accountKey));
  }, [accountKey]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const limitErr =
    form.creditLimit === "" ? "Required" : !Number.isFinite(Number(form.creditLimit)) || Number(form.creditLimit) < 0 ? "Enter an amount ≥ 0" : Number(form.creditLimit) > 1e9 ? "Too large" : !/^\d*(\.\d{0,2})?$/.test(String(form.creditLimit).trim()) ? "At most 2 decimals" : undefined;
  const daysErr = !/^\d+$/.test(form.paymentDays) || Number(form.paymentDays) > 365 ? "0–365 days" : undefined;
  const save = useApiMutation((body) => apiClient.setLedgerTerms(userId, body), {
    invalidate: LEDGER_KEYS,
    success: "Credit terms saved",
    error: false,
  });
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);

  function submit(e) {
    e.preventDefault();
    if (limitErr || daysErr || !dirty) return;
    const body = {};
    if (form.creditEnabled !== initial.creditEnabled) body.creditEnabled = form.creditEnabled;
    if (form.purchaseOrderEnabled !== initial.purchaseOrderEnabled) body.purchaseOrderEnabled = form.purchaseOrderEnabled;
    if (form.creditLimit !== initial.creditLimit || !account) body.creditLimit = Number(form.creditLimit);
    if (form.paymentDays !== initial.paymentDays) body.paymentDays = Number(form.paymentDays);
    save.mutate(body);
  }

  const limitChanged = account && Number(form.creditLimit) !== Number(initial.creditLimit) && !limitErr;
  return (
    <Card>
      <CardHeader title="Credit & PO terms" description="Which deferred-payment methods this buyer can use at checkout with your store." />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4">
          <Switch label="Credit terms" description="Buyer can place orders on credit up to the limit." checked={form.creditEnabled} disabled={readOnly} onCheckedChange={(v) => setForm({ ...form, creditEnabled: Boolean(v) })} />
          <Switch label="Purchase orders" description="Buyer can check out with a PO number." checked={form.purchaseOrderEnabled} disabled={readOnly} onCheckedChange={(v) => setForm({ ...form, purchaseOrderEnabled: Boolean(v) })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Credit limit" required error={limitErr || save.error?.fieldError?.("creditLimit")} hint="Outstanding dues stay as they are; only the available credit changes.">
              <Input type="number" min={0} step="0.01" prefix="₹" value={form.creditLimit} disabled={readOnly} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
            </Field>
            <Field label="Payment days" required error={daysErr || save.error?.fieldError?.("paymentDays")}>
              <Input type="number" min={0} max={365} step={1} value={form.paymentDays} disabled={readOnly} onChange={(e) => setForm({ ...form, paymentDays: e.target.value })} />
            </Field>
          </div>
          {limitChanged ? (
            <Alert tone="info">
              The credit limit changes from <Money value={initial.creditLimit} /> to <Money value={form.creditLimit} />. Outstanding dues (<Money value={account?.outstanding} />) are unchanged; available credit becomes the new limit minus the dues.
            </Alert>
          ) : null}
          {save.error && !Object.keys(save.error.fields || {}).length ? <Alert tone="danger">{save.error.message}</Alert> : null}
          {!readOnly ? (
            <div className="flex justify-end gap-2">
              {dirty ? (
                <Button onClick={() => setForm(initial)} disabled={save.isPending}>
                  Discard
                </Button>
              ) : null}
              <Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty || Boolean(limitErr || daysErr)}>
                {account ? "Save terms" : "Open credit account"}
              </Button>
            </div>
          ) : (
            <p className="text-ui-xs text-fg-subtle">Changing terms requires ledger.manage.</p>
          )}
        </form>
      </CardBody>
      <UnsavedChangesDialog blocker={blocker} />
    </Card>
  );
}

function PaymentDialog({ userId, open, onOpenChange, apiClient, account }) {
  const [form, setForm] = useState({ amount: "", reference: "", note: "" });
  const [review, setReview] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ amount: "", reference: "", note: "" });
      setReview(false);
    }
  }, [open]);
  const amountErr = form.amount === "" ? undefined : !(Number(form.amount) > 0) ? "Enter an amount above 0" : Number(form.amount) > 1e9 ? "Too large" : !/^\d*(\.\d{0,2})?$/.test(String(form.amount).trim()) ? "At most 2 decimals" : undefined;
  const save = useApiMutation((body) => apiClient.recordLedgerPayment(userId, body), {
    invalidate: LEDGER_KEYS,
    error: false,
    onSuccess: (res) => {
      const p = res?.payment;
      toast.success("Payment recorded", {
        description: p ? `${inr(p.appliedToDues)} settled dues${Number(p.toAdvance) > 0 ? ` · ${inr(p.toAdvance)} held as advance` : ""}` : undefined,
      });
      onOpenChange(false);
    },
  });
  const duplicate = save.error?.code === "DUPLICATE_PAYMENT" || (save.error?.status === 409 && save.error?.fieldError?.("reference"));
  const dirty = Boolean(form.amount || form.reference || form.note);
  const amount = Number(form.amount) || 0;
  const dues = Number(account?.outstanding) || 0;
  const toDues = Math.min(amount, dues);
  const toAdvance = Math.max(0, amount - dues);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      busy={save.isPending}
      title="Record a payment"
      description="Money received from the buyer. It settles outstanding dues first; anything above the dues is held as advance for their next orders."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          {review ? (
            <Button onClick={() => setReview(false)} disabled={save.isPending}>
              Back
            </Button>
          ) : null}
          <Button type="submit" form="ledger-payment" variant="primary" loading={save.isPending} disabled={!form.amount || Boolean(amountErr) || Boolean(duplicate)}>
            {review ? "Confirm payment" : "Review"}
          </Button>
        </>
      }
    >
      <form
        id="ledger-payment"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.amount || amountErr) return;
          if (!review) {
            save.reset();
            return setReview(true);
          }
          save.mutate({ amount: Number(form.amount), ...(form.reference.trim() ? { reference: form.reference.trim() } : {}), ...(form.note.trim() ? { note: form.note.trim() } : {}) });
        }}
      >
        {review ? (
          <Alert tone="warning" title="Check before recording">
            Record a payment of <Money value={form.amount} />
            {form.reference.trim() ? ` (ref ${form.reference.trim()})` : ""}: <Money value={toDues} /> settles dues
            {toAdvance > 0 ? (
              <>
                {" "}and <Money value={toAdvance} /> becomes advance
              </>
            ) : null}
            . Ledger entries are permanent; a mistake needs a correcting adjustment.
          </Alert>
        ) : null}
        <fieldset disabled={review} className="grid gap-4">
        <Field label="Amount" required error={amountErr || save.error?.fieldError?.("amount")}>
          <Input type="number" min={0.01} step="0.01" prefix="₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
        </Field>
        <Field
          label="Reference"
          optional
          hint="UTR, cheque or receipt number. Each reference can be recorded only once for this buyer."
          error={duplicate ? `“${form.reference.trim()}” is already recorded for this buyer. Check the statement — this payment may already be in.` : save.error?.fieldError?.("reference")}
        >
          <Input
            value={form.reference}
            maxLength={120}
            onChange={(e) => {
              setForm({ ...form, reference: e.target.value });
              if (duplicate) save.reset();
            }}
          />
        </Field>
        <Field label="Note" optional error={save.error?.fieldError?.("note")}>
          <Textarea rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        </fieldset>
        {!review && amount > 0 && !amountErr && account ? (
          <p className="text-ui-xs text-fg-muted">
            Outstanding now <Money value={dues} />. This payment settles <Money value={toDues} />
            {toAdvance > 0 ? (
              <>
                {" "}and leaves <Money value={toAdvance} /> as advance
              </>
            ) : null}
            .
          </p>
        ) : null}
        {duplicate ? (
          <Alert tone="danger" title="Duplicate payment reference">
            {save.error.message}. Nothing was recorded. Go back and change the reference if this really is a different payment.
          </Alert>
        ) : save.error && !Object.keys(save.error.fields || {}).length ? (
          <Alert tone="danger">{save.error.message}</Alert>
        ) : null}
      </form>
    </Dialog>
  );
}

function AdjustmentDialog({ userId, open, onOpenChange, apiClient }) {
  const [form, setForm] = useState({ direction: "credit", amount: "", note: "" });
  const [review, setReview] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ direction: "credit", amount: "", note: "" });
      setReview(false);
    }
  }, [open]);
  const amountErr = form.amount === "" ? undefined : !(Number(form.amount) > 0) ? "Enter an amount above 0" : Number(form.amount) > 1e9 ? "Too large" : !/^\d*(\.\d{0,2})?$/.test(String(form.amount).trim()) ? "At most 2 decimals" : undefined;
  const save = useApiMutation((body) => apiClient.adjustLedger(userId, body), {
    invalidate: LEDGER_KEYS,
    success: "Adjustment recorded",
    error: false,
    onSuccess: () => onOpenChange(false),
  });
  const dirty = Boolean(form.amount || form.note);
  const valid = form.amount && !amountErr && form.note.trim();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      busy={save.isPending}
      title="Manual adjustment"
      description="A credit settles dues first (any excess becomes advance). A debit uses the advance first, then the credit line, and can’t exceed what the buyer can spend. Adjustments are permanent ledger entries."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          {review ? (
            <Button onClick={() => setReview(false)} disabled={save.isPending}>
              Back
            </Button>
          ) : null}
          <Button type="submit" form="ledger-adjust" variant={form.direction === "debit" ? "danger" : "primary"} loading={save.isPending} disabled={!valid}>
            {review ? `Confirm ${form.direction}` : "Review"}
          </Button>
        </>
      }
    >
      <form
        id="ledger-adjust"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          if (!review) return setReview(true);
          const amount = Number(form.amount);
          save.mutate({ amount: form.direction === "debit" ? -amount : amount, note: form.note.trim() });
        }}
      >
        {review ? (
          <Alert tone="warning" title="Check before recording">
            {form.direction === "debit" ? "Debit" : "Credit"} <Money value={form.amount} /> — “{form.note.trim()}”. Ledger entries are permanent.
          </Alert>
        ) : null}
        <fieldset disabled={review} className="grid gap-4">
        <RadioGroup
          value={form.direction}
          onValueChange={(direction) => setForm({ ...form, direction })}
          orientation="horizontal"
          aria-label="Adjustment direction"
          options={[
            { value: "credit", label: "Credit", description: "Reduce dues / add advance" },
            { value: "debit", label: "Debit", description: "Charge the buyer (advance first)" },
          ]}
        />
        <Field label="Amount" required error={amountErr || save.error?.fieldError?.("amount")}>
          <Input type="number" min={0.01} step="0.01" prefix="₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Reason" required hint="Shown on the buyer’s statement." error={save.error?.fieldError?.("note")}>
          <Textarea rows={2} maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        </fieldset>
        {save.error && !Object.keys(save.error.fields || {}).length ? (
          <Alert tone="danger" title={save.error.code === "INSUFFICIENT_CREDIT" ? "More than the buyer can spend" : undefined}>
            {save.error.message}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}

function Statement({ userId, apiClient, orderHref, scope }) {
  const [range, setRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const query = {
    page,
    limit: 25,
    ...(range.from ? { from: parseIstDate(range.from)?.toISOString() } : {}),
    ...(range.to ? { to: parseIstDate(range.to, { endOfDay: true })?.toISOString() } : {}),
  };
  const q = useQuery({ queryKey: keys.ledger.custom("statement", scope, String(userId), query), queryFn: () => apiClient.getLedgerStatement(userId, query), ...listQueryOptions });
  const rows = q.data?.data || [];
  return (
    <Card>
      <CardHeader
        title="Statement"
        description="Oldest first. Outstanding and advance are the buyer’s position after each entry."
        actions={
          <DateRangePicker
            from={range.from}
            to={range.to}
            align="end"
            onChange={(r) => {
              setRange(r);
              setPage(1);
            }}
          />
        }
      />
      {q.data ? (
        <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 text-ui-sm sm:grid-cols-4 sm:px-5">
          <div>
            <p className="text-ui-xs text-fg-subtle">Opening outstanding</p>
            <Money value={q.data.openingOutstanding ?? 0} className="font-medium" />
          </div>
          <div>
            <p className="text-ui-xs text-fg-subtle">Opening advance</p>
            <Money value={q.data.openingAdvance ?? 0} className="font-medium" />
          </div>
          <div className="sm:text-right">
            <p className="text-ui-xs text-fg-subtle">Closing outstanding</p>
            <Money value={q.data.closingOutstanding} className="font-medium" />
          </div>
          <div className="sm:text-right">
            <p className="text-ui-xs text-fg-subtle">Closing advance</p>
            <Money value={q.data.closingAdvance} className="font-medium" />
          </div>
        </div>
      ) : null}
      <div className="p-4 sm:p-5">
        <DataTable
          caption="Ledger statement"
          data={rows}
          meta={q.data?.meta}
          loading={q.isPending}
          fetching={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          table={{ page, limit: 25, setPage, query }}
          exportFilename={`statement-${userId}`}
          columns={[
            { id: "date", header: "Date", cell: (r) => <DateTime value={r.createdAt} />, mobile: "meta" },
            {
              id: "entry",
              header: "Entry",
              primary: true,
              cell: (r) => (
                <span>
                  {KIND_LABEL[r.kind] || r.kind}
                  {r.orderId && orderHref ? (
                    <Link to={orderHref(r.orderId)} className="ml-1 text-primary-soft-fg hover:underline">
                      (order)
                    </Link>
                  ) : null}
                  {r.note ? <span className="block text-ui-xs text-fg-muted">{r.note}</span> : null}
                  {r.reference ? <span className="block font-mono text-ui-2xs text-fg-subtle">Ref {r.reference}</span> : null}
                </span>
              ),
              csv: (r) => `${KIND_LABEL[r.kind] || r.kind} ${r.note || ""}`,
            },
            { id: "debit", header: "Debit", align: "right", cell: (r) => (r.type === "debit" ? <Money value={r.amount} className="text-danger-fg" /> : <span className="text-fg-subtle">—</span>), csv: (r) => (r.type === "debit" ? r.amount : "") },
            { id: "credit", header: "Credit", align: "right", cell: (r) => (r.type === "credit" ? <Money value={r.amount} className="text-success-fg" /> : <span className="text-fg-subtle">—</span>), csv: (r) => (r.type === "credit" ? r.amount : "") },
            {
              id: "outstanding",
              header: "Outstanding",
              align: "right",
              cell: (r) => (r.outstandingAfterPaise != null ? <Money value={paise(r.outstandingAfterPaise)} /> : <span className="text-fg-subtle">—</span>),
              csv: (r) => paise(r.outstandingAfterPaise),
              mobile: "meta",
            },
            {
              id: "advance",
              header: "Advance",
              align: "right",
              cell: (r) => (Number(r.advanceAfterPaise) > 0 ? <Money value={paise(r.advanceAfterPaise)} /> : <span className="text-fg-subtle">—</span>),
              csv: (r) => paise(r.advanceAfterPaise),
            },
            { id: "balance", header: "Available after", align: "right", cell: (r) => <Money value={r.balanceAfter} />, csv: (r) => r.balanceAfter, defaultHidden: true },
          ]}
          emptyState={<EmptyState icon={Scale} title="No entries in this period" compact />}
        />
      </div>
    </Card>
  );
}

/**
 * One buyer's account with this store: summary, terms, payments, adjustments, statement.
 *   <LedgerAccountPanel userId={id} orderHref={(orderId) => `/tenant/orders/${orderId}`} />
 * Props: userId · apiClient · tenantId (X-Tenant-Id + cache scope) · scope · orderHref(orderId).
 * Registers one unsaved-changes guard (terms form): don't nest it in another guarded form.
 * A buyer without an account gets the terms form, which opens one.
 */
export function LedgerAccountPanel({ userId, apiClient: apiClientProp, tenantId, scope: scopeProp = "default", orderHref }) {
  const apiClient = useClient(apiClientProp, tenantId);
  const scope = `${scopeProp}:${tenantId || "own"}`;
  const can = useCan();
  const manage = can("ledger.manage");
  const [dialog, setDialog] = useState(null);
  const q = useQuery({ queryKey: keys.ledger.custom("account", scope, String(userId)), queryFn: () => apiClient.getLedgerAccount(userId), enabled: can(VIEW), retry: false });
  if (!can(VIEW)) return <EmptyState icon={BookOpen} title="No access to the ledger" description="Requires ledger.view." compact />;
  if (q.isPending) {
    return (
      <Card padded>
        <SkeletonText lines={5} />
      </Card>
    );
  }
  const missing = q.error?.status === 404;
  if (q.error && !missing) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const account = missing ? null : q.data;

  return (
    <div className="grid gap-6">
      {account ? (
        <LedgerSummary account={account} />
      ) : (
        <Alert tone="info" title="No credit account yet">
          This buyer pays upfront. Enable credit or purchase-order terms below to open an account with your store.
        </Alert>
      )}
      {account ? (
        <div className="flex flex-wrap gap-2">
          <PermissionGate perm="ledger.manage">
            <Button size="sm" variant="primary" leftIcon={HandCoins} onClick={() => setDialog("payment")}>
              Record payment
            </Button>
          </PermissionGate>
          <PermissionGate perm="ledger.manage">
            <Button size="sm" leftIcon={Scale} onClick={() => setDialog("adjust")}>
              Adjustment
            </Button>
          </PermissionGate>
        </div>
      ) : null}
      <TermsCard userId={userId} account={account} apiClient={apiClient} readOnly={!manage} />
      {account ? <Statement userId={userId} apiClient={apiClient} orderHref={orderHref} scope={scope} /> : null}
      <PaymentDialog userId={userId} apiClient={apiClient} account={account} open={dialog === "payment"} onOpenChange={(o) => !o && setDialog(null)} />
      <AdjustmentDialog userId={userId} apiClient={apiClient} open={dialog === "adjust"} onOpenChange={(o) => !o && setDialog(null)} />
    </div>
  );
}
