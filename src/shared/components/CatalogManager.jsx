import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderTree, ImageIcon, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { useCan } from "../context/AuthContext.jsx";
import { useApiMutation, useInvalidate } from "../hooks/useApiMutation.js";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  NativeSelect,
  Sheet,
  SkeletonText,
  StatusPill,
} from "../ui/index.js";
import { MediaPickerButton } from "./MediaLibrary.jsx";
import { PermissionGate } from "./PermissionGate.jsx";

const CONFIG = {
  category: {
    title: "Categories",
    singular: "category",
    icon: FolderTree,
    perms: { create: "categories.create", edit: "categories.edit", delete: "categories.delete" },
    key: keys.categories,
    list: (api) => api.listCategories(),
    create: (api, body) => api.createCategory(body),
    update: (api, id, body) => api.updateCategory(id, body),
    remove: (api, id) => api.deleteCategory(id),
    folder: "categories",
    imageField: "image",
  },
  brand: {
    title: "Brands",
    singular: "brand",
    icon: Tag,
    perms: { create: "brands.create", edit: "brands.edit", delete: "brands.delete" },
    key: keys.brands,
    list: (api) => api.listBrands(),
    create: (api, body) => api.createBrand(body),
    update: (api, id, body) => api.updateBrand(id, body),
    remove: (api, id) => api.deleteBrand(id),
    folder: "brands",
    imageField: "logo",
  },
};

const rowsOf = (res) => (Array.isArray(res) ? res : res?.data || []);
const idOf = (v) => (v && typeof v === "object" ? v._id : v) || "";

function emptyForm(kind) {
  return kind === "category" ? { name: "", slug: "", status: "active", parentId: "", sortOrder: "", image: "" } : { name: "", slug: "", status: "active", logo: "" };
}

function formFrom(kind, row) {
  if (!row) return emptyForm(kind);
  return kind === "category"
    ? { name: row.name || "", slug: row.slug || "", status: row.status || "active", parentId: idOf(row.parentId), sortOrder: row.sortOrder ?? "", image: row.image || "" }
    : { name: row.name || "", slug: row.slug || "", status: row.status || "active", logo: row.logo || "" };
}

/**
 * Categories / brands manager in a side sheet (both panels).
 *
 *   <CatalogManager kind="category" open={open} onOpenChange={setOpen} />
 *   <CatalogManager kind="brand" open onOpenChange apiClient={api.withTenant(id)} />
 * Legacy: `onClose` without `open` renders it open. `onChanged()` fires after every save/delete.
 * Global (platform) categories are listed read-only for store staff.
 */
export default function CatalogManager({ kind = "category", open, onOpenChange, onClose, onChanged, apiClient = defaultApi, isPlatform = false }) {
  const cfg = CONFIG[kind] || CONFIG.category;
  const can = useCan();
  const isOpen = open ?? true;
  const setOpen = (v) => {
    onOpenChange?.(v);
    if (!v) onClose?.();
  };

  const invalidate = useInvalidate();
  const q = useQuery({ queryKey: cfg.key.list({ manager: true }), queryFn: () => cfg.list(apiClient), enabled: isOpen });
  const rows = rowsOf(q.data);
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [form, setForm] = useState(emptyForm(kind));
  const [initial, setInitial] = useState(emptyForm(kind));
  const [confirmLeave, setConfirmLeave] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const dirty = editing !== null && JSON.stringify(form) !== JSON.stringify(initial);

  const byId = useMemo(() => Object.fromEntries(rows.map((r) => [String(r._id), r])), [rows]);
  const readOnly = (row) => kind === "category" && !row.tenantId && !isPlatform;

  const save = useApiMutation(
    (body) => (editing === "new" ? cfg.create(apiClient, body) : cfg.update(apiClient, editing._id, body)),
    {
      invalidate: [cfg.key.all, keys.products.lists()],
      success: editing === "new" ? `${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)} created` : "Changes saved",
      error: false,
      onSuccess: () => {
        setEditing(null);
        onChanged?.();
      },
    }
  );

  function startEdit(target) {
    const next = formFrom(kind, target === "new" ? null : target);
    setForm(next);
    setInitial(next);
    save.reset();
    setEditing(target);
  }

  function guard(action) {
    if (dirty) setConfirmLeave(() => action);
    else action();
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const body = { name: form.name.trim(), status: form.status };
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (kind === "category") {
      body.parentId = form.parentId || null;
      if (form.sortOrder !== "" && form.sortOrder != null) body.sortOrder = Math.trunc(Number(form.sortOrder));
      body.image = form.image || "";
    } else {
      body.logo = form.logo || "";
    }
    save.mutate(body);
  }

  const err = save.error;
  const nameErr = !form.name.trim() && dirty ? "Name is required" : undefined;
  const sortErr = form.sortOrder !== "" && !Number.isFinite(Number(form.sortOrder)) ? "Must be a number" : undefined;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => (v ? setOpen(true) : guard(() => setOpen(false)))}
      title={editing === "new" ? `New ${cfg.singular}` : editing ? `Edit ${editing.name}` : cfg.title}
      description={editing ? undefined : kind === "category" ? "Organise products for the storefront navigation. Platform-wide categories are shared and read-only." : "Brands shown on product pages and filters."}
      size="lg"
      dirty={dirty}
      busy={save.isPending}
      footer={
        editing ? (
          <>
            <Button onClick={() => guard(() => setEditing(null))} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="catalog-manager-form" variant="primary" loading={save.isPending} disabled={!dirty || Boolean(nameErr) || Boolean(sortErr)}>
              {editing === "new" ? `Create ${cfg.singular}` : "Save changes"}
            </Button>
          </>
        ) : null
      }
    >
      {editing ? (
        <form id="catalog-manager-form" onSubmit={submit} className="grid gap-4">
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="justify-self-start" onClick={() => guard(() => setEditing(null))}>
            All {cfg.title.toLowerCase()}
          </Button>
          <Field label="Name" required error={nameErr || err?.fieldError?.("name")}>
            <Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Slug" optional hint="Lowercase URL name. Generated from the name when empty." error={err?.fieldError?.("slug")}>
            <Input value={form.slug} maxLength={80} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </Field>
          <Field label="Status" error={err?.fieldError?.("status")}>
            <NativeSelect
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive (hidden from the storefront)" },
              ]}
            />
          </Field>
          {kind === "category" ? (
            <>
              <Field label="Parent category" optional error={err?.fieldError?.("parentId")}>
                <NativeSelect
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  options={[{ value: "", label: "None (top level)" }, ...rows.filter((r) => editing === "new" || String(r._id) !== String(editing._id)).map((r) => ({ value: String(r._id), label: `${r.name}${r.tenantId ? "" : " (global)"}` }))]}
                />
              </Field>
              <Field label="Sort order" optional hint="Lower numbers come first." error={sortErr || err?.fieldError?.("sortOrder")}>
                <Input type="number" step={1} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-32" />
              </Field>
            </>
          ) : null}
          <Field label={kind === "category" ? "Image" : "Logo"} optional error={err?.fieldError?.(cfg.imageField)}>
            <MediaPickerButton value={form[cfg.imageField]} onChange={(url) => setForm({ ...form, [cfg.imageField]: url })} folder={cfg.folder} label={kind === "category" ? "Category image" : "Brand logo"} apiClient={apiClient} />
          </Field>
          {err && !Object.keys(err.fields || {}).length ? <Alert tone="danger">{err.message}</Alert> : null}
        </form>
      ) : (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <PermissionGate perm={cfg.perms.create}>
              <Button size="sm" variant="primary" leftIcon={Plus} onClick={() => startEdit("new")}>
                New {cfg.singular}
              </Button>
            </PermissionGate>
          </div>
          {q.isPending ? (
            <SkeletonText lines={6} />
          ) : q.error ? (
            <ErrorState error={q.error} onRetry={q.refetch} compact />
          ) : !rows.length ? (
            <EmptyState
              icon={cfg.icon}
              title={`No ${cfg.title.toLowerCase()} yet`}
              description={`Create a ${cfg.singular} to organise your catalog.`}
              compact
              action={can(cfg.perms.create) ? <Button size="sm" variant="primary" onClick={() => startEdit("new")}>New {cfg.singular}</Button> : null}
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {rows.map((row) => {
                const ro = readOnly(row);
                const img = row[cfg.imageField];
                const parent = kind === "category" && row.parentId ? byId[idOf(row.parentId)] : null;
                return (
                  <li key={row._id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunken">
                      {img ? <img src={img} alt="" className="size-full object-cover" loading="lazy" /> : <ImageIcon aria-hidden className="size-4 text-fg-subtle" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-ui-sm font-medium text-fg">
                        {row.name}
                        {ro ? <Badge tone="outline">Global</Badge> : null}
                        {row.status && row.status !== "active" ? <StatusPill status={row.status} /> : null}
                      </p>
                      <p className="truncate text-ui-xs text-fg-subtle">
                        /{row.slug}
                        {parent ? ` · in ${parent.name}` : ""}
                      </p>
                    </div>
                    {!ro ? (
                      <div className="flex shrink-0 gap-1">
                        <PermissionGate perm={cfg.perms.edit} mode="hide">
                          <IconButton icon={Pencil} size="sm" label={`Edit ${row.name}`} onClick={() => startEdit(row)} />
                        </PermissionGate>
                        <PermissionGate perm={cfg.perms.delete} mode="hide">
                          <IconButton icon={Trash2} size="sm" label={`Delete ${row.name}`} className="text-danger-fg" onClick={() => setToDelete(row)} />
                        </PermissionGate>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name || ""}?`}
        description={`The ${cfg.singular} is removed permanently. It can’t be deleted while live products use it${kind === "category" ? " or it has sub-categories" : ""}.`}
        confirmLabel={`Delete ${cfg.singular}`}
        tone="danger"
        onConfirm={async () => {
          await cfg.remove(apiClient, toDelete._id);
          await invalidate(cfg.key.all);
          onChanged?.();
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmLeave)}
        onOpenChange={(o) => !o && setConfirmLeave(null)}
        title="Discard unsaved changes?"
        description="Your edits to this form will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => {
          const action = confirmLeave;
          setConfirmLeave(null);
          setForm(initial);
          action?.();
        }}
      />
    </Sheet>
  );
}
