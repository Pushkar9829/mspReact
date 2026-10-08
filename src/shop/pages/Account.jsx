/**
 * /account — buyer dashboard: greeting + business identity (shop name, GSTIN, business type,
 * email verification), set-up prompts (verify email, GSTIN, shop name, first address), KPI tiles
 * from live data (orders in progress, credit available across sellers from GET /ledger/me,
 * wishlist, coupons), recent orders, quick actions (reorder last delivered order, track, addresses,
 * support), credit per seller, default address and notifications. Profile edit with inline field
 * errors (PATCH /auth/me via AuthContext.updateProfile). Dates in IST.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  Heart,
  LifeBuoy,
  MailWarning,
  MapPin,
  Package,
  Pencil,
  ReceiptText,
  RotateCcw,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";
import { Button, Field, Input, Notice, Select, ShopSheet, Skeleton, toast } from "../components/ui/index.js";
import { Money } from "../components/ui/Price.jsx";
import { cn } from "../components/ui/cn.js";
import { reorderResult, useAddresses, useCartCoupons, useLedger, useMyOrders, useReorder, useUnreadCount, useViewer, useWishlist } from "../hooks/index.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { api } from "../../shared/api/index.js";
import { OPEN_STATUSES, OrderStatusPill, OrderThumbs, orderId, sellerName } from "../components/buying/orderUi.jsx";
import { ReorderSheet } from "../components/buying/OrderActions.jsx";
import { AccountSection, CreditMeter, IconCircle } from "../components/account/AccountKit.jsx";
import { formatDate } from "../../shared/lib/format.js";
import { formatPhone, gstinError, normalizePhone } from "../lib/indianAddress.js";
import { BUSINESS_TYPES, businessTypeLabel } from "../lib/business.js";
import { displayName, initialsOf } from "../lib/text.js";

const OPEN_QUERY = OPEN_STATUSES.join(",");
const OPEN_ORDERS_URL = `/account/orders?status=${OPEN_QUERY}`;

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/* ------------------------------------------------------------------ hero */

function Hero({ user, onEdit }) {
  const p = user.profile || {};
  const first = String(displayName(user.name) || "").split(" ")[0] || "there";
  const company = p.company ? displayName(p.company) : "";
  const type = businessTypeLabel(p.businessType || user.businessType);
  return (
    <section aria-labelledby="acct-h" className="overflow-hidden rounded-[1.25rem] bg-shop-navy text-white shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-shop-gold font-display text-shop-lg font-bold text-shop-ink sm:size-16 sm:text-shop-xl">
            {initialsOf(company || user.name)}
          </span>
          <div className="min-w-0">
            <p className="text-shop-sm text-shop-on-navy-muted">{greeting()},</p>
            <h1 id="acct-h" className="truncate font-display text-shop-xl font-bold md:text-shop-2xl">
              {first}
            </h1>
            <p className="mt-0.5 truncate text-shop-sm text-shop-on-navy-muted">{company ? `Buying for ${company}` : "Add your shop name to show it on invoices"}</p>
          </div>
        </div>
        <Button variant="on-navy" size="sm" leftIcon={Pencil} onClick={onEdit} className="rounded-full border border-white/25">
          Edit profile
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-white/10 text-shop-sm sm:grid-cols-4">
        {[
          ["GSTIN", p.gstin ? <span className="font-mono tracking-wide">{p.gstin}</span> : <span className="text-shop-on-navy-muted">Not added</span>],
          ["Business", type || <span className="text-shop-on-navy-muted">Not added</span>],
          ["Mobile", user.phone || <span className="text-shop-on-navy-muted">Not added</span>],
          [
            "Email",
            <span className="inline-flex max-w-full items-center gap-1">
              <span className="truncate">{user.email}</span>
              {user.emailVerified ? <BadgeCheck className="size-4 shrink-0 text-shop-gold" aria-label="Verified" /> : null}
            </span>,
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-shop-navy px-5 py-3 sm:px-6">
            <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-shop-on-navy-muted">{label}</dt>
            <dd className="mt-0.5 truncate font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {user.lastLoginAt ? <p className="border-t border-white/10 px-5 py-2 text-shop-xs text-shop-on-navy-muted sm:px-6">Last sign-in {formatDate(user.lastLoginAt)}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ set-up prompts */

function ResendButton({ user }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={busy}
      disabled={sent}
      onClick={async () => {
        setBusy(true);
        try {
          await api.resendVerification();
          setSent(true);
          toast.success("Verification link sent", { description: user.email });
        } catch (err) {
          toast.error(err?.message || "Could not send the link");
        } finally {
          setBusy(false);
        }
      }}
    >
      {sent ? "Link sent" : "Send link again"}
    </Button>
  );
}

function Prompts({ user, onEdit }) {
  const { addresses, isPending } = useAddresses();
  const p = user.profile || {};
  const items = [];
  if (!user.emailVerified)
    items.push(
      <Notice key="verify" tone="warning" icon={MailWarning} title="Verify your email to place orders" action={<ResendButton user={user} />}>
        We sent a link to {user.email}.
      </Notice>
    );
  if (!p.gstin)
    items.push(
      <Notice
        key="gst"
        tone="business"
        icon={ReceiptText}
        title="Add your GSTIN"
        action={
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Add GSTIN
          </Button>
        }
      >
        It goes on your tax invoices so you can claim input tax credit.
      </Notice>
    );
  else if (!p.company)
    items.push(
      <Notice
        key="company"
        tone="info"
        icon={Building2}
        title="Add your shop name"
        action={
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Add name
          </Button>
        }
      >
        The legal name printed on your GST invoices.
      </Notice>
    );
  if (!isPending && !addresses.length)
    items.push(
      <Notice key="addr" tone="info" icon={MapPin} title="Add a delivery address" action={<Button size="sm" variant="secondary" to="/account/addresses">Add address</Button>}>
        Save your shop or godown address for faster checkout.
      </Notice>
    );
  if (!items.length) return null;
  return <div className="grid gap-2.5">{items}</div>;
}

/* ------------------------------------------------------------------ KPI tiles */

function Kpi({ icon, tone, label, to, pending, value, sub }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col gap-3 rounded-[1.25rem] border border-shop-line bg-shop-card p-4 transition-[box-shadow,border-color] hover:border-shop-line-strong hover:shadow-[0_16px_36px_-22px_rgba(11,16,51,0.45)]"
    >
      <span className="flex items-center justify-between gap-2">
        <IconCircle icon={icon} tone={tone} />
        <ChevronRight className="size-4 text-shop-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-shop-xs font-semibold text-shop-muted">{label}</span>
        {pending ? (
          <Skeleton className="mt-1 h-7 w-20" />
        ) : (
          <span className="mt-0.5 block truncate font-display text-shop-xl font-bold tabular-nums text-shop-ink">{value}</span>
        )}
        {sub && !pending ? <span className="mt-0.5 block truncate text-shop-xs text-shop-muted">{sub}</span> : null}
      </span>
    </Link>
  );
}

function creditStores(ledger) {
  return (ledger.data?.stores || []).filter((s) => s.creditEnabled || s.purchaseOrderEnabled || Number(s.outstanding) || Number(s.advance));
}

function Kpis({ openOrders }) {
  const ledger = useLedger();
  const wish = useWishlist();
  const coupons = useCartCoupons();
  const stores = creditStores(ledger);
  const spendable = stores.reduce((sum, s) => sum + (Number(s.spendable) || 0), 0);
  const openTotal = openOrders.data?.meta?.total ?? (openOrders.data?.data || []).length;
  const couponRows = coupons.data?.coupons || [];
  const usable = couponRows.filter((c) => c.eligible).length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={Truck} tone="info" label="Orders in progress" to={OPEN_ORDERS_URL} pending={openOrders.isPending} value={openTotal} sub={openTotal ? "Track deliveries" : "Nothing on the way"} />
      <Kpi
        icon={Wallet}
        tone="gold"
        label="Credit available"
        to="/account/credit"
        pending={ledger.isPending}
        value={stores.length ? <Money value={spendable} mode="listing" /> : "Not set up"}
        sub={stores.length ? `With ${stores.length} seller${stores.length === 1 ? "" : "s"}` : "Ask a seller for terms"}
      />
      <Kpi icon={Heart} tone="danger" label="Wishlist" to="/account/wishlist" pending={wish.isPending} value={wish.items.length} sub={wish.items.length ? "Saved items" : "Nothing saved yet"} />
      <Kpi
        icon={Tag}
        tone="saffron"
        label="Coupons"
        to="/account/coupons"
        pending={coupons.isPending}
        value={couponRows.length}
        sub={usable ? `${usable} usable on your cart` : couponRows.length ? "From your sellers" : "None right now"}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ recent orders */

function RecentOrders() {
  const q = useMyOrders({ limit: 4 });
  const rows = q.data?.data || [];
  const total = q.data?.meta?.total ?? rows.length;
  return (
    <AccountSection
      id="acct-recent"
      icon={Package}
      title="Recent orders"
      to="/account/orders"
      linkLabel={total > rows.length ? `All ${total}` : "All orders"}
      bodyClassName="px-0 pb-0 sm:px-0"
    >
      {q.isPending ? (
        <div className="grid gap-2 px-4 pb-4 sm:px-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : q.error ? (
        <div className="px-4 pb-4 sm:px-5">
          <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>Retry</Button>}>
            {q.error.message}
          </Notice>
        </div>
      ) : rows.length ? (
        <ul className="divide-y divide-shop-line border-t border-shop-line">
          {rows.map((o) => (
            <li key={orderId(o)}>
              <Link to={`/account/orders/${orderId(o)}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-shop-hover sm:px-5">
                <OrderThumbs items={o.items || []} max={2} tileClassName="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-shop-sm font-semibold text-shop-ink">{o.orderNumber}</span>
                    <OrderStatusPill status={o.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-shop-xs text-shop-muted">
                    {sellerName(o)} · {formatDate(o.createdAt)}
                    {o.items?.length ? ` · ${o.items.length} item${o.items.length === 1 ? "" : "s"}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right font-display text-shop-base font-bold tabular-nums text-shop-ink">
                  <Money value={o.total ?? o.totals?.grandTotal} />
                </span>
                <ChevronRight className="hidden size-4 shrink-0 text-shop-subtle sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid justify-items-start gap-3 px-4 pb-5 sm:px-5">
          <p className="text-shop-sm text-shop-muted">No orders yet. Your first order and its GST invoice will show up here.</p>
          <Button to="/category/all" size="sm" rightIcon={ArrowRight}>
            Start shopping
          </Button>
        </div>
      )}
    </AccountSection>
  );
}

/* ------------------------------------------------------------------ quick actions */

function QuickAction({ icon, tone, title, sub, to, onClick, loading, disabled }) {
  const cls = "flex min-h-[4.25rem] w-full min-w-0 items-center gap-3 rounded-xl border border-shop-line bg-shop-card px-3 py-2.5 text-left transition-colors hover:border-shop-primary hover:bg-shop-primary-soft/40 disabled:pointer-events-none disabled:opacity-50";
  const body = (
    <>
      <IconCircle icon={icon} tone={tone} />
      <span className="min-w-0">
        <span className="block text-shop-sm font-semibold text-shop-ink">{loading ? "Adding to cart…" : title}</span>
        {sub ? <span className="block truncate text-shop-xs text-shop-muted">{sub}</span> : null}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} className={cls}>
      {body}
    </button>
  );
}

function QuickActions({ openOrders }) {
  const delivered = useMyOrders({ status: "delivered", limit: 1 });
  const reorder = useReorder();
  const [result, setResult] = useState(null);
  const last = delivered.data?.data?.[0];
  const latestOpen = openOrders.data?.data?.[0];
  return (
    <AccountSection id="acct-quick" title="Quick actions" bodyClassName="pt-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {last ? (
          <QuickAction
            icon={RotateCcw}
            tone="primary"
            title="Reorder last order"
            sub={`${last.orderNumber} · ${sellerName(last)}`}
            loading={reorder.isPending}
            onClick={() => reorder.mutate(orderId(last), { onSettled: (res, err) => setResult(reorderResult(err || res)) })}
          />
        ) : null}
        <QuickAction
          icon={Truck}
          tone="info"
          title={latestOpen ? "Track your order" : "Your orders"}
          sub={latestOpen ? `${latestOpen.orderNumber} · ${sellerName(latestOpen)}` : "Invoices, returns and history"}
          to={latestOpen ? `/account/orders/${orderId(latestOpen)}` : "/account/orders"}
        />
        <QuickAction icon={MapPin} tone="gold" title="Addresses" sub="Shops, godowns and branches" to="/account/addresses" />
        <QuickAction icon={LifeBuoy} tone="saffron" title="Get support" sub="Message a seller or our team" to="/account/support" />
      </div>
      <ReorderSheet result={result} open={Boolean(result)} onOpenChange={(v) => !v && setResult(null)} />
    </AccountSection>
  );
}

/* ------------------------------------------------------------------ credit, address, notifications */

function CreditSection() {
  const q = useLedger();
  const stores = creditStores(q);
  return (
    <AccountSection id="acct-credit" icon={Wallet} tone="gold" title="Credit with sellers" to="/account/credit" linkLabel="Statement">
      {q.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : q.error ? (
        <p className="text-shop-sm text-shop-danger-ink">{q.error.message}</p>
      ) : stores.length ? (
        <ul className="grid gap-3">
          {stores.slice(0, 3).map((s) => (
            <li key={String(s.tenantId?._id || s.tenantId)} className="rounded-xl border border-shop-line bg-shop-page/60 p-3">
              <p className="mb-1 flex items-center justify-between gap-2 text-shop-xs">
                <span className="truncate font-semibold text-shop-gold-ink">{displayName(s.store?.name) || "Seller"}</span>
                {s.paymentDays ? <span className="shrink-0 text-shop-muted">{s.paymentDays}-day terms</span> : null}
              </p>
              <CreditMeter store={s} compact />
            </li>
          ))}
          {stores.length > 3 ? (
            <li>
              <Link to="/account/credit" className="inline-flex min-h-11 items-center text-shop-sm font-semibold text-shop-primary-ink hover:underline">
                {stores.length - 3} more seller{stores.length - 3 === 1 ? "" : "s"}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-shop-sm text-shop-muted">
          No credit terms yet. Sellers can offer credit or purchase-order terms to regular buyers.{" "}
          <Link to="/account/support?new=1" className="font-semibold text-shop-primary-ink hover:underline">
            Ask a seller
          </Link>
        </p>
      )}
    </AccountSection>
  );
}

function AddressSection() {
  const { addresses, defaultAddress, isPending } = useAddresses();
  return (
    <AccountSection id="acct-addr" icon={MapPin} tone="primary" title="Default address" to="/account/addresses" linkLabel={addresses.length ? `Manage ${addresses.length}` : "Add"}>
      {isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : defaultAddress ? (
        <p className="text-shop-sm text-shop-text">
          <span className="block font-semibold text-shop-ink">
            {defaultAddress.label ? `${defaultAddress.label} · ` : ""}
            {defaultAddress.contactName}
          </span>
          {[defaultAddress.addressLine1, defaultAddress.addressLine2, defaultAddress.city, defaultAddress.postalCode].filter(Boolean).join(", ")}
        </p>
      ) : (
        <p className="text-shop-sm text-shop-muted">Add your shop or godown address for faster checkout.</p>
      )}
    </AccountSection>
  );
}

function NotificationsSection() {
  const { unread, isPending } = useUnreadCount();
  return (
    <AccountSection
      id="acct-notif"
      icon={Bell}
      tone="info"
      title="Notifications"
      to="/account/notifications"
      linkLabel="Open"
      footer={
        <Link to="/account/notifications?tab=settings" className="inline-flex min-h-11 items-center text-shop-sm font-semibold text-shop-primary-ink hover:underline">
          Choose email and SMS alerts
        </Link>
      }
    >
      {isPending ? (
        <Skeleton className="h-6 w-32" />
      ) : (
        <p className={cn("text-shop-sm", unread ? "font-semibold text-shop-ink" : "text-shop-text")}>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You are all caught up."}</p>
      )}
    </AccountSection>
  );
}

/* ------------------------------------------------------------------ profile sheet */

function ProfileSheet({ open, onOpenChange, user }) {
  const { updateProfile } = useAuth();
  const [form, setForm] = useState(() => ({
    name: user.name || "",
    phone: normalizePhone(user.phone) || user.phone || "",
    company: user.profile?.company || "",
    gstin: user.profile?.gstin || user.gstin || "",
    businessType: user.profile?.businessType || user.businessType || "",
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = "Enter your name (at least 2 characters)";
    if (form.phone && !normalizePhone(form.phone)) v.phone = "Enter a 10-digit mobile number";
    const g = form.gstin.trim().toUpperCase();
    const currentGstin = user.profile?.gstin || user.gstin || "";
    if (g && g !== currentGstin) {
      const msg = gstinError(g);
      if (msg) v.gstin = msg;
    }
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector(`#profile-form [name="${Object.keys(v)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone ? formatPhone(form.phone) : "",
        // Send the GSTIN only when it changed: the API re-validates it (check digit), and an older
        // stored value must not block saving other fields.
        profile: {
          company: form.company.trim(),
          ...(g !== currentGstin ? { gstin: g } : {}),
          ...(form.businessType ? { businessType: form.businessType } : {}),
        },
      });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      const f = err?.fields || {};
      const mapped = {
        name: f.name,
        phone: f.phone,
        company: f["profile.company"],
        gstin: f["profile.gstin"] || f.gstin,
        businessType: f["profile.businessType"] || f.businessType,
      };
      const clean = Object.fromEntries(Object.entries(mapped).filter(([, x]) => x));
      setErrors(Object.keys(clean).length ? clean : { _: err?.message || "Could not save your profile" });
      const first = Object.keys(clean)[0];
      if (first) document.querySelector(`#profile-form [name="${first}"]`)?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ShopSheet
      open={open}
      onOpenChange={(v) => !busy && onOpenChange(v)}
      title="Edit business profile"
      description="Shown on your orders and GST invoices."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="profile-form" loading={busy}>
            Save
          </Button>
        </div>
      }
    >
      <form id="profile-form" onSubmit={submit} noValidate className="grid gap-4">
        <Field label="Your name" error={errors.name} required>
          <Input name="name" autoComplete="name" maxLength={120} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Mobile number" error={errors.phone} hint="For delivery and payment updates">
          <Input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} value={form.phone} onChange={(e) => set("phone")({ target: { value: e.target.value.replace(/[^\d ]/g, "") } })} />
        </Field>
        <Field label="Shop / business name" error={errors.company} optional hint="Legal name for GST invoices">
          <Input name="company" autoComplete="organization" maxLength={120} value={form.company} onChange={set("company")} />
        </Field>
        <Field label="Business type" error={errors.businessType} optional>
          <Select name="businessType" value={form.businessType} onChange={set("businessType")} options={BUSINESS_TYPES} placeholder="Choose one" />
        </Field>
        <Field label="GSTIN" error={errors.gstin} optional hint="15 characters. Leave empty if you are not GST-registered.">
          <Input name="gstin" autoCapitalize="characters" spellCheck={false} maxLength={15} value={form.gstin} onChange={(e) => set("gstin")({ target: { value: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "") } })} className="uppercase tracking-wider" />
        </Field>
        <p className="text-shop-xs text-shop-muted">To change your email address, contact support.</p>
        {errors._ ? <Notice tone="danger">{errors._}</Notice> : null}
      </form>
    </ShopSheet>
  );
}

export default function Account() {
  const { user } = useViewer();
  const [editing, setEditing] = useState(false);
  const openOrders = useMyOrders({ status: OPEN_QUERY, limit: 3 });
  useDocumentTitle("Your account");
  if (!user) return null;
  const edit = () => setEditing(true);
  return (
    <div className="grid gap-5">
      <Hero user={user} onEdit={edit} />
      <Prompts user={user} onEdit={edit} />
      <Kpis openOrders={openOrders} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
        <RecentOrders />
        <QuickActions openOrders={openOrders} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <CreditSection />
        <AddressSection />
        <NotificationsSection />
      </div>

      {editing ? <ProfileSheet open onOpenChange={setEditing} user={user} /> : null}
    </div>
  );
}
