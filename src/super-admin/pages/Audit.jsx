import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Filter, ScrollText, SlidersHorizontal, User as UserIcon } from "lucide-react";
import { Alert, ErrorState, Skeleton } from "../../shared/ui/index.js";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import {
  Badge,
  Button,
  Code,
  Combobox,
  DataTable,
  DateTime,
  DescriptionList,
  EmptyState,
  FilterBar,
  Field,
  Input,
  PageHeader,
  Popover,
  PopoverClose,
  Sheet,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import { useTenantScope, TenantFilter, TenantLink } from "./lib/tenantScope.jsx";
import { JsonBlock, JsonDiff } from "./lib/diff.jsx";
import { entityHref } from "./lib/links.js";

/**
 * Audited actions per resource — every `audit("<action>", "<resource>")` in mspNode/src/modules
 * (plus the seed's "publish product"/"update order"). Keep in sync with the backend.
 */
const AUDITED = {
  auth: ["login", "logout", "logout_all", "password_change", "password_reset"],
  brand: ["create", "update", "delete"],
  category: ["create", "update", "delete"],
  cms: ["create", "update", "review", "publish", "unpublish", "draft", "schedule", "delete"],
  coupon: ["create", "update", "disable", "enable"],
  inventory: ["adjust", "set_quantity", "publish", "transfer"],
  ledger: ["adjust", "payment", "terms"],
  media: ["create", "delete"],
  notification: ["announce", "cancel_announcement"],
  offer: ["create", "update", "approve"],
  order: ["update", "status", "cancel", "refund", "refund_retry", "return_request", "return_approve", "return_reject", "return_receive"],
  priceList: ["create", "update", "approve"],
  product: ["create", "update", "delete", "publish", "bulk_upload"],
  review: ["moderate", "delete"],
  role: ["create", "update", "delete"],
  settings: ["upsert", "delete_override"],
  tenant: ["create", "update"],
  user: ["create", "update", "delete", "delete_self", "sign_out_everywhere"],
  variant: ["create", "update", "delete"],
  warehouse: ["create", "update"],
};
const RESOURCE_LABELS = { priceList: "Price list", auth: "Auth", cms: "CMS page" };
const label = (s) => RESOURCE_LABELS[s] || String(s).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const RESOURCE_OPTIONS = Object.keys(AUDITED)
  .sort()
  .map((r) => ({ value: r, label: label(r) }));
const ALL_ACTIONS = [...new Set(Object.values(AUDITED).flat())].sort();
const METHOD_OPTIONS = ["POST", "PATCH", "PUT", "DELETE"].map((m) => ({ value: m, label: m }));
const OUTCOME_OPTIONS = [
  { value: "success", label: "Succeeded" },
  { value: "failure", label: "Failed" },
];
const FILTERS = ["action", "resource", "method", "outcome", "statusCode", "actorId", "requestId", "ip", "resourceId", "from", "to"];
const usersApi = api.withTenant(null);

const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : v ? String(v) : "");

function statusTone(code) {
  if (!code) return "neutral";
  if (code >= 500) return "danger";
  if (code >= 400) return "warning";
  if (code >= 300) return "info";
  return "success";
}

function Outcome({ entry }) {
  const code = entry.metadata?.statusCode;
  const failed = entry.outcome === "failure" || (code && code >= 400);
  return (
    <span className="inline-flex items-center gap-1.5">
      {failed ? <Badge tone="danger">Failed</Badge> : <Badge tone="success">OK</Badge>}
      {code ? <span className="font-mono text-ui-xs text-fg-muted">{code}</span> : null}
    </span>
  );
}

function Actor({ entry, compact }) {
  const a = entry.actorId;
  if (!a) {
    const email = entry.resource === "auth" ? entry.before?.email : null;
    return (
      <span className="text-fg-muted">
        System{email ? <span className="block truncate text-ui-xs text-fg-subtle">{email}</span> : null}
      </span>
    );
  }
  const id = idOf(a);
  return (
    <span className="min-w-0">
      <Link to={`/super-admin/users/${id}`} className="text-fg hover:underline">
        {a.name || a.email || "User"}
      </Link>
      {!compact && a.email && a.name ? <span className="block truncate text-ui-xs text-fg-subtle">{a.email}</span> : null}
    </span>
  );
}

function ResourceId({ entry }) {
  const rid = idOf(entry.resourceId);
  if (!rid) return <span className="text-fg-subtle">—</span>;
  const href = entityHref(entry.resource, rid, { tenantId: idOf(entry.tenantId) });
  const short = rid.length > 12 ? `…${rid.slice(-8)}` : rid;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-ui-xs">
      {href ? (
        <Link to={href} className="text-fg hover:underline" title={rid}>
          {short}
        </Link>
      ) : (
        <span title={rid}>{short}</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ toolbar pieces */

function ActorFilter({ value, onChange, selectedLabel }) {
  return (
    <Combobox
      value={value}
      onChange={(v) => onChange(v || "")}
      queryKey={keys.users.custom("audit-actor")}
      search={(q) => usersApi.listUsers({ q, limit: 20 })}
      mapOption={(u) => ({ value: String(u.id || u._id), label: u.name || u.email, description: [u.email, u.tenant?.name].filter(Boolean).join(" · ") })}
      selectedLabel={selectedLabel || (value ? `User …${value.slice(-6)}` : "")}
      placeholder="Any actor"
      searchPlaceholder="Search users…"
      emptyText="No users match"
      clearable
      size="sm"
      className="w-full sm:w-52"
      aria-label="Filter by actor"
    />
  );
}

function MoreFilters({ table }) {
  const fields = [
    { key: "requestId", label: "Request id", placeholder: "e.g. 9onsDUgAc91f" },
    { key: "ip", label: "IP address", placeholder: "e.g. 127.0.0.1" },
    { key: "resourceId", label: "Resource id", placeholder: "24-character id" },
    { key: "statusCode", label: "HTTP status", placeholder: "e.g. 403" },
  ];
  const [draft, setDraft] = useState({});
  const active = fields.filter((f) => table.filters[f.key]).length;
  return (
    <Popover
      align="start"
      className="w-80"
      onOpenChange={(open) => open && setDraft(Object.fromEntries(fields.map((f) => [f.key, table.filters[f.key] || ""])))}
      trigger={
        <Button size="sm" leftIcon={SlidersHorizontal} className={cn(!active && "border-dashed")}>
          More filters
          {active ? <Badge tone="primary">{active}</Badge> : null}
        </Button>
      }
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          table.setFilters(Object.fromEntries(fields.map((f) => [f.key, (draft[f.key] || "").trim()])));
        }}
      >
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input size="sm" value={draft[f.key] || ""} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} className="font-mono" spellCheck={false} autoComplete="off" />
          </Field>
        ))}
        <p className="text-ui-xs text-fg-subtle">Exact matches.</p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(Object.fromEntries(fields.map((f) => [f.key, ""])))}>
            Clear
          </Button>
          <PopoverClose asChild>
            <Button size="sm" variant="primary" type="submit">
              Apply
            </Button>
          </PopoverClose>
        </div>
      </form>
    </Popover>
  );
}

/* ------------------------------------------------------------------ detail */

function EntrySheet({ entryId, entry, loading, error, onRetry, onClose, filterBy }) {
  const meta = entry?.metadata || {};
  const rid = idOf(entry?.resourceId);
  const tenantId = idOf(entry?.tenantId);
  const href = entry ? entityHref(entry.resource, rid, { tenantId }) : null;
  const actorId = idOf(entry?.actorId);
  return (
    <Sheet
      open={Boolean(entryId)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={entry ? `${label(entry.resource)} · ${entry.action.replace(/_/g, " ")}` : "Audit entry"}
      description={entry ? <DateTime value={entry.createdAt} /> : undefined}
      footer={
        entry ? (
          <div className="flex w-full flex-wrap gap-2">
            {entry.requestId ? (
              <Button size="sm" leftIcon={Filter} onClick={() => filterBy({ requestId: entry.requestId })}>
                This request
              </Button>
            ) : null}
            {actorId ? (
              <Button size="sm" leftIcon={UserIcon} onClick={() => filterBy({ actorId })}>
                This actor
              </Button>
            ) : null}
            <Button size="sm" leftIcon={Filter} onClick={() => filterBy(rid ? { resource: entry.resource, resourceId: rid } : { resource: entry.resource })}>
              This {rid ? "record" : "resource"}
            </Button>
            {href ? (
              <Button size="sm" variant="primary" rightIcon={ExternalLink} to={href} className="sm:ml-auto">
                Open {label(entry.resource).toLowerCase()}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {!entry ? (
        loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={error.status === 404 ? undefined : onRetry}
            title={error.status === 404 ? "Audit entry not found" : undefined}
            description={error.status === 404 ? "It may have expired (audit retention) or belong to a store you can’t see." : undefined}
            compact
          />
        ) : (
          <EmptyState compact icon={ScrollText} title="Audit entry not found" action={<Button size="sm" onClick={onClose}>Close</Button>} />
        )
      ) : (
        <div className="grid gap-6">
          {entry.outcome === "failure" ? (
            <Alert tone="danger" title={`The request failed${meta.statusCode ? ` (${meta.statusCode})` : ""}`}>
              <p>
                {entry.error?.message || "No error message was recorded."}
                {entry.error?.code ? <Code className="ml-1.5">{entry.error.code}</Code> : null}
              </p>
              {entry.error?.fields && Object.keys(entry.error.fields).length ? (
                <ul className="mt-1.5 grid gap-0.5 text-ui-xs">
                  {Object.entries(entry.error.fields).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-mono">{k}</span>: {String(v)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Alert>
          ) : null}
          <DescriptionList
            columns={2}
            items={[
              { label: "Actor", value: <Actor entry={entry} /> },
              { label: "Store", value: <TenantLink tenant={entry.tenantId} /> },
              { label: "Action", value: <Code>{entry.action}</Code> },
              { label: "Resource", value: <Code>{entry.resource}</Code> },
              { label: "Resource id", value: rid ? <span className="inline-flex flex-wrap items-center gap-1"><Code copy={rid}>{rid}</Code>{href ? <Link to={href} className="text-ui-xs text-primary-soft-fg hover:underline">Open</Link> : null}</span> : null },
              { label: "Request id", value: entry.requestId ? <Code copy>{entry.requestId}</Code> : null },
              { label: "Request", value: meta.method ? <span className="break-all font-mono text-ui-xs">{meta.method} {meta.path}</span> : null, className: "sm:col-span-2" },
              { label: "Outcome", value: <Outcome entry={entry} /> },
              { label: "IP address", value: entry.ip ? <Code copy>{entry.ip}</Code> : null },
              { label: "User agent", value: entry.userAgent ? <span className="break-all text-ui-xs text-fg-muted">{entry.userAgent}</span> : null, className: "sm:col-span-2" },
              { label: "Entry id", value: <Code copy>{String(entry._id)}</Code> },
            ]}
          />
          <section className="grid gap-2" aria-labelledby="audit-changes">
            <div>
              <h3 id="audit-changes" className="text-ui font-semibold text-fg">Changes</h3>
              <p className="text-ui-xs text-fg-subtle">
                “Before” is the record as it was before the request ran; “after” is what the API returned. Secrets are removed and snapshots over 10 KB are
                dropped. Failed requests keep no “before”.
              </p>
            </div>
            {entry.before == null && entry.after == null ? (
              <p className="text-ui-sm text-fg-subtle">Nothing recorded for this request.</p>
            ) : entry.before == null ? (
              <p className="text-ui-sm text-fg-muted">No previous state was recorded (a create, a failed call, or a resource without snapshots). The response is under raw snapshots.</p>
            ) : (
              <JsonDiff before={entry.before} after={entry.after} empty="No field changed." />
            )}
          </section>
          <details className="group rounded-md border border-border">
            <summary className="cursor-pointer select-none px-3 py-2 text-ui-sm font-medium text-fg hover:bg-surface-hover">Raw snapshots</summary>
            <div className="grid gap-3 border-t border-border p-3">
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">Before (previous state)</p>
                <JsonBlock value={entry.before} />
              </div>
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">After (response)</p>
                <JsonBlock value={entry.after} />
              </div>
              {meta.input !== undefined ? (
                <div className="grid gap-1">
                  <p className="text-ui-xs font-medium text-fg-subtle">Request body</p>
                  <JsonBlock value={meta.input} />
                </div>
              ) : null}
              <div className="grid gap-1">
                <p className="text-ui-xs font-medium text-fg-subtle">Metadata</p>
                <JsonBlock value={meta} />
              </div>
            </div>
          </details>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ page */

export default function Audit() {
  const scope = useTenantScope();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const table = useUrlTableState({ filters: FILTERS, defaults: { limit: 20 } });
  const listQuery = useMemo(() => ({ ...table.query, tenant: scope.tenantId || undefined }), [table.query, scope.tenantId]);

  const q = useQuery({
    queryKey: keys.audit.list(listQuery),
    queryFn: () => scope.api.listAudit(table.query),
    ...listQueryOptions,
  });
  const rows = useMemo(() => q.data?.data || [], [q.data]);
  const entryId = params.get("entry") || "";

  // Remember actor names seen in results so the actor filter can label its value.
  const [actorNames, setActorNames] = useState({});
  useEffect(() => {
    const found = {};
    rows.forEach((r) => {
      const id = idOf(r.actorId);
      if (id && r.actorId?.name) found[id] = r.actorId.name;
    });
    if (Object.keys(found).length) setActorNames((m) => ({ ...m, ...found }));
  }, [rows]);

  // Deep link: GET /audit/:id, seeded from any cached list page so the sheet opens instantly.
  const cached = useMemo(() => {
    if (!entryId) return undefined;
    for (const [, data] of qc.getQueriesData({ queryKey: keys.audit.lists() })) {
      const hit = data?.data?.find?.((r) => String(r._id) === entryId);
      if (hit) return hit;
    }
    return undefined;
  }, [entryId, qc]);
  const entryQ = useQuery({
    queryKey: keys.audit.detail(entryId),
    queryFn: () => usersApi.getAuditEntry(entryId),
    enabled: Boolean(entryId),
    placeholderData: cached,
    staleTime: 5 * 60_000,
  });
  const entry = entryId ? entryQ.data || null : null;

  const hrefFor = (r) => {
    const p = new URLSearchParams(params);
    p.set("entry", String(r._id));
    return `?${p.toString()}`;
  };
  const closeEntry = () =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete("entry");
      return p;
    });
  const filterBy = (patch) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      ["page", "entry", "requestId", "actorId", "resource", "resourceId", "action"].forEach((k) => p.delete(k));
      Object.entries(patch).forEach(([k, v]) => v && p.set(k, v));
      return p;
    });

  const resources = String(table.filters.resource || "").split(",").filter((r) => AUDITED[r]);
  const actionOptions = (resources.length ? [...new Set(resources.flatMap((r) => AUDITED[r]))].sort() : ALL_ACTIONS).map((a) => ({ value: a, label: a.replace(/_/g, " ") }));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change attempted through the API — including refused and failed ones: who, from where, the state before and the result."
        breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "Audit log" }]}
      />
      <DataTable
        storageKey="sa-audit"
        exportFilename="audit-log"
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={hrefFor}
        caption="Audit log entries"
        toolbar={
          <div className="grid gap-2">
            <FilterBar
              table={table}
              searchPlaceholder="Search action, path, actor, ids…"
              facets={[
                { key: "outcome", title: "Outcome", options: OUTCOME_OPTIONS },
                { key: "resource", title: "Resource", options: RESOURCE_OPTIONS, multiple: true },
                { key: "action", title: "Action", options: actionOptions, multiple: true },
                { key: "method", title: "Method", options: METHOD_OPTIONS, multiple: true },
              ]}
              dateRange={{ from: "from", to: "to" }}
            >
              <ActorFilter value={table.filters.actorId} onChange={(v) => table.setFilter("actorId", v)} selectedLabel={actorNames[table.filters.actorId]} />
              <TenantFilter value={scope.tenantId} onChange={scope.setTenant} placeholder="All stores" />
              <MoreFilters table={table} />
            </FilterBar>
            {scope.fromContext ? <p className="text-ui-xs text-fg-subtle">Showing entries for the store picked in the tenant switcher.</p> : null}
          </div>
        }
        columns={[
          { id: "time", header: "Time", primary: true, mobile: "title", cell: (r) => <DateTime value={r.createdAt} />, csv: (r) => r.createdAt },
          { id: "actor", header: "Actor", mobile: "subtitle", cell: (r) => <Actor entry={r} compact />, csv: (r) => (r.actorId ? r.actorId.email || r.actorId.name || idOf(r.actorId) : "System") },
          { id: "action", header: "Action", cell: (r) => <Code>{r.action}</Code>, csv: (r) => r.action },
          { id: "resource", header: "Resource", cell: (r) => label(r.resource), csv: (r) => r.resource },
          { id: "resourceId", header: "Resource id", cell: (r) => <ResourceId entry={r} />, csv: (r) => idOf(r.resourceId), mobile: "hidden" },
          { id: "tenant", header: "Store", cell: (r) => <TenantLink tenant={r.tenantId} />, csv: (r) => r.tenantId?.name || idOf(r.tenantId) || "Platform", mobile: "meta" },
          {
            id: "request",
            header: "Request",
            mobile: "hidden",
            cell: (r) =>
              r.metadata?.method ? (
                <span className="flex max-w-[16rem] items-center gap-1.5 font-mono text-ui-xs" title={`${r.metadata.method} ${r.metadata.path || ""}`}>
                  <span className="shrink-0 font-semibold text-fg">{r.metadata.method}</span>
                  <span className="truncate text-fg-muted">{r.metadata.path}</span>
                </span>
              ) : (
                <span className="text-fg-subtle">—</span>
              ),
            csv: (r) => (r.metadata?.method ? `${r.metadata.method} ${r.metadata.path || ""}` : ""),
          },
          { id: "status", header: "Outcome", cell: (r) => <Outcome entry={r} />, csv: (r) => `${r.outcome || ""} ${r.metadata?.statusCode ?? ""}`.trim(), mobile: "meta" },
          { id: "requestId", header: "Request id", defaultHidden: false, mobile: "hidden", cell: (r) => (r.requestId ? <Code copy>{r.requestId}</Code> : <span className="text-fg-subtle">—</span>), csv: (r) => r.requestId },
          { id: "ip", header: "IP", defaultHidden: true, cell: (r) => <span className="font-mono text-ui-xs">{r.ip || "—"}</span>, csv: (r) => r.ip },
        ]}
        emptyState={
          <EmptyState
            icon={ScrollText}
            title={table.activeCount || scope.tenantId ? "No matching entries" : "No audit entries yet"}
            description={table.activeCount || scope.tenantId ? "Try a wider date range or fewer filters." : "Changes made through the API are recorded here."}
            action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : null}
          />
        }
      />
      <p className="mt-3 text-ui-xs text-fg-subtle">Times in IST. Refused (403), invalid (400) and failed requests are recorded with outcome “Failed”. Download exports the current page.</p>
      <EntrySheet entryId={entryId} entry={entry} loading={entryQ.isPending} error={entryQ.error} onRetry={entryQ.refetch} onClose={closeEntry} filterBy={filterBy} />
    </>
  );
}
