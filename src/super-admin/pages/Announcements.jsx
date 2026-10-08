import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Ban, Mail, Megaphone, Plus, Send, X } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { NOTIFICATION_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { formatDateTime, fromIstInputValue } from "../../shared/lib/format.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Combobox,
  ConfirmDialog,
  DataTable,
  DateTime,
  DescriptionList,
  Dialog,
  EmptyState,
  Field,
  FilterBar,
  Input,
  PageHeader,
  RadioGroup,
  Select,
  Sheet,
  StatusPill,
  TenantCombobox,
  Textarea,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import { useTenantScope, TenantFilter, TenantLink } from "./lib/tenantScope.jsx";
import { JsonBlock } from "./lib/diff.jsx";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ constants */

const AUDIENCES = [
  { value: "all", label: "Everyone", description: "Every signed-in user: buyers, store staff and platform staff." },
  { value: "tenant", label: "A store", description: "Everyone who belongs to one store (its staff and member accounts)." },
  { value: "staff", label: "A store’s staff", description: "Staff accounts of one store only." },
  { value: "role", label: "A role", description: "Holders of a role — in one store, or in every store when no store is picked." },
  { value: "user", label: "Specific users", description: "A personal copy for each person you pick (up to 1,000)." },
];
const AUDIENCE_FILTER = [
  { value: "all", label: "Everyone" },
  { value: "tenant", label: "Store members" },
  { value: "staff", label: "Store staff" },
  { value: "role", label: "Role" },
  { value: "user", label: "Direct" },
];
const DELIVERY_TONE = { pending: "neutral", sending: "info", done: "success", failed: "danger" };
const AUDIENCE_LABEL = { all: "Everyone", tenant: "Store members", staff: "Store staff", role: "Role", user: "Direct" };
const SYSTEM_ROLES = [
  { slug: "tenant_admin", label: "Store admins" },
  { slug: "support_agent", label: "Support agents" },
  { slug: "buyer", label: "Buyers" },
  { slug: "super_admin", label: "Platform admins" },
];
const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];
const PRIORITY_TONE = { low: "neutral", normal: "info", high: "danger" };
const EMPTY = { title: "", body: "", priority: "normal", audienceType: "all", tenantId: "", tenantName: "", roleSlug: "", users: [], when: "now", scheduledAt: "", expiresAt: "", email: false };
const NEEDS_TENANT = new Set(["tenant", "staff"]);
const sendApi = api.withTenant(null); // never leak the topbar tenant into the audience
const usersApi = api.withTenant(null);

/* ------------------------------------------------------------------ validation (mirrors announcementSchema) */

function validate(f, now = Date.now()) {
  const e = {};
  const title = f.title.trim();
  if (!title) e.title = "Required";
  else if (title.length > 200) e.title = "At most 200 characters";
  if (f.body.length > 4000) e.body = "At most 4,000 characters";
  if (NEEDS_TENANT.has(f.audienceType) && !f.tenantId) e.tenantId = "Pick the store to notify";
  if (f.audienceType === "role") {
    const slug = f.roleSlug.trim();
    if (!slug) e.roleSlug = "Enter a role slug";
    else if (slug.length > 60) e.roleSlug = "At most 60 characters";
  }
  if (f.audienceType === "user") {
    if (!f.users.length) e.userIds = "Pick at least one user";
    else if (f.users.length > 1000) e.userIds = "At most 1,000 users";
  }
  const sched = f.when === "later" ? fromIstInputValue(f.scheduledAt) : "";
  if (f.when === "later") {
    if (!sched) e.scheduledAt = "Pick when to publish";
    else if (new Date(sched).getTime() <= now) e.scheduledAt = "Must be in the future";
  }
  if (f.expiresAt) {
    const exp = fromIstInputValue(f.expiresAt);
    if (!exp) e.expiresAt = "Invalid date";
    else if (new Date(exp).getTime() <= (sched ? new Date(sched).getTime() : now)) e.expiresAt = sched ? "Must be after the publish time" : "Must be in the future";
  }
  return e;
}

function toBody(f) {
  const body = { title: f.title.trim(), priority: f.priority, audienceType: f.audienceType };
  if (f.body.trim()) body.body = f.body;
  if (NEEDS_TENANT.has(f.audienceType) || (f.audienceType === "role" && f.tenantId)) body.tenantId = f.tenantId;
  if (f.audienceType === "role") body.roleSlug = f.roleSlug.trim();
  if (f.audienceType === "user") body.userIds = f.users.map((u) => u.value);
  body.channels = { email: Boolean(f.email) };
  if (f.when === "later") body.scheduledAt = fromIstInputValue(f.scheduledAt);
  if (f.expiresAt) body.expiresAt = fromIstInputValue(f.expiresAt);
  return body;
}

/** Map refine() messages (no path) onto fields. */
function serverFieldErrors(err) {
  if (!err) return {};
  const out = { ...(err.fields || {}) };
  const msg = String(err.message || "");
  if (/userIds/.test(msg) && !out.userIds) out.userIds = msg;
  if (/roleSlug/.test(msg) && !out.roleSlug) out.roleSlug = msg;
  if (/expiresAt/.test(msg) && !out.expiresAt) out.expiresAt = msg;
  if (/tenantId/.test(msg) && !out.tenantId) out.tenantId = msg;
  return out;
}

function audienceSentence(f) {
  const store = f.tenantName || "the selected store";
  switch (f.audienceType) {
    case "all":
      return "everyone on the marketplace";
    case "tenant":
      return `everyone in ${store}`;
    case "staff":
      return `staff of ${store}`;
    case "role":
      return f.tenantId ? `users with the “${f.roleSlug.trim()}” role in ${store}` : `users with the “${f.roleSlug.trim()}” role in every store`;
    case "user":
      return `${f.users.length.toLocaleString("en-IN")} selected user${f.users.length === 1 ? "" : "s"}`;
    default:
      return "";
  }
}

/* ------------------------------------------------------------------ compose */

function UserPicker({ users, onChange, error }) {
  const picked = new Set(users.map((u) => u.value));
  return (
    <Field label="Recipients" required error={error} hint={`${users.length.toLocaleString("en-IN")} of 1,000 · search by name, email or phone`}>
      <div className="grid gap-2">
        <Combobox
          value=""
          onChange={(v, option) => {
            if (!v || picked.has(v) || users.length >= 1000) return;
            onChange([...users, option]);
          }}
          queryKey={keys.users.custom("announce-picker")}
          search={(q) => usersApi.listUsers({ q, limit: 20 })}
          mapOption={(u) => ({
            value: String(u.id || u._id),
            label: u.name || u.email,
            description: [u.email, u.tenant?.name, u.role?.name].filter(Boolean).join(" · "),
            disabled: picked.has(String(u.id || u._id)),
          })}
          placeholder="Add a user…"
          searchPlaceholder="Search users…"
          emptyText="No users match"
          aria-label="Add recipient"
        />
        {users.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Selected recipients">
            {users.map((u) => (
              <li key={u.value} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pl-2.5 pr-1 text-ui-xs text-fg">
                <span className="truncate" title={u.description}>{u.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${u.label}`}
                  onClick={() => onChange(users.filter((x) => x.value !== u.value))}
                  className="grid size-4 place-items-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
            {users.length > 1 ? (
              <li>
                <Button size="xs" variant="ghost" onClick={() => onChange([])}>Clear all</Button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}

function Preview({ f }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-soft-fg">
          <Megaphone className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-ui-sm font-semibold text-fg">
            {f.title.trim() || <span className="text-fg-subtle">Title</span>}
            {f.priority !== "normal" ? <Badge tone={PRIORITY_TONE[f.priority]}>{f.priority === "high" ? "High priority" : "Low priority"}</Badge> : null}
          </p>
          {f.body.trim() ? <p className="mt-0.5 whitespace-pre-line break-words text-ui-sm text-fg-muted">{f.body}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange }) {
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState("compose");
  const [touched, setTouched] = useState(false);
  const send = useApiMutation((body) => sendApi.sendAnnouncement(body), {
    invalidate: [keys.notifications.all],
    error: false,
    success: (res, body) => {
      if (body.audienceType === "user") {
        const n = res?.count ?? 0;
        const skipped = body.userIds.length - n;
        return `${res?.scheduled ? "Scheduled for" : "Sent to"} ${n} user${n === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} skipped: in-app announcements turned off)` : ""}`;
      }
      const mail = body.channels?.email ? " — emails are going out in the background" : "";
      return res?.status === "scheduled" ? `Scheduled for ${formatDateTime(res.scheduledAt)} IST` : `Announcement published${mail}`;
    },
  });

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY);
  const blocker = useUnsavedChangesGuard(open && dirty && !send.isPending);
  const clientErrors = validate(form);
  const serverErrors = serverFieldErrors(send.error);
  const errors = { ...(touched ? clientErrors : {}), ...serverErrors };
  const set = (patch) => {
    send.reset();
    setForm((f) => ({ ...f, ...patch }));
  };

  function close(next) {
    if (next) return;
    onOpenChange(false);
  }
  function reset() {
    setForm(EMPTY);
    setStep("compose");
    setTouched(false);
    send.reset();
  }

  function review(e) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(clientErrors).length) return;
    setStep("review");
  }

  function confirm() {
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setStep("compose");
      return;
    }
    send.mutate(toBody(form), {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
      onError: (err) => {
        const fields = serverFieldErrors(err);
        if (Object.keys(fields).length) setStep("compose");
      },
    });
  }

  const later = form.when === "later";
  const headline = `${later ? `Schedule for ${formatDateTime(fromIstInputValue(form.scheduledAt))} IST` : "Send now"} to ${audienceSentence(form)}?`;
  const generalError = send.error && !Object.keys(serverErrors).length ? send.error : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={close}
        size="lg"
        dirty={dirty}
        busy={send.isPending}
        title={step === "compose" ? "New announcement" : "Review and send"}
        description={step === "compose" ? "Shows in the notification bell. Delivered live to people who are online." : "Check the audience and timing — published announcements can’t be recalled."}
        footer={
          step === "compose" ? (
            <>
              {dirty ? <Button variant="ghost" className="mr-auto" onClick={reset}>Clear</Button> : null}
              <Button onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" form="announce-form" variant="primary">Review</Button>
            </>
          ) : (
            <>
              <Button leftIcon={ArrowLeft} className="mr-auto" onClick={() => setStep("compose")} disabled={send.isPending}>Edit</Button>
              <Button variant="primary" leftIcon={Send} loading={send.isPending} onClick={confirm}>
                {later ? "Schedule" : "Send now"}
              </Button>
            </>
          )
        }
      >
        {step === "compose" ? (
          <form id="announce-form" noValidate onSubmit={review} className="grid gap-5">
            <Field label="Title" required error={errors.title} hint={`${form.title.trim().length}/200`}>
              <Input value={form.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} placeholder="Scheduled maintenance on Sunday" />
            </Field>
            <Field label="Message" optional error={errors.body} hint={`${form.body.length.toLocaleString("en-IN")}/4,000`}>
              <Textarea rows={4} value={form.body} maxLength={4000} onChange={(e) => set({ body: e.target.value })} placeholder="What should people know?" />
            </Field>
            <Field label="Priority" className="max-w-xs">
              <Select value={form.priority} onValueChange={(v) => set({ priority: v })} options={PRIORITIES} />
            </Field>

            <fieldset className="grid gap-3 rounded-md border border-border p-4">
              <legend className="px-1 text-ui-sm font-medium text-fg">Audience</legend>
              <RadioGroup value={form.audienceType} onValueChange={(v) => set({ audienceType: v })} options={AUDIENCES} />
              {form.audienceType !== "all" && form.audienceType !== "user" ? (
                <Field
                  label="Store"
                  required={NEEDS_TENANT.has(form.audienceType)}
                  optional={form.audienceType === "role"}
                  error={errors.tenantId}
                  hint={form.audienceType === "role" ? "Leave empty to reach holders of the role in every store." : undefined}
                >
                  <TenantCombobox value={form.tenantId} onChange={(id, option) => set({ tenantId: id || "", tenantName: option?.label || "" })} placeholder="Search stores…" />
                </Field>
              ) : null}
              {form.audienceType === "role" ? (
                <Field label="Role slug" required error={errors.roleSlug} hint="System roles below, or type a custom role’s slug.">
                  <div className="grid gap-2">
                    <Input value={form.roleSlug} maxLength={60} onChange={(e) => set({ roleSlug: e.target.value })} list="announce-role-slugs" placeholder="tenant_admin" className="font-mono" autoComplete="off" />
                    <datalist id="announce-role-slugs">
                      {SYSTEM_ROLES.map((r) => (
                        <option key={r.slug} value={r.slug}>{r.label}</option>
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5">
                      {SYSTEM_ROLES.map((r) => (
                        <Button key={r.slug} size="xs" variant={form.roleSlug === r.slug ? "primary" : "secondary"} onClick={() => set({ roleSlug: r.slug })}>
                          {r.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Field>
              ) : null}
              {form.audienceType === "role" && !form.tenantId && form.roleSlug.trim() ? (
                <Alert tone="info">Cross-store: every holder of “{form.roleSlug.trim()}” in every store is notified.</Alert>
              ) : null}
              {form.audienceType === "user" ? <UserPicker users={form.users} onChange={(users) => set({ users })} error={errors.userIds} /> : null}
            </fieldset>

            <fieldset className="grid gap-3 rounded-md border border-border p-4">
              <legend className="px-1 text-ui-sm font-medium text-fg">Timing</legend>
              <RadioGroup
                orientation="horizontal"
                value={form.when}
                onValueChange={(v) => set({ when: v })}
                options={[
                  { value: "now", label: "Publish now" },
                  { value: "later", label: "Schedule" },
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {later ? (
                  <Field label="Publish at" required hint="IST" error={errors.scheduledAt}>
                    <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} />
                  </Field>
                ) : null}
                <Field label="Expires at" optional hint="IST · default 90 days after publishing" error={errors.expiresAt}>
                  <Input type="datetime-local" value={form.expiresAt} min={later ? form.scheduledAt || undefined : undefined} onChange={(e) => set({ expiresAt: e.target.value })} />
                </Field>
              </div>
            </fieldset>

            <div className="grid gap-1.5">
              <Checkbox
                checked={form.email}
                onCheckedChange={(v) => set({ email: Boolean(v) })}
                label={<span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" aria-hidden /> Also send by email</span>}
                description={
                  form.audienceType === "user"
                    ? "Each recipient gets an email too, unless they’ve opted out of announcement emails."
                    : "Every recipient is emailed in the background (in batches, up to 5,000), honouring their email preferences and with an unsubscribe link. Progress shows on the announcement."
                }
              />
              {form.email && form.audienceType === "all" ? (
                <Alert tone="warning">This emails everyone on the marketplace. Double-check the message — emails can’t be recalled.</Alert>
              ) : null}
            </div>

            {generalError ? <Alert tone="danger" title="Couldn’t send">{generalError.message}</Alert> : null}
            <Preview f={form} />
          </form>
        ) : (
          <div className="grid gap-4">
            <p className="text-ui font-semibold text-fg">{headline}</p>
            <Preview f={form} />
            <DescriptionList
              columns={2}
              items={[
                { label: "Audience", value: AUDIENCES.find((a) => a.value === form.audienceType)?.label },
                form.tenantId ? { label: "Store", value: form.tenantName || <Code>{form.tenantId}</Code> } : null,
                form.audienceType === "role" ? { label: "Role", value: <Code>{form.roleSlug.trim()}</Code> } : null,
                form.audienceType === "user" ? { label: "Recipients", value: form.users.length.toLocaleString("en-IN") } : null,
                { label: "Publishes", value: later ? `${formatDateTime(fromIstInputValue(form.scheduledAt))} IST` : "Immediately" },
                { label: "Expires", value: form.expiresAt ? `${formatDateTime(fromIstInputValue(form.expiresAt))} IST` : "90 days after publishing" },
                { label: "Priority", value: PRIORITIES.find((p) => p.value === form.priority)?.label },
                { label: "Email", value: form.email ? "Yes — also emailed" : "No (in-app only)" },
              ]}
            />
            {form.audienceType === "role" && !form.tenantId ? <Alert tone="info">No store selected: holders of this role in every store are notified.</Alert> : null}
            {generalError ? <Alert tone="danger" title="Couldn’t send">{generalError.message}{generalError.requestId ? <span className="ml-1 font-mono text-ui-2xs">({generalError.requestId})</span> : null}</Alert> : null}
          </div>
        )}
      </Dialog>
      <UnsavedChangesDialog blocker={blocker} title="Discard this announcement?" />
    </>
  );
}

/* ------------------------------------------------------------------ list + details */

function AudienceCell({ n }) {
  const type = n.audience?.type || (n.userId ? "user" : "all");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {AUDIENCE_LABEL[type] || type}
      {type === "role" && n.audience?.roleSlug ? <Code>{n.audience.roleSlug}</Code> : null}
      {n.global ? <Badge tone="accent">Global</Badge> : null}
    </span>
  );
}

function StoreCell({ n }) {
  if (n.tenant || n.tenantId) return <TenantLink tenant={n.tenant || n.tenantId} />;
  return <span className="text-fg-subtle">{n.global ? "Every store" : "—"}</span>;
}

function EmailDelivery({ n, compact }) {
  if (!n.channels?.email) return <span className="text-fg-subtle">{compact ? "—" : "Not emailed"}</span>;
  const d = n.emailDelivery;
  if (!d) return <Badge tone="neutral">{n.status === "scheduled" ? "On publish" : "Queued"}</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={DELIVERY_TONE[d.status] || "neutral"}>{d.status}</Badge>
      {compact ? null : (
        <span className="text-ui-xs text-fg-muted">
          {Number(d.sent || 0).toLocaleString("en-IN")} sent of {Number(d.recipients || 0).toLocaleString("en-IN")}
          {d.skipped ? ` · ${d.skipped} skipped` : ""}
          {d.failed ? ` · ${d.failed} failed` : ""}
        </span>
      )}
    </span>
  );
}

function CancelDialog({ target, onOpenChange }) {
  const cancel = useApiMutation((id) => api.withTenant(null).cancelNotification(id), {
    invalidate: [keys.notifications.all],
    success: "Scheduled announcement cancelled",
    error: false,
  });
  return (
    <ConfirmDialog
      open={Boolean(target)}
      onOpenChange={onOpenChange}
      title={`Cancel “${target?.title || "announcement"}”?`}
      description={`It was due ${target?.scheduledAt ? `${formatDateTime(target.scheduledAt)} IST` : "later"} and won’t be published. This can’t be undone — compose it again to reschedule.`}
      confirmLabel="Cancel announcement"
      cancelLabel="Keep scheduled"
      tone="danger"
      onConfirm={() => cancel.mutateAsync(target._id)}
    />
  );
}

function DetailSheet({ id, rows, loading, onClose, onCancel, canSend }) {
  const n = rows.find((r) => String(r._id) === String(id));
  return (
    <Sheet
      open={Boolean(id)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={n?.title || "Announcement"}
      description={n ? <span className="inline-flex items-center gap-2"><StatusPill status={n.status} /> <span>Created <DateTime value={n.createdAt} /></span></span> : undefined}
      footer={
        n?.status === "scheduled" && canSend ? (
          <Button variant="danger" leftIcon={Ban} onClick={() => onCancel(n)}>Cancel announcement</Button>
        ) : null
      }
    >
      {!n ? (
        loading ? null : (
          <EmptyState compact title="Not on this page" description="Open announcements from the list. This one isn’t in the current page or filters." action={<Button size="sm" onClick={onClose}>Close</Button>} />
        )
      ) : (
        <div className="grid gap-5">
          {n.body ? <p className="whitespace-pre-line break-words rounded-md bg-surface-2 p-3 text-ui-sm text-fg">{n.body}</p> : <p className="text-ui-sm text-fg-subtle">No message body.</p>}
          <DescriptionList
            columns={2}
            items={[
              { label: "Audience", value: <AudienceCell n={n} /> },
              { label: "Store", value: <StoreCell n={n} /> },
              n.userId ? { label: "Recipient", value: <Link className="text-fg hover:underline" to={`/super-admin/users/${n.userId}`}>View user</Link> } : null,
              { label: "Priority", value: <Badge tone={PRIORITY_TONE[n.priority]}>{n.priority}</Badge> },
              { label: "Scheduled for", value: n.scheduledAt ? <DateTime value={n.scheduledAt} /> : null },
              { label: "Published", value: n.status === "published" ? <DateTime value={n.publishedAt} /> : null },
              { label: "Expires", value: <DateTime value={n.expiresAt} /> },
              { label: "Email", value: <EmailDelivery n={n} />, className: "sm:col-span-2" },
              n.userId ? { label: "Read", value: n.readAt ? <DateTime value={n.readAt} /> : "Not yet" } : null,
              {
                label: "Created by",
                value: n.createdBy ? (
                  <Link className="text-fg hover:underline" to={`/super-admin/users/${n.createdBy._id || n.createdBy}`}>
                    {n.createdBy.name || n.createdBy.email || "View user"}
                  </Link>
                ) : (
                  "System"
                ),
              },
              { label: "Id", value: <Code copy>{String(n._id)}</Code> },
            ]}
          />
          {n.data && Object.keys(n.data).length ? (
            <div className="grid gap-1.5">
              <p className="text-ui-xs font-medium text-fg-subtle">Data</p>
              <JsonBlock value={n.data} />
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ page */

export default function Announcements() {
  const can = useCan();
  const canSend = can("notifications.send");
  const scope = useTenantScope();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [composing, setComposing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  // ?global=hide drops platform-wide announcements from a store's list (they're included by default).
  const table = useUrlTableState({ filters: ["status", "audienceType", "global"], defaults: { limit: 20 } });
  const apiQuery = useMemo(() => {
    const { global, ...rest } = table.query;
    return { ...rest, includeGlobal: scope.tenantId && global === "hide" ? "false" : undefined };
  }, [table.query, scope.tenantId]);
  const listQuery = useMemo(() => ({ ...apiQuery, tenant: scope.tenantId || undefined }), [apiQuery, scope.tenantId]);

  const q = useQuery({
    queryKey: keys.notifications.sent(listQuery),
    queryFn: () => scope.api.listSentNotifications(apiQuery),
    enabled: canSend,
    ...listQueryOptions,
    // Email delivery runs in the background: poll while a broadcast is still sending.
    refetchInterval: (query) => ((query.state.data?.data || []).some((n) => ["pending", "sending"].includes(n.emailDelivery?.status)) ? 5000 : false),
  });
  const rows = q.data?.data || [];
  const viewId = params.get("view") || "";

  // Rows of every cached page, so ?view= works after paging back and forth.
  const known = useMemo(() => {
    const all = qc.getQueriesData({ queryKey: ["notifications", "sent"] }).flatMap(([, d]) => d?.data || []);
    return [...rows, ...all];
  }, [qc, rows]);

  const hrefFor = (n) => {
    const p = new URLSearchParams(params);
    p.set("view", String(n._id));
    return `?${p.toString()}`;
  };
  const closeView = () =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("view");
      return p;
    });

  if (!canSend) {
    return (
      <>
        <PageHeader title="Announcements" breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "Announcements" }]} />
        <Card>
          <EmptyState icon={Megaphone} title="No access" description="Sending and reviewing announcements requires the notifications.send permission." />
        </Card>
      </>
    );
  }

  const newButton = (
    <Button variant="primary" leftIcon={Plus} onClick={() => setComposing(true)}>
      New announcement
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Broadcast messages to everyone, a store, a role or specific users. Scheduled ones can be cancelled until they publish."
        breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "Announcements" }]}
        primaryAction={newButton}
      />
      <DataTable
        storageKey="sa-announcements"
        exportFilename="announcements"
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={hrefFor}
        toolbar={
          <FilterBar
            table={table}
            search={false}
            facets={[
              { key: "status", title: "Status", options: statusOptions(NOTIFICATION_STATUSES) },
              { key: "audienceType", title: "Audience", options: AUDIENCE_FILTER },
              ...(scope.tenantId ? [{ key: "global", title: "Global", options: [{ value: "hide", label: "Hide global announcements" }] }] : []),
            ]}
          >
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} placeholder="All stores" />
            {scope.tenantId ? (
              <span className="text-ui-xs text-fg-subtle">
                {scope.fromContext ? "Store from the tenant switcher · " : ""}
                {table.filters.global === "hide" ? "Only announcements addressed to this store" : "This store’s announcements plus global ones (marked Global)"}
              </span>
            ) : null}
          </FilterBar>
        }
        columns={[
          {
            id: "title",
            header: "Title",
            primary: true,
            mobile: "title",
            accessorKey: "title",
            cell: (n) => <span className="line-clamp-1 max-w-[22rem]">{n.title}</span>,
          },
          { id: "audience", header: "Audience", cell: (n) => <AudienceCell n={n} />, csv: (n) => `${n.audience?.type || ""}${n.audience?.roleSlug ? `:${n.audience.roleSlug}` : ""}`, mobile: "subtitle" },
          { id: "tenant", header: "Store", cell: (n) => <StoreCell n={n} />, csv: (n) => n.tenant?.name || (n.global ? "global" : "") },
          { id: "email", header: "Email", cell: (n) => <EmailDelivery n={n} compact />, csv: (n) => (n.channels?.email ? n.emailDelivery?.status || "queued" : ""), mobile: "hidden" },
          { id: "by", header: "Sent by", cell: (n) => n.createdBy?.name || n.createdBy?.email || <span className="text-fg-subtle">System</span>, csv: (n) => n.createdBy?.email || "", defaultHidden: true },
          { id: "priority", header: "Priority", cell: (n) => <Badge tone={PRIORITY_TONE[n.priority]}>{n.priority}</Badge>, csv: (n) => n.priority, mobile: "meta" },
          { id: "scheduled", header: "Scheduled", cell: (n) => <DateTime value={n.scheduledAt} />, csv: (n) => n.scheduledAt || "", defaultHidden: false },
          { id: "published", header: "Published", cell: (n) => <DateTime value={n.status === "published" ? n.publishedAt : null} />, csv: (n) => (n.status === "published" ? n.publishedAt : ""), mobile: "meta" },
          { id: "expires", header: "Expires", cell: (n) => <DateTime value={n.expiresAt} />, csv: (n) => n.expiresAt || "", mobile: "hidden" },
          { id: "status", header: "Status", cell: (n) => <StatusPill status={n.status} />, csv: (n) => n.status, mobile: "meta" },
          {
            id: "actions",
            header: "",
            hideable: false,
            csv: false,
            align: "right",
            cell: (n) =>
              n.status === "scheduled" ? (
                <Button size="xs" variant="danger-ghost" leftIcon={Ban} onClick={() => setCancelling(n)} aria-label={`Cancel ${n.title}`}>
                  Cancel
                </Button>
              ) : null,
          },
        ]}
        emptyState={
          <EmptyState
            icon={Megaphone}
            title={table.activeCount || scope.tenantId ? "No matching announcements" : "No announcements yet"}
            description={table.activeCount || scope.tenantId ? "Try another status or store." : "Announcements you send appear here with their delivery status."}
            action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : newButton}
          />
        }
      />
      <p className={cn("mt-3 text-ui-xs text-fg-subtle")}>
        Times in IST. “Specific users” announcements are stored as one row per recipient.
      </p>

      <ComposeDialog open={composing} onOpenChange={setComposing} />
      <DetailSheet id={viewId} rows={known} loading={q.isPending} onClose={closeView} onCancel={setCancelling} canSend={canSend} />
      <CancelDialog target={cancelling} onOpenChange={(o) => !o && setCancelling(null)} />
    </>
  );
}
