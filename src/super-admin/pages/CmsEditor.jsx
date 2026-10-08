import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  UserCog,
} from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { prettyStatus } from "../../shared/auth.js";
import { CMS_TYPES, statusOptions } from "../../shared/lib/panel.js";
import { formatDateTime, fromIstInputValue, toIstInputValue } from "../../shared/lib/format.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  ConfirmDialog,
  DateTime,
  DescriptionList,
  Dialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  MenuItem,
  MenuSeparator,
  NativeSelect,
  PageHeader,
  PageSkeleton,
  RadioGroup,
  RelativeTime,
  Sheet,
  Skeleton,
  StatusPill,
  TabPanel,
  Tabs,
  TenantCombobox,
  Textarea,
  Tooltip,
  UnsavedChangesDialog,
  toast,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import { JsonDiff } from "./lib/diff.jsx";
import { TenantLink, tenantIdOf } from "./lib/tenantScope.jsx";
import {
  KIND_LABEL,
  PagePreview,
  SECTION_KINDS,
  SectionEditor,
  blankSection,
  fromItems,
  kindIcon,
  newKey,
  sectionSummary,
  slugify,
  toItems,
  validateSections,
} from "./lib/cmsSections.jsx";

const B = "/super-admin/cms";
// CMS admin routes are tenant-filtered by X-Tenant-Id. Without the header a platform admin can
// reach every page (global and store-owned), so the editor never sends the topbar tenant.
const platformApi = api.withTenant(null);

const LIMITS = { title: 200, slug: 80, seoTitle: 200, seoDescription: 500, seoCanonical: 500 };

/** Mirrors cms/service.js TRANSITIONS (target ← allowed sources) and route permissions. */
const ACTIONS = {
  review: { from: ["draft", "unpublished"], perm: "cms.edit", label: "Submit for review", verb: "submit for review", icon: Send },
  publish: { from: ["draft", "review", "unpublished"], perm: "cms.publish", label: "Publish", verb: "publish", icon: Eye },
  unpublish: { from: ["published"], perm: "cms.publish", label: "Unpublish", verb: "unpublish", icon: EyeOff },
  draft: { from: ["review", "unpublished"], perm: "cms.edit", label: "Back to draft", verb: "move back to draft", icon: Undo2 },
};
const TRANSITION_TOAST = { publish: "Page published", unpublish: "Page unpublished", review: "Submitted for review", draft: "Moved back to draft" };
const SCHEDULABLE = ["draft", "review"];

/** Version history entry actions (cms/service.js recordVersion). */
const VERSION_ACTIONS = {
  edit: "Edited",
  review: "Submitted for review",
  publish: "Published",
  unpublish: "Unpublished",
  draft: "Moved back to draft",
  schedule: "Publish scheduled",
  unschedule: "Schedule cancelled",
};

const isConflict = (err) => err?.status === 409 && err?.code === "CONFLICT";

/* ------------------------------------------------------------------ helpers */

const str = (v) => (v == null ? "" : String(v));
const rev = (p) => `${p?.version ?? 0}|${p?.updatedAt ?? ""}`;

function toForm(page) {
  return {
    title: str(page?.title),
    slug: str(page?.slug),
    type: page?.type || "custom",
    seo: { title: str(page?.seo?.title), description: str(page?.seo?.description), canonical: str(page?.seo?.canonical) },
  };
}

/** Comparable view of a page (used for diffs). */
function pick(page, sections) {
  return {
    title: str(page?.title),
    slug: str(page?.slug),
    type: page?.type || "custom",
    status: page?.status,
    owner: tenantIdOf(page?.tenantId) || "global",
    scheduledAt: page?.scheduledAt || null,
    seo: { title: str(page?.seo?.title), description: str(page?.seo?.description), canonical: str(page?.seo?.canonical) },
    sections: sections ?? page?.sections ?? [],
  };
}

function formAsPage(base, form, items) {
  return {
    ...pick(base),
    title: form.title.trim(),
    slug: slugify(form.slug),
    type: form.type,
    seo: { title: form.seo.title.trim(), description: form.seo.description.trim(), canonical: form.seo.canonical.trim() },
    sections: fromItems(items),
  };
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** PATCH body with only the fields that differ from `base` (validator is partial + strict + non-empty). */
function buildPatch(base, form, items) {
  const before = pick(base);
  const after = formAsPage(base, form, items);
  const patch = {};
  if (after.title !== before.title) patch.title = after.title;
  if (after.slug !== before.slug) patch.slug = form.slug.trim();
  if (after.type !== before.type) patch.type = after.type;
  if (!same(after.seo, before.seo)) patch.seo = after.seo;
  if (!same(after.sections, before.sections)) patch.sections = after.sections;
  return patch;
}

/** Keep the populated tenant object when the server returns a bare id (PATCH / transitions). */
function mergeTenant(prev, next) {
  if (next?.tenantId && typeof next.tenantId === "object") return next;
  const nextId = tenantIdOf(next?.tenantId);
  return { ...next, tenantId: nextId && nextId === tenantIdOf(prev?.tenantId) ? prev.tenantId : next?.tenantId ?? null };
}

/* ------------------------------------------------------------------ page */

export default function CmsEditor() {
  const { id } = useParams();
  const q = useQuery({ queryKey: keys.cms.detail(id), queryFn: () => platformApi.getCmsPage(id) });
  if (q.isPending) return <PageSkeleton />;
  if (q.error) {
    return (
      <>
        <PageHeader title="CMS page" back={B} breadcrumbs={[{ label: "CMS", to: B }, { label: "Page" }]} />
        <Card>
          <ErrorState error={q.error} onRetry={q.refetch} title={q.error.status === 404 ? "Page not found" : undefined} />
        </Card>
      </>
    );
  }
  return <Editor key={id} id={id} remote={q.data} />;
}

function Editor({ id, remote }) {
  const can = useCan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [base, setBaseState] = useState(remote); // the server revision the editor is based on
  const baseRef = useRef(remote);
  const setBase = useCallback((next) => {
    const value = typeof next === "function" ? next(baseRef.current) : next;
    baseRef.current = value;
    setBaseState(value);
  }, []);
  const [form, setForm] = useState(() => toForm(remote));
  const [items, setItems] = useState(() => toItems(remote.sections));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [conflict, setConflict] = useState(null); // { fresh, then?: action }
  const [remoteChanged, setRemoteChanged] = useState(null);
  const [transition, setTransition] = useState(null); // { action, dirty } (dirty captured when opened)
  const [busyAction, setBusyAction] = useState("");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [announce, setAnnounce] = useState("");

  const sections = useMemo(() => fromItems(items), [items]);
  const dirty = useMemo(() => !same(toForm(base), form) || !same(sections, base.sections || []), [base, form, sections]);

  const status = base.status;
  const isLive = status === "published";
  const canEdit = can("cms.edit") && (!isLive || can("cms.publish"));
  const editBlockReason = !can("cms.edit") ? "Requires cms.edit" : isLive && !can("cms.publish") ? "Editing a published page requires cms.publish" : "";

  const blocker = useUnsavedChangesGuard(dirty && !saving && !leaving);

  const adopt = useCallback(
    (page) => {
      setBase(mergeTenant(baseRef.current, page));
      setForm(toForm(page));
      setItems(toItems(page.sections));
      setTouched(false);
      setSaveError(null);
      setRemoteChanged(null);
    },
    [setBase]
  );

  /** Status/owner/schedule changes that don't touch editable content: keep unsaved edits. */
  const adoptMeta = useCallback((page) => setBase(mergeTenant(baseRef.current, page)), [setBase]);

  /** 409 CONFLICT: load the current page and open the compare dialog. */
  const openConflict = useCallback(
    async (then) => {
      const fresh = await platformApi.getCmsPage(id).catch(() => null);
      if (fresh) setConflict({ fresh, then });
      else toast.error("This page was changed by someone else. Reload to see the latest version.");
    },
    [id]
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: keys.cms.detail(id) });
    queryClient.invalidateQueries({ queryKey: keys.cms.lists() });
    queryClient.invalidateQueries({ queryKey: keys.cms.sub(id, "versions") });
  }, [queryClient, id]);

  // Background refetch (window focus etc.) brought a newer revision.
  useEffect(() => {
    if (!remote) return;
    if (rev(remote) === rev(base)) {
      if (remote.tenantId && typeof remote.tenantId === "object" && typeof base.tenantId !== "object") setBase((b) => ({ ...b, tenantId: remote.tenantId }));
      return;
    }
    if (saving || busyAction) return;
    if (!dirty) adopt(remote);
    else setRemoteChanged(remote);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote]);

  /* -------------------------------------------------------------- validation */

  const sectionProblems = useMemo(() => validateSections(sections), [sections]);
  const errors = useMemo(() => {
    const e = {};
    const title = form.title.trim();
    if (!title) e.title = "Title is required.";
    else if (title.length > LIMITS.title) e.title = `At most ${LIMITS.title} characters.`;
    if (!slugify(form.slug)) e.slug = "Slug is required (letters, numbers and hyphens).";
    else if (form.slug.trim().length > LIMITS.slug) e.slug = `At most ${LIMITS.slug} characters.`;
    if (form.seo.title.length > LIMITS.seoTitle) e["seo.title"] = `At most ${LIMITS.seoTitle} characters.`;
    if (form.seo.description.length > LIMITS.seoDescription) e["seo.description"] = `At most ${LIMITS.seoDescription} characters.`;
    if (form.seo.canonical.length > LIMITS.seoCanonical) e["seo.canonical"] = `At most ${LIMITS.seoCanonical} characters.`;
    return e;
  }, [form]);
  const valid = !Object.keys(errors).length && !sectionProblems.length;
  const fieldError = (name) => (touched ? errors[name] : undefined) || saveError?.fieldError?.(name);

  /* -------------------------------------------------------------- save */

  const runTransition = useCallback(
    async (action) => {
      setBusyAction(action);
      try {
        const res = await platformApi.cmsTransition(id, action, baseRef.current.version ?? 0);
        adoptMeta(res);
        invalidate();
        toast.success(TRANSITION_TOAST[action] || "Status changed");
        return true;
      } catch (err) {
        if (isConflict(err)) {
          await openConflict(action);
          return false;
        }
        toast.error(err.message, { description: err.requestId ? `Reference: ${err.requestId}` : undefined });
        if (err.code === "INVALID_STATE") invalidate();
        return false;
      } finally {
        setBusyAction("");
      }
    },
    [id, adoptMeta, invalidate, openConflict]
  );

  /** PATCH `patch` assuming the server is at revision `against`. Returns the updated page or null. */
  const commit = useCallback(
    async (patch, against, then) => {
      if (!Object.keys(patch).length) {
        adopt(against);
        return against;
      }
      try {
        // If-Match: the server rejects the save with 409 CONFLICT when the page moved past `against`.
        const updated = await platformApi.updateCmsPage(id, patch, { version: against.version ?? 0 });
        adopt(updated);
        invalidate();
        toast.success(updated.status === "published" ? "Saved — changes are live" : "Changes saved");
        return updated;
      } catch (err) {
        if (isConflict(err)) {
          await openConflict(then);
          return null;
        }
        setSaveError(err);
        if (!Object.keys(err.fields || {}).length && err.code !== "DUPLICATE") {
          toast.error(err.message, { description: err.requestId ? `Reference: ${err.requestId}` : undefined });
        }
        return null;
      }
    },
    [id, adopt, invalidate, openConflict]
  );

  const save = useCallback(
    async (then) => {
      setTouched(true);
      setSaveError(null);
      if (!valid) {
        toast.error("Fix the highlighted fields before saving.");
        return null;
      }
      if (!canEdit) return null;
      setSaving(true);
      try {
        return await commit(buildPatch(base, form, items), base, then);
      } catch (err) {
        setSaveError(err);
        toast.error(err.message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [valid, canEdit, base, form, items, commit]
  );

  // Ctrl/Cmd+S
  const saveRef = useRef(save);
  saveRef.current = dirty && !saving ? save : null;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function overwriteWithMine() {
    const { fresh, then } = conflict;
    setSaving(true);
    try {
      setBase((prev) => mergeTenant(prev, fresh));
      const updated = await commit(buildPatch(fresh, form, items), fresh, then);
      if (updated) {
        setConflict(null);
        if (then) await runTransition(then);
      }
    } finally {
      setSaving(false);
    }
  }

  function reloadTheirs() {
    adopt(conflict.fresh);
    setConflict(null);
    toast("Loaded the latest version", { description: "Your unsaved edits were discarded." });
  }

  /* -------------------------------------------------------------- sections */

  const updateItem = (key, section) => setItems((list) => list.map((it) => (it.key === key ? { ...it, section } : it)));
  const removeItem = (key) => {
    const idx = items.findIndex((i) => i.key === key);
    setItems((list) => list.filter((it) => it.key !== key));
    setAnnounce(`Section ${idx + 1} removed`);
  };
  const duplicateItem = (key) => {
    const idx = items.findIndex((i) => i.key === key);
    if (idx < 0) return;
    const copy = { key: newKey(), section: structuredClone(items[idx].section) };
    setItems([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]);
    setAnnounce(`Section ${idx + 1} duplicated as section ${idx + 2}`);
  };
  const moveItem = (key, delta) => {
    const idx = items.findIndex((i) => i.key === key);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    [next[idx], next[to]] = [next[to], next[idx]];
    setItems(next);
    setAnnounce(`Section moved to position ${to + 1} of ${items.length}`);
  };
  const addItem = (kind) => {
    setItems((list) => [...list, { key: newKey(), section: blankSection(kind) }]);
    setAnnounce(`${KIND_LABEL[kind]} section added at position ${items.length + 1}`);
  };

  /* -------------------------------------------------------------- render */

  const ownerId = tenantIdOf(base.tenantId);
  const scheduleIgnored = base.scheduledAt && !SCHEDULABLE.includes(status);
  const available = Object.entries(ACTIONS).filter(([, a]) => a.from.includes(status));

  const transitionButtons = available.map(([key, a]) => {
    const allowed = can(a.perm);
    const btn = (
      <Button
        key={key}
        leftIcon={a.icon}
        loading={busyAction === key}
        disabled={!allowed || Boolean(busyAction) || saving}
        onClick={() => setTransition({ action: key, dirty })}
      >
        {a.label}
      </Button>
    );
    return allowed ? (
      btn
    ) : (
      <Tooltip key={key} content={`Requires ${a.perm}`}>
        <span>{btn}</span>
      </Tooltip>
    );
  });

  const saveButton = (
    <Button variant="primary" loading={saving} disabled={!dirty || !canEdit || Boolean(busyAction)} onClick={() => save()}>
      {isLive ? "Save (goes live)" : "Save"}
    </Button>
  );

  return (
    <>
      <PageHeader
        title={form.title.trim() || base.title || "Untitled page"}
        documentTitle={`${base.title || "Page"} · CMS`}
        back={B}
        breadcrumbs={[{ label: "CMS", to: B }, { label: base.title || "Page" }]}
        meta={
          <>
            <StatusPill status={status} />
            {ownerId ? <Badge tone="neutral">Store page</Badge> : <Badge tone="accent">Global</Badge>}
            {dirty ? <Badge tone="warning">Unsaved changes</Badge> : null}
          </>
        }
        description={
          <>
            <Code>/{base.slug}</Code> · {prettyStatus(base.type)} · Owner: {ownerId ? <TenantLink tenant={base.tenantId} /> : "Global (all stores)"} · Updated <RelativeTime value={base.updatedAt} />
          </>
        }
        secondaryActions={
          <>
            {dirty ? (
              <Button leftIcon={Undo2} variant="ghost" disabled={saving} onClick={() => setDiscardOpen(true)}>
                Discard
              </Button>
            ) : null}
            {transitionButtons}
            <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="More page actions" variant="secondary" />}>
              <MenuItem icon={UserCog} disabled={!canEdit || dirty} onSelect={() => setOwnerOpen(true)}>
                {dirty ? "Change owner (save first)" : "Change owner…"}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={Trash2} tone="danger" disabled={!can("cms.edit")} onSelect={() => setDeleteOpen(true)}>
                Delete page…
              </MenuItem>
            </DropdownMenu>
          </>
        }
        primaryAction={
          canEdit ? (
            saveButton
          ) : (
            <Tooltip content={editBlockReason}>
              <span>{saveButton}</span>
            </Tooltip>
          )
        }
      />

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="mb-4 grid gap-3">
        {isLive ? (
          <Alert tone="warning" title="This page is live">
            {can("cms.publish")
              ? "Saved changes go live on the storefront immediately. To stage edits, unpublish first or make them in a copy."
              : "Editing a published page requires the cms.publish permission, so saving is disabled for you."}
          </Alert>
        ) : null}
        {base.scheduledAt && !scheduleIgnored ? (
          <Alert tone="info" title="Scheduled">
            Publishes automatically on {formatDateTime(base.scheduledAt)} IST.
          </Alert>
        ) : null}
        {scheduleIgnored ? (
          <Alert tone="warning" title="Schedule ignored">
            A publish time is set ({formatDateTime(base.scheduledAt)} IST), but the scheduler only publishes drafts and pages in review.
          </Alert>
        ) : null}
        {remoteChanged ? (
          <Alert
            tone="warning"
            title="This page changed since you opened it"
            action={
              <Button size="sm" onClick={() => setConflict({ fresh: remoteChanged })}>
                Review changes
              </Button>
            }
          >
            Someone else saved or changed the status of this page. Review before saving to avoid overwriting their work.
          </Alert>
        ) : null}
        {saveError && !Object.keys(saveError.fields || {}).length && saveError.code !== "DUPLICATE" ? (
          <Alert tone="danger" title="Couldn’t save">
            {saveError.message}
            {saveError.requestId ? <span className="block font-mono text-ui-2xs">Reference: {saveError.requestId}</span> : null}
          </Alert>
        ) : null}
      </div>

      <Tabs
        urlParam="tab"
        aria-label="Page editor"
        tabs={[
          { value: "content", label: "Content", count: items.length },
          { value: "preview", label: "Preview" },
          { value: "settings", label: "SEO & publishing" },
          { value: "versions", label: "Versions", icon: History },
        ]}
      >
        <TabPanel value="content">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              <Card>
                <CardHeader title="Page" />
                <CardBody className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" required error={fieldError("title")} className="sm:col-span-2" hint={`${form.title.length}/${LIMITS.title}`}>
                    <Input value={form.title} maxLength={LIMITS.title} disabled={!canEdit} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </Field>
                  <Field
                    label="Slug"
                    required
                    error={fieldError("slug") || (saveError?.code === "DUPLICATE" ? "Another page of this owner already uses this slug." : undefined)}
                    hint={slugify(form.slug) !== form.slug ? `Saved as /${slugify(form.slug)}` : "Lowercase letters, numbers and hyphens."}
                  >
                    <Input value={form.slug} maxLength={LIMITS.slug} disabled={!canEdit} prefix="/" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  </Field>
                  <Field label="Type" error={fieldError("type")}>
                    <NativeSelect value={form.type} disabled={!canEdit} onChange={(e) => setForm({ ...form, type: e.target.value })} options={statusOptions(CMS_TYPES)} />
                  </Field>
                  {isLive && slugify(form.slug) !== base.slug ? (
                    <Alert tone="warning" className="sm:col-span-2">
                      Changing the slug of a live page breaks existing links to /{base.slug}.
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Sections"
                  description="Rendered top to bottom. Use the arrow buttons to reorder."
                  actions={<AddSectionMenu onAdd={addItem} disabled={!canEdit} />}
                />
                <CardBody className="grid gap-3">
                  {sectionProblems.some((p) => p.index === -1) ? (
                    <Alert tone="danger">{sectionProblems.filter((p) => p.index === -1).map((p) => p.message).join(" ")}</Alert>
                  ) : null}
                  {saveError?.fieldError?.("sections") ? <Alert tone="danger">{saveError.fieldError("sections")}</Alert> : null}
                  {items.length ? (
                    <ol className="grid grid-cols-[minmax(0,1fr)] gap-3" aria-label="Sections">
                      {items.map((item, index) => (
                        <SectionCard
                          key={item.key}
                          item={item}
                          index={index}
                          count={items.length}
                          disabled={!canEdit}
                          problems={touched ? sectionProblems.filter((p) => p.index === index) : []}
                          onChange={(s) => updateItem(item.key, s)}
                          onMove={(d) => moveItem(item.key, d)}
                          onDuplicate={() => duplicateItem(item.key)}
                          onRemove={() => removeItem(item.key)}
                        />
                      ))}
                    </ol>
                  ) : (
                    <EmptyState compact title="No sections yet" description="Add rich text, a hero, FAQ entries or a bestsellers strip." action={<AddSectionMenu onAdd={addItem} disabled={!canEdit} />} />
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="hidden xl:block">
              <Card className="sticky top-20">
                <CardHeader title="Live preview" description="Unsaved editor content." />
                <CardBody className="max-h-[calc(100dvh-12rem)] overflow-y-auto">
                  <PagePreview title={form.title} items={items} />
                </CardBody>
              </Card>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="preview">
          <Card>
            <CardHeader title="Preview" description="Current editor content, including unsaved changes. HTML is shown with the same allowlist the server applies on save." />
            <CardBody>
              <div className="mx-auto max-w-3xl">
                <PagePreview title={form.title} items={items} />
              </div>
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="settings">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              <Card>
                <CardHeader title="Search engine listing" description="Shown in search results and link previews." />
                <CardBody className="grid gap-4">
                  <Field label="SEO title" optional error={fieldError("seo.title")} hint={`${form.seo.title.length}/${LIMITS.seoTitle}`}>
                    <Input value={form.seo.title} maxLength={LIMITS.seoTitle} disabled={!canEdit} onChange={(e) => setForm({ ...form, seo: { ...form.seo, title: e.target.value } })} />
                  </Field>
                  <Field label="Meta description" optional error={fieldError("seo.description")} hint={`${form.seo.description.length}/${LIMITS.seoDescription}`}>
                    <Textarea rows={3} value={form.seo.description} maxLength={LIMITS.seoDescription} disabled={!canEdit} onChange={(e) => setForm({ ...form, seo: { ...form.seo, description: e.target.value } })} />
                  </Field>
                  <Field label="Canonical URL" optional error={fieldError("seo.canonical")} hint="Absolute https:// URL or a /relative path. Unsafe URLs are dropped on save.">
                    <Input value={form.seo.canonical} maxLength={LIMITS.seoCanonical} inputMode="url" disabled={!canEdit} onChange={(e) => setForm({ ...form, seo: { ...form.seo, canonical: e.target.value } })} />
                  </Field>
                </CardBody>
              </Card>
              <ScheduleCard
                id={id}
                base={base}
                dirty={dirty}
                canPublish={can("cms.publish")}
                busy={saving || Boolean(busyAction)}
                onScheduled={(page) => {
                  adoptMeta(page);
                  invalidate();
                }}
                onConflict={() => openConflict()}
              />
            </div>
            <Card>
              <CardHeader
                title="Details"
                actions={
                  <Button size="sm" leftIcon={UserCog} disabled={!canEdit || dirty} onClick={() => setOwnerOpen(true)} title={dirty ? "Save or discard your changes first" : undefined}>
                    Change owner
                  </Button>
                }
              />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: "Owner", value: ownerId ? <TenantLink tenant={base.tenantId} /> : "Global (marketplace, fallback for every store)" },
                    { label: "Status", value: <StatusPill status={status} /> },
                    { label: "Version", value: <span className="tabular-nums">{base.version ?? 0}</span> },
                    { label: "Published at", value: base.publishedAt ? <DateTime value={base.publishedAt} /> : null },
                    { label: "Created", value: <DateTime value={base.createdAt} /> },
                    { label: "Last updated", value: <DateTime value={base.updatedAt} /> },
                    { label: "Page id", value: <Code copy>{String(base._id)}</Code> },
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="versions">
          <VersionsPanel id={id} base={base} dirty={dirty} canEdit={canEdit} onRestored={(page) => { adopt(page); invalidate(); }} />
        </TabPanel>
      </Tabs>

      {/* Transition: clean editor → plain confirm; dirty editor → ask what to do with the edits. */}
      <TransitionDialog
        action={transition?.action}
        page={base}
        dirty={Boolean(transition?.dirty)}
        busy={saving || Boolean(busyAction)}
        onClose={() => setTransition(null)}
        onConfirm={async (mode) => {
          const { action } = transition;
          if (mode === "save") {
            const saved = await save(action);
            if (!saved) {
              setTransition(null);
              return;
            }
          }
          const ok = await runTransition(action);
          if (ok) setTransition(null);
        }}
      />

      <ConflictDialog
        conflict={conflict}
        base={base}
        mine={formAsPage(base, form, items)}
        busy={saving}
        onCancel={() => setConflict(null)}
        onReload={reloadTheirs}
        onOverwrite={overwriteWithMine}
      />

      <OwnerDialog
        open={ownerOpen}
        onOpenChange={setOwnerOpen}
        page={base}
        onSaved={(page) => {
          adoptMeta(page);
          invalidate();
        }}
        id={id}
      />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard unsaved changes?"
        description="The editor goes back to the last saved version. This cannot be undone."
        confirmLabel="Discard changes"
        tone="danger"
        onConfirm={() => adopt(base)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${base.title}”?`}
        description={
          isLive
            ? "This page is live. Deleting it removes it from the storefront immediately and deletes all saved versions. This cannot be undone."
            : "The page and all its saved versions are deleted permanently. This cannot be undone."
        }
        confirmLabel="Delete page"
        tone="danger"
        typedConfirmation={base.slug}
        onConfirm={async () => {
          await platformApi.deleteCmsPage(id);
          setLeaving(true);
          queryClient.invalidateQueries({ queryKey: keys.cms.lists() });
          toast.success(`Deleted “${base.title}”`);
          setTimeout(() => navigate(B, { replace: true }), 0);
        }}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}

/* ------------------------------------------------------------------ sections UI */

function AddSectionMenu({ onAdd, disabled }) {
  return (
    <DropdownMenu
      trigger={
        <Button size="sm" leftIcon={Plus} disabled={disabled}>
          Add section
        </Button>
      }
    >
      {SECTION_KINDS.map((k) => (
        <MenuItem key={k.kind} icon={k.icon} onSelect={() => onAdd(k.kind)}>
          {k.label}
        </MenuItem>
      ))}
    </DropdownMenu>
  );
}

function SectionCard({ item, index, count, disabled, problems, onChange, onMove, onDuplicate, onRemove }) {
  const [open, setOpen] = useState(true);
  const { section } = item;
  const Icon = kindIcon(section?.kind);
  const label = KIND_LABEL[section?.kind] || `Custom: ${section?.kind || "no kind"}`;
  const summary = sectionSummary(section);
  const bodyId = `sec-${item.key}`;
  return (
    <li className={cn("rounded-lg border bg-surface", problems.length ? "border-danger" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown aria-hidden className="size-4 text-fg-subtle" /> : <ChevronRight aria-hidden className="size-4 text-fg-subtle" />}
          <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-surface-sunken text-ui-2xs font-semibold tabular-nums text-fg-muted">{index + 1}</span>
          <Icon aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          <span className="shrink-0 text-ui-sm font-medium text-fg">{label}</span>
          {summary ? <span className="truncate text-ui-sm text-fg-subtle">· {summary}</span> : null}
        </button>
        <div className="flex items-center gap-0.5">
          <IconButton icon={ArrowUp} size="xs" label={`Move section ${index + 1} up`} disabled={disabled || index === 0} onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} size="xs" label={`Move section ${index + 1} down`} disabled={disabled || index === count - 1} onClick={() => onMove(1)} />
          <IconButton icon={Copy} size="xs" label={`Duplicate section ${index + 1}`} disabled={disabled} onClick={onDuplicate} />
          <IconButton icon={Trash2} size="xs" variant="danger-ghost" label={`Remove section ${index + 1}`} disabled={disabled} onClick={onRemove} />
        </div>
      </div>
      {open ? (
        <div id={bodyId} className="border-t border-border p-3">
          <SectionEditor section={section} onChange={onChange} problems={problems} disabled={disabled} idPrefix={bodyId} />
          {problems.filter((p) => !p.field).map((p) => (
            <p key={p.message} role="alert" className="mt-2 text-ui-xs text-danger-fg">
              {p.message}
            </p>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ dialogs */

function transitionCopy(action, page) {
  const owner = tenantIdOf(page.tenantId);
  const where = owner
    ? `on ${page.tenantId?.name || "the store"}’s storefront`
    : "on the marketplace storefront, and on every store that has no page of its own with this slug";
  if (action === "publish") {
    return `“${page.title}” goes live at /${page.slug} ${where}.${page.scheduledAt ? " The scheduled publish time is cleared." : ""}`;
  }
  if (action === "unpublish") {
    return owner
      ? `The page is removed from the storefront immediately. Visitors to /${page.slug} see the global page with the same slug if one is published, otherwise “not found”. You can publish it again later.`
      : `The page is removed from the storefront immediately. Stores without their own /${page.slug} page will show “not found”. You can publish it again later.`;
  }
  if (action === "draft") {
    return `“${page.title}” goes back to draft so it can be reworked. It stays private until published.${page.scheduledAt ? " The scheduled publish time is kept; the scheduler publishes drafts too." : ""}`;
  }
  return "Marks the page as ready for review by someone with the cms.publish permission. It stays private until published.";
}

/** Schedule / cancel a publish through POST /cms/admin/:id/schedule (cms.publish, draft or review only). */
function ScheduleCard({ id, base, dirty, canPublish, busy, onScheduled, onConflict }) {
  const [value, setValue] = useState(() => toIstInputValue(base.scheduledAt));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const stored = toIstInputValue(base.scheduledAt);
  useEffect(() => {
    setValue(stored);
    setError("");
  }, [stored]);
  const schedulable = SCHEDULABLE.includes(base.status);
  const blocked = !canPublish ? "Scheduling requires cms.publish." : !schedulable ? `A ${base.status} page can’t be scheduled — only drafts and pages in review.` : "";

  async function submit(e) {
    e.preventDefault();
    const at = fromIstInputValue(value);
    if (!value || !at) return setError("Enter a valid date and time.");
    if (new Date(at).getTime() <= Date.now() + 30_000) return setError("Pick a time in the future (IST).");
    setError("");
    setPending(true);
    try {
      const page = await platformApi.scheduleCmsPage(id, at, base.version ?? 0);
      onScheduled(page);
      toast.success(`Publishes on ${formatDateTime(page.scheduledAt)} IST`, { description: dirty ? "Your unsaved edits are not part of the schedule — save them before then." : undefined });
    } catch (err) {
      if (isConflict(err)) onConflict();
      else setError(err.fieldError?.("scheduledAt") || err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card as="form" noValidate onSubmit={submit}>
      <CardHeader title="Scheduled publish" description="Drafts and pages in review are published automatically at this time (IST). Scheduling is saved immediately." />
      <CardBody className="grid gap-3">
        {base.scheduledAt ? (
          <Alert tone={schedulable ? "info" : "warning"} icon={CalendarClock}>
            {schedulable ? "Publishes automatically on " : "A publish time is set but ignored for this status: "}
            <strong>{formatDateTime(base.scheduledAt)} IST</strong>.
          </Alert>
        ) : null}
        <Field label="Publish at (IST)" error={error || undefined} hint={blocked || (value && fromIstInputValue(value) ? `${formatDateTime(fromIstInputValue(value))} IST` : "Pick a future date and time.")}>
          <Input
            type="datetime-local"
            value={value}
            min={toIstInputValue(new Date())}
            disabled={Boolean(blocked) || pending}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            className="sm:max-w-xs"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" variant="primary" leftIcon={CalendarClock} loading={pending} disabled={Boolean(blocked) || busy || !value || value === stored}>
            {base.scheduledAt ? "Reschedule" : "Schedule publish"}
          </Button>
          {base.scheduledAt ? (
            <Button size="sm" variant="ghost" disabled={!canPublish || pending || busy} onClick={() => setCancelOpen(true)}>
              Cancel schedule
            </Button>
          ) : null}
        </div>
      </CardBody>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel the scheduled publish?"
        description={`The page stays ${base.status} and won’t be published on ${base.scheduledAt ? formatDateTime(base.scheduledAt) : ""} IST.`}
        confirmLabel="Cancel schedule"
        cancelLabel="Keep schedule"
        tone="danger"
        onConfirm={async () => {
          try {
            const page = await platformApi.scheduleCmsPage(id, null, base.version ?? 0);
            onScheduled(page);
            toast.success("Schedule cancelled");
          } catch (err) {
            if (isConflict(err)) {
              setCancelOpen(false);
              onConflict();
              return;
            }
            throw err;
          }
        }}
      />
    </Card>
  );
}

function TransitionDialog({ action, page, dirty, busy, onClose, onConfirm }) {
  const a = action ? ACTIONS[action] : null;
  const open = Boolean(a);
  if (!dirty) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={a ? `${a.label}?` : ""}
        description={a ? transitionCopy(action, page) : ""}
        confirmLabel={a?.label}
        tone={action === "unpublish" ? "danger" : "primary"}
        busy={busy}
        onConfirm={() => onConfirm("saved")}
      />
    );
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={a ? `You have unsaved changes` : ""}
      description={a ? `What should happen to your edits before you ${a.verb}?` : ""}
      busy={busy}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm("saved")} disabled={busy}>
            {a ? `${a.label} last saved version` : ""}
          </Button>
          <Button variant="primary" loading={busy} onClick={() => onConfirm("save")}>
            {a ? `Save and ${a.verb}` : ""}
          </Button>
        </>
      }
    >
      {a ? (
        <div className="grid gap-3 text-ui-sm text-fg-muted">
          <p>{transitionCopy(action, page)}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-fg">Save and {a.verb}</strong>: your edits are saved first{action === "unpublish" ? " (they go live until the page is unpublished)" : ""}.
            </li>
            <li>
              <strong className="text-fg">{a.label} last saved version</strong>: your edits stay in the editor, unsaved.
            </li>
          </ul>
        </div>
      ) : null}
    </Dialog>
  );
}

function ConflictDialog({ conflict, base, mine, busy, onCancel, onReload, onOverwrite }) {
  const fresh = conflict?.fresh;
  return (
    <Dialog
      open={Boolean(conflict)}
      onOpenChange={(o) => !o && onCancel()}
      size="xl"
      busy={busy}
      dirty
      title="This page was changed by someone else"
      description={
        fresh ? (
          <>
            Since you opened it, the page moved from version {base.version ?? 0} to {fresh.version ?? 0} (last update {formatDateTime(fresh.updatedAt)} IST). Choose which content to keep.
          </>
        ) : null
      }
      footer={
        <>
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger-ghost" onClick={onReload} disabled={busy}>
            Reload theirs, discard mine
          </Button>
          <Button variant="primary" loading={busy} onClick={onOverwrite}>
            Overwrite with mine{conflict?.then ? ` and ${ACTIONS[conflict.then].verb}` : ""}
          </Button>
        </>
      }
    >
      {fresh ? (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <h3 className="text-ui font-semibold text-fg">Their changes</h3>
            <JsonDiff before={pick(base)} after={pick(fresh)} empty="Only metadata changed (for example the status or the update time)." />
          </div>
          <div className="grid gap-2">
            <h3 className="text-ui font-semibold text-fg">Your unsaved changes</h3>
            <JsonDiff before={pick(base)} after={mine} empty="You have no unsaved changes." />
          </div>
          <p className="text-ui-xs text-fg-subtle">
            “Overwrite with mine” saves exactly what is in your editor (title, slug, type, SEO and sections) on top of their version, replacing their versions of those
            fields. Status, schedule and owner are not changed.
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}

function OwnerDialog({ open, onOpenChange, page, onSaved, id }) {
  const current = tenantIdOf(page.tenantId);
  const [mode, setMode] = useState(current ? "tenant" : "global");
  const [tenantId, setTenantId] = useState(current);
  useEffect(() => {
    if (open) {
      setMode(current ? "tenant" : "global");
      setTenantId(current);
    }
  }, [open, current]);
  const changed = mode === "global" ? Boolean(current) : Boolean(tenantId) && tenantId !== current;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change page owner"
      description={
        page.status === "published"
          ? "This page is live: moving it changes which storefront shows it immediately."
          : "The owner decides which storefront can show this page once published."
      }
      confirmLabel={changed ? "Change owner" : "No change"}
      onConfirm={async () => {
        if (mode === "tenant" && !tenantId) throw new Error("Choose a store.");
        if (!changed) return;
        const res = await platformApi.updateCmsPage(id, mode === "global" ? { global: true } : { tenantId }, { version: page.version ?? 0 });
        onSaved(res);
        toast.success("Owner changed");
      }}
    >
      <div className="grid gap-3">
        <RadioGroup
          value={mode}
          onValueChange={setMode}
          aria-label="Owner"
          options={[
            { value: "global", label: "Global (marketplace)", description: "Fallback for every store without its own page with this slug." },
            { value: "tenant", label: "A specific store", description: "Only that store's storefront shows it." },
          ]}
        />
        {mode === "tenant" ? (
          <Field label="Store" required>
            <TenantCombobox value={tenantId} onChange={(v) => setTenantId(v || "")} placeholder="Search stores…" />
          </Field>
        ) : null}
        <p className="text-ui-xs text-fg-subtle">Fails if the new owner already has a page with the slug /{page.slug}.</p>
      </div>
    </ConfirmDialog>
  );
}

/* ------------------------------------------------------------------ versions */

const RESTORE_FIELDS = ["title", "slug", "type", "seo", "sections"];

function VersionsPanel({ id, base, dirty, canEdit, onRestored }) {
  const q = useQuery({ queryKey: keys.cms.sub(id, "versions"), queryFn: () => platformApi.listCmsVersions(id) });
  const [viewing, setViewing] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const rows = Array.isArray(q.data) ? q.data : q.data?.data || [];
  const current = pick(base);

  async function restore(v) {
    const snap = v.snapshot || {};
    const fresh = await platformApi.getCmsPage(id);
    const now = pick(fresh);
    const patch = {};
    RESTORE_FIELDS.forEach((k) => {
      let value = snap[k];
      if (k === "seo") value = { title: str(snap.seo?.title), description: str(snap.seo?.description), canonical: str(snap.seo?.canonical) };
      if (k === "sections") value = Array.isArray(snap.sections) ? snap.sections : [];
      if (value === undefined || value === null) return;
      if (!same(value, now[k])) patch[k] = value;
    });
    if (!Object.keys(patch).length) {
      toast("Nothing to restore", { description: "The page already matches this version." });
      onRestored(fresh);
      return;
    }
    const updated = await platformApi.updateCmsPage(id, patch, { version: fresh.version ?? 0 });
    onRestored(updated);
    setViewing(null);
    toast.success(`Restored version ${v.version ?? ""}`.trim(), { description: updated.status === "published" ? "The restored content is live." : undefined });
  }

  const restoreBlocked = !canEdit ? "You can't edit this page" : dirty ? "Save or discard your changes first" : "";

  return (
    <Card>
      <CardHeader
        title="Version history"
        description="Every save, status change and schedule is recorded (the last 20 are kept). Each entry holds the content as it was just before that action."
      />
      {q.isPending ? (
        <CardBody className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardBody>
      ) : q.error ? (
        <ErrorState compact error={q.error} onRetry={q.refetch} />
      ) : !rows.length ? (
        <EmptyState compact icon={History} title="No versions yet" description="Versions appear after the first save." />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((v) => (
            <li key={v._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-ui-sm font-medium text-fg">
                  {VERSION_ACTIONS[v.action] || "Edited"}
                  {v.toStatus ? (
                    <span className="inline-flex items-center gap-1 text-ui-xs font-normal text-fg-muted">
                      → <StatusPill status={v.toStatus} />
                    </span>
                  ) : null}
                  {v.scheduled ? <Badge tone="info">Scheduler</Badge> : null}
                  <span className="text-ui-xs font-normal text-fg-subtle">from v{v.version ?? 0}</span>
                </p>
                <p className="text-ui-xs text-fg-muted">
                  <DateTime value={v.at} /> IST by {v.actorId?.name || v.actorId?.email || (v.scheduled ? "the scheduler" : "system")}
                  {v.action === "schedule" && v.scheduledAt ? <> · for {formatDateTime(v.scheduledAt)} IST</> : null}
                  {" · "}“{v.snapshot?.title || "Untitled"}” · {(v.snapshot?.sections || []).length} sections
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setViewing(v)}>
                  View
                </Button>
                {restoreBlocked ? (
                  <Tooltip content={restoreBlocked}>
                    <span>
                      <Button size="sm" leftIcon={RotateCcw} disabled>
                        Restore
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Button size="sm" leftIcon={RotateCcw} onClick={() => setRestoring(v)}>
                    Restore
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        size="xl"
        title={viewing ? `Version ${viewing.version ?? 0}` : ""}
        description={viewing ? `Content just before “${(VERSION_ACTIONS[viewing.action] || "Edited").toLowerCase()}” on ${formatDateTime(viewing.at)} IST, compared with the current saved page.` : ""}
        footer={
          viewing ? (
            <>
              <Button onClick={() => setViewing(null)}>Close</Button>
              <Button variant="primary" leftIcon={RotateCcw} disabled={Boolean(restoreBlocked)} title={restoreBlocked || undefined} onClick={() => setRestoring(viewing)}>
                Restore this version
              </Button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="grid gap-4">
            <p className="text-ui-sm text-fg-muted">
              Left: this version. Right: the current saved page{dirty ? " (your unsaved edits are not included)" : ""}.
            </p>
            <JsonDiff
              before={{ ...pick({ ...viewing.snapshot, tenantId: base.tenantId }), scheduledAt: undefined, owner: undefined }}
              after={{ ...current, scheduledAt: undefined, owner: undefined }}
              empty="This version is identical to the current page."
            />
            <div className="grid gap-2">
              <h3 className="text-ui font-semibold text-fg">Preview of this version</h3>
              <div className="rounded-lg border border-border p-4">
                <PagePreview title={viewing.snapshot?.title} items={(viewing.snapshot?.sections || []).map((section, i) => ({ key: `${viewing._id}-${i}`, section }))} />
              </div>
            </div>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={Boolean(restoring)}
        onOpenChange={(o) => !o && setRestoring(null)}
        title={restoring ? `Restore version ${restoring.version ?? 0}?` : ""}
        description={
          restoring
            ? `Replaces the title, slug, type, SEO and sections with this version. The current content is saved as a new version first, so this can be undone. Status, owner and schedule don't change.${base.status === "published" ? " The page is live, so the restored content goes live immediately." : ""}`
            : ""
        }
        confirmLabel="Restore"
        onConfirm={() => restore(restoring)}
      />
    </Card>
  );
}
