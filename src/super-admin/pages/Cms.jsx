import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { prettyStatus } from "../../shared/auth.js";
import { CMS_STATUSES, CMS_TYPES, statusOptions } from "../../shared/lib/panel.js";
import {
  Alert,
  Badge,
  Button,
  Code,
  ConfirmDialog,
  DataTable,
  DateTime,
  Dialog,
  DropdownMenu,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  MenuItem,
  MenuSeparator,
  NativeSelect,
  PageHeader,
  RadioGroup,
  RelativeTime,
  StatusPill,
  TenantCombobox,
  Tooltip,
} from "../../shared/ui/index.js";
import { slugify as slugifyPreview } from "./lib/cmsSections.jsx";
import { TenantFilter, TenantLink, tenantIdOf, useTenantScope } from "./lib/tenantScope.jsx";

const B = "/super-admin/cms";
const platformApi = api.withTenant(null);

export default function Cms() {
  const can = useCan();
  const navigate = useNavigate();
  const scope = useTenantScope();
  // ?pages=: with a store filter "own" hides the global pages (included by default); without one "global" lists only global pages.
  const table = useUrlTableState({ filters: ["status", "type", "pages"], defaults: { limit: 20 } });
  const { pages, ...rest } = table.query;
  const apiQuery = scope.tenantId
    ? { ...rest, includeGlobal: pages === "own" ? undefined : "true" }
    : { ...rest, globalOnly: pages === "global" ? "true" : undefined };
  const q = useQuery({
    queryKey: keys.cms.list({ ...apiQuery, tenant: scope.tenantId || "all" }),
    queryFn: () => scope.api.listCmsAdmin(apiQuery),
    ...listQueryOptions,
  });
  const pageFacet = scope.tenantId
    ? { key: "pages", title: "Pages", options: [{ value: "own", label: "Only this store’s pages" }] }
    : { key: "pages", title: "Owner", options: [{ value: "global", label: "Global pages only" }] };
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState(null);

  const remove = useApiMutation((page) => platformApi.deleteCmsPage(page._id), {
    invalidate: [keys.cms.all],
    success: (_d, page) => `Deleted “${page.title}”`,
    error: false,
  });

  const createButton = can("cms.create") ? (
    <Button variant="primary" leftIcon={Plus} onClick={() => setCreateOpen(true)}>
      New page
    </Button>
  ) : (
    <Tooltip content="Requires cms.create">
      <span>
        <Button variant="primary" leftIcon={Plus} disabled>
          New page
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <>
      <PageHeader
        title="CMS"
        description="Content pages for the marketplace (global) and for individual stores. Drafts are private until published."
        breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "CMS" }]}
        primaryAction={createButton}
      />
      {scope.tenantId && table.filters.pages !== "own" ? (
        <p className="mb-3 text-ui-sm text-fg-muted">
          Showing <TenantLink tenant={scope.tenantId} />’s pages together with the global pages its storefront falls back to.
        </p>
      ) : null}
      <DataTable
        storageKey="sa-cms"
        exportFilename="cms-pages"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(p) => `${B}/${p._id}`}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Search title or slug"
            facets={[
              { key: "status", title: "Status", options: statusOptions(CMS_STATUSES) },
              { key: "type", title: "Type", options: statusOptions(CMS_TYPES) },
              pageFacet,
            ]}
          >
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} />
          </FilterBar>
        }
        columns={[
          { id: "title", header: "Title", accessorKey: "title", primary: true, hideable: false },
          { id: "slug", header: "Slug", cell: (p) => <Code>/{p.slug}</Code>, csv: (p) => p.slug, mobile: "subtitle" },
          { id: "type", header: "Type", cell: (p) => prettyStatus(p.type), csv: (p) => p.type, mobile: "meta" },
          {
            id: "owner",
            header: "Owner",
            cell: (p) => (p.global || !tenantIdOf(p.tenantId) ? <Badge tone="accent">Global</Badge> : <TenantLink tenant={p.tenantId} />),
            csv: (p) => p.tenantId?.name || (tenantIdOf(p.tenantId) ? tenantIdOf(p.tenantId) : "Global"),
            mobile: "meta",
          },
          { id: "status", header: "Status", cell: (p) => <StatusPill status={p.status} />, csv: (p) => p.status, mobile: "meta" },
          {
            id: "scheduled",
            header: "Scheduled (IST)",
            cell: (p) => (p.scheduledAt ? <DateTime value={p.scheduledAt} /> : <span className="text-fg-subtle">—</span>),
            csv: (p) => p.scheduledAt || "",
            mobile: "hidden",
          },
          { id: "updated", header: "Updated", cell: (p) => <RelativeTime value={p.updatedAt} />, csv: (p) => p.updatedAt, mobile: "hidden" },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            hideable: false,
            align: "right",
            cell: (p) => (
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${p.title}`} size="sm" />}>
                <MenuItem icon={Pencil} to={`${B}/${p._id}`}>
                  Open editor
                </MenuItem>
                <MenuItem icon={Eye} to={`${B}/${p._id}?tab=preview`}>
                  Preview
                </MenuItem>
                <MenuSeparator />
                <MenuItem icon={Trash2} tone="danger" disabled={!can("cms.edit")} onSelect={() => setRemoving(p)}>
                  {can("cms.edit") ? "Delete…" : "Delete (requires cms.edit)"}
                </MenuItem>
              </DropdownMenu>
            ),
          },
        ]}
        emptyState={
          table.activeCount || scope.tenantId ? (
            <EmptyState icon={FileText} title="No pages match" description="Try clearing the filters or choosing another store." action={<Button onClick={() => { table.reset(); scope.setTenant(""); }}>Clear filters</Button>} />
          ) : (
            <EmptyState
              icon={FileText}
              title="No CMS pages yet"
              description="Create policy, FAQ and landing pages for the marketplace or a single store."
              action={can("cms.create") ? <Button variant="primary" leftIcon={Plus} onClick={() => setCreateOpen(true)}>New page</Button> : null}
            />
          )
        }
      />

      <CreatePageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultTenant={scope.tenantId}
        onCreated={(page) => navigate(`${B}/${page._id || page.id}`)}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Delete “${removing?.title || ""}”?`}
        description={
          removing?.status === "published"
            ? "This page is live. Deleting it removes it from the storefront immediately and deletes its version history. This cannot be undone."
            : "The page and its version history are deleted permanently. This cannot be undone."
        }
        confirmLabel="Delete page"
        tone="danger"
        typedConfirmation={removing?.slug}
        onConfirm={() => remove.mutateAsync(removing)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ create */

const EMPTY = { title: "", slug: "", type: "custom", owner: "global", tenantId: "" };

function CreatePageDialog({ open, onOpenChange, defaultTenant, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const create = useApiMutation((body) => platformApi.createCmsPage(body), {
    invalidate: [keys.cms.lists()],
    success: "Page created as a draft",
    error: false,
    onSuccess: (page) => {
      onOpenChange(false);
      onCreated(page);
    },
  });

  // Reset each time the dialog opens; default owner = the store being filtered on.
  const resetCreate = create.reset;
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, owner: defaultTenant ? "tenant" : "global", tenantId: defaultTenant || "" });
    setTouched(false);
    resetCreate();
  }, [open, defaultTenant, resetCreate]);

  const slug = slugifyPreview(form.slug || form.title);
  const errors = {
    title: !form.title.trim() ? "Title is required." : form.title.trim().length > 200 ? "At most 200 characters." : "",
    slug: form.slug && !slugifyPreview(form.slug) ? "Use letters or numbers." : form.slug.trim().length > 80 ? "At most 80 characters." : "",
    tenantId: form.owner === "tenant" && !form.tenantId ? "Choose the store that owns this page." : "",
  };
  const valid = !Object.values(errors).some(Boolean);
  const dirty = Boolean(form.title || form.slug);
  const apiErr = create.error;
  const slugApiErr = apiErr?.code === "DUPLICATE" ? "A page with this slug already exists for this owner." : apiErr?.fieldError?.("slug");

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!valid || create.isPending) return;
    const body = { title: form.title.trim(), type: form.type };
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (form.owner === "global") body.global = true;
    else body.tenantId = form.tenantId;
    create.mutate(body);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New page"
      description="Pages start as drafts. Nothing is visible on the storefront until you publish."
      dirty={dirty}
      busy={create.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="cms-create" loading={create.isPending} disabled={touched && !valid}>
            Create and edit
          </Button>
        </>
      }
    >
      <form id="cms-create" className="grid gap-4" onSubmit={submit} noValidate>
        <Field label="Title" required error={(touched && errors.title) || apiErr?.fieldError?.("title")}>
          <Input value={form.title} maxLength={200} autoFocus onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field
          label="Slug"
          optional
          error={(touched && errors.slug) || slugApiErr}
          hint={slug ? `URL path: /${slug}` : "Generated from the title when left empty."}
        >
          <Input value={form.slug} maxLength={80} placeholder={slugifyPreview(form.title) || "shipping-policy"} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </Field>
        <Field label="Type" error={apiErr?.fieldError?.("type")}>
          <NativeSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={statusOptions(CMS_TYPES)} />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-ui-sm font-medium text-fg">Owner</legend>
          <RadioGroup
            value={form.owner}
            onValueChange={(owner) => setForm({ ...form, owner })}
            options={[
              { value: "global", label: "Global (marketplace)", description: "Shown on every store that has no page with the same slug." },
              { value: "tenant", label: "A specific store", description: "Only that store's storefront uses it; it overrides a global page with the same slug." },
            ]}
          />
        </fieldset>
        {form.owner === "tenant" ? (
          <Field label="Store" required error={(touched && errors.tenantId) || apiErr?.fieldError?.("tenantId")}>
            <TenantCombobox value={form.tenantId} onChange={(id) => setForm({ ...form, tenantId: id || "" })} placeholder="Search stores…" />
          </Field>
        ) : null}
        {apiErr && !slugApiErr && !Object.keys(apiErr.fields || {}).length ? <Alert tone="danger">{apiErr.message}</Alert> : null}
      </form>
    </Dialog>
  );
}
