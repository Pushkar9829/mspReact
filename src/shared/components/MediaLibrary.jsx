import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, FileText, ImageIcon, ImagePlus, Trash2, X } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useInvalidate } from "../hooks/useApiMutation.js";
import { useCan } from "../context/AuthContext.jsx";
import {
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  FileDropzone,
  IconButton,
  MB,
  MEDIA_TYPES,
  IMAGE_TYPES,
  NativeSelect,
  Pagination,
  RelativeTime,
  Skeleton,
  Tooltip,
  cn,
  toast,
} from "../ui/index.js";

/** Folders the API accepts for uploads (catalog/media.model.js MEDIA_FOLDERS). */
export const MEDIA_FOLDERS = ["catalog", "products", "brands", "categories", "cms", "avatars"];
const FOLDER_LABELS = { catalog: "Catalog", products: "Products", brands: "Brands & logos", categories: "Categories", cms: "Content", avatars: "Avatars" };
export const MEDIA_PERMS = ["media.upload", "products.create"];

function sizeLabel(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return "";
  return n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

const isImage = (m) => !m?.mimeType || String(m.mimeType).startsWith("image/");

/**
 * Media library: browse, upload (whitelisted folder), copy URL, delete, and optionally pick.
 *
 *   <MediaLibrary />                                                   // manager
 *   <MediaLibrary selectable="multiple" selected={urls} onSelectedChange={setUrls} folder="catalog" />
 *
 * Props:
 * - folder: initial folder filter ("" = all) and default upload folder.
 * - selectable: false | "single" | "multiple"; `selected` (array of URLs) + `onSelectedChange(urls, items)`.
 * - apiClient: api or api.withTenant(id) (super admin acting on a store); or pass tenantId.
 * - tenantId / scope: part of the cache key so stores never share cached listings.
 * - imagesOnly: hide PDFs (pickers for image fields).
 * - pageSize (default 24), className.
 * Permissions: media.upload (or products.create) to list/upload/delete; without them an explanation is shown.
 */
export default function MediaLibrary({
  folder: initialFolder = "",
  selectable = false,
  selected = [],
  onSelectedChange,
  apiClient: apiClientProp,
  imagesOnly = false,
  pageSize = 24,
  className,
  scope: scopeProp = "default",
  tenantId,
}) {
  const apiClient = useMemo(() => apiClientProp || (tenantId ? defaultApi.withTenant(tenantId) : defaultApi), [apiClientProp, tenantId]);
  const scope = `${scopeProp}:${tenantId || "own"}`;
  const can = useCan();
  const allowed = can(MEDIA_PERMS);
  const invalidate = useInvalidate();
  const [folder, setFolder] = useState(initialFolder);
  const [page, setPage] = useState(1);
  const [uploads, setUploads] = useState([]); // [{ name, state: "uploading"|"done"|"error", message }]
  const [toDelete, setToDelete] = useState(null);
  const uploadFolder = MEDIA_FOLDERS.includes(folder) ? folder : MEDIA_FOLDERS.includes(initialFolder) ? initialFolder : "catalog";

  const query = useMemo(() => ({ page, limit: pageSize, ...(folder ? { folder } : {}) }), [page, pageSize, folder]);
  const q = useQuery({
    queryKey: keys.media.list({ ...query, scope }),
    queryFn: () => apiClient.listMedia(query),
    enabled: allowed,
    ...listQueryOptions,
  });
  const items = (q.data?.data || []).filter((m) => !imagesOnly || isImage(m));
  const selectedSet = new Set(selected);

  useEffect(() => setPage(1), [folder]);

  async function handleFiles(files) {
    const list = files.filter((f) => !imagesOnly || IMAGE_TYPES.includes(f.type));
    setUploads(list.map((f) => ({ name: f.name, state: "uploading" })));
    const uploaded = [];
    for (const [i, file] of list.entries()) {
      try {
        const media = await apiClient.uploadMedia(file, { folder: uploadFolder });
        uploaded.push(media);
        setUploads((prev) => prev.map((u, j) => (j === i ? { ...u, state: "done" } : u)));
      } catch (err) {
        setUploads((prev) => prev.map((u, j) => (j === i ? { ...u, state: "error", message: err?.message || "Upload failed" } : u)));
      }
    }
    await invalidate(keys.media.all);
    if (uploaded.length) {
      toast.success(uploaded.length === 1 ? "File uploaded" : `${uploaded.length} files uploaded`);
      if (selectable && onSelectedChange) {
        const urls = uploaded.map((m) => m.url);
        onSelectedChange(selectable === "single" ? urls.slice(-1) : [...selected, ...urls.filter((u) => !selectedSet.has(u))], uploaded);
      }
    }
    setTimeout(() => setUploads((prev) => prev.filter((u) => u.state === "error")), 2500);
  }

  function toggle(item) {
    if (!selectable || !onSelectedChange) return;
    if (selectable === "single") return onSelectedChange(selectedSet.has(item.url) ? [] : [item.url], [item]);
    const next = selectedSet.has(item.url) ? selected.filter((u) => u !== item.url) : [...selected, item.url];
    return onSelectedChange(next, [item]);
  }

  async function copy(url) {
    try {
      const abs = new URL(url, window.location.origin).href;
      await navigator.clipboard.writeText(abs);
      toast.success("URL copied");
    } catch {
      toast.error("Clipboard is blocked in this browser");
    }
  }

  if (!allowed) {
    return <EmptyState icon={ImageIcon} title="No access to the media library" description="Requires media.upload (or products.create)." className={className} />;
  }

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <FileDropzone
          accept={imagesOnly ? IMAGE_TYPES : MEDIA_TYPES}
          maxSize={10 * MB}
          multiple
          busy={uploads.some((u) => u.state === "uploading")}
          onFiles={handleFiles}
          label={`Drop files or click to upload to “${FOLDER_LABELS[uploadFolder] || uploadFolder}”`}
          hint={imagesOnly ? "PNG, JPG, WebP or GIF · up to 10 MB each" : "PNG, JPG, WebP, GIF or PDF · up to 10 MB each"}
        />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2">
          <label className="grid gap-1.5 text-ui-sm font-medium text-fg">
            Folder
            <NativeSelect
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              options={[{ value: "", label: "All folders" }, ...MEDIA_FOLDERS.map((f) => ({ value: f, label: FOLDER_LABELS[f] }))]}
            />
          </label>
          <p className="text-ui-xs text-fg-subtle">Uploads go to the selected folder (“{FOLDER_LABELS[uploadFolder]}” when viewing all). Files are checked server-side; only images and PDFs are kept.</p>
        </div>
      </div>

      {uploads.length ? (
        <ul className="grid gap-1" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.name} className={cn("flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-ui-xs", u.state === "error" ? "bg-danger-soft text-danger-fg" : "bg-surface-2 text-fg-muted")}>
              <span className="truncate">
                {u.name} — {u.state === "uploading" ? "uploading…" : u.state === "done" ? "uploaded" : u.message}
              </span>
              {u.state === "error" ? (
                <button type="button" aria-label="Dismiss" onClick={() => setUploads((prev) => prev.filter((x) => x !== u))}>
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {q.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} compact />
      ) : !items.length ? (
        <EmptyState icon={ImagePlus} title={folder ? "No files in this folder" : "No media yet"} description="Upload product photos, logos and documents to reuse them across your store." compact />
      ) : (
        <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6", q.isFetching && "opacity-70")} aria-label="Media files">
          {items.map((m) => {
            const on = selectedSet.has(m.url);
            const preview = isImage(m) ? (
              <img src={m.url} alt={m.filename || ""} loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-fg-subtle">
                <FileText aria-hidden className="size-8" />
              </span>
            );
            return (
              <li key={m._id} className={cn("group relative overflow-hidden rounded-lg border bg-surface shadow-xs", on ? "border-primary ring-2 ring-primary/40" : "border-border")}>
                {selectable ? (
                  <button type="button" aria-pressed={on} aria-label={`${on ? "Deselect" : "Select"} ${m.filename || "file"}`} onClick={() => toggle(m)} className="block aspect-square w-full bg-surface-sunken outline-none focus-visible:outline-2 focus-visible:outline-ring">
                    {preview}
                  </button>
                ) : (
                  <a href={m.url} target="_blank" rel="noreferrer" className="block aspect-square w-full bg-surface-sunken outline-none focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Open ${m.filename || "file"}`}>
                    {preview}
                  </a>
                )}
                {on ? (
                  <span aria-hidden className="absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-fg-on-primary">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : null}
                <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui-xs font-medium text-fg" title={m.filename}>
                      {m.filename || m.key}
                    </p>
                    <p className="truncate text-ui-2xs text-fg-subtle">
                      {[sizeLabel(m.size), m.folder].filter(Boolean).join(" · ")} · <RelativeTime value={m.createdAt} />
                    </p>
                  </div>
                  <IconButton icon={Copy} size="xs" label="Copy URL" onClick={() => copy(m.url)} />
                  <IconButton icon={Trash2} size="xs" label="Delete file" className="text-danger-fg" onClick={() => setToDelete(m)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {q.data?.meta && (q.data.meta.total || 0) > pageSize ? <Pagination meta={q.data.meta} page={page} limit={pageSize} onPageChange={setPage} compact /> : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.filename || "this file"}?`}
        description="The file is removed from storage. Products, categories or branding that still use this URL will show a broken image. This cannot be undone."
        confirmLabel="Delete file"
        tone="danger"
        onConfirm={async () => {
          await apiClient.deleteMedia(toDelete._id);
          if (selectedSet.has(toDelete.url)) onSelectedChange?.(selected.filter((u) => u !== toDelete.url), []);
          await invalidate(keys.media.all);
          toast.success("File deleted");
        }}
      />
    </div>
  );
}

/**
 * Modal picker on top of the library.
 *   <MediaPickerDialog open onOpenChange multiple folder="catalog" initialSelected={urls} onPick={(urls) => …} />
 */
export function MediaPickerDialog({ open, onOpenChange, multiple = false, folder = "catalog", initialSelected = [], onPick, title, apiClient, imagesOnly = true, tenantId, scope = "picker" }) {
  const [picked, setPicked] = useState(initialSelected);
  const initialKey = initialSelected.join("|");
  useEffect(() => {
    if (open) setPicked(initialKey ? initialKey.split("|") : []);
  }, [open, initialKey]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={title || (multiple ? "Choose images" : "Choose an image")}
      description="Pick from your media library or upload new files."
      footer={
        <>
          <span className="mr-auto text-ui-sm text-fg-muted">{picked.length ? `${picked.length} selected` : "Nothing selected"}</span>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!picked.length && !multiple}
            onClick={() => {
              onPick?.(picked);
              onOpenChange(false);
            }}
          >
            {multiple ? "Use selected" : "Use image"}
          </Button>
        </>
      }
    >
      <MediaLibrary folder={folder} selectable={multiple ? "multiple" : "single"} selected={picked} onSelectedChange={setPicked} apiClient={apiClient} tenantId={tenantId} imagesOnly={imagesOnly} pageSize={18} scope={scope} />
    </Dialog>
  );
}

/**
 * Single-image field: thumbnail + "Choose" (opens the picker) + "Remove".
 *   <MediaPickerButton value={logoUrl} onChange={setLogoUrl} folder="brands" label="Store logo" />
 * Without media permission it renders the thumbnail only and a disabled button with an explanation.
 */
export function MediaPickerButton({ value, onChange, folder = "catalog", label = "Image", disabled = false, apiClient, className, tenantId, scope }) {
  const can = useCan();
  const allowed = can(MEDIA_PERMS);
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunken">
        {value ? <img src={value} alt={label} className="size-full object-cover" /> : <ImageIcon aria-hidden className="size-5 text-fg-subtle" />}
      </span>
      <div className="flex flex-wrap gap-2">
        {allowed ? (
          <Button size="sm" leftIcon={ImagePlus} disabled={disabled} onClick={() => setOpen(true)} aria-label={`Choose ${label.toLowerCase()} from media library`}>
            {value ? "Replace" : "Choose"}
          </Button>
        ) : (
          <Tooltip content="Requires media.upload">
            <span tabIndex={0} className="inline-flex">
              <Button size="sm" leftIcon={ImagePlus} disabled>
                Choose
              </Button>
            </span>
          </Tooltip>
        )}
        {value && !disabled ? (
          <Button size="sm" variant="ghost" onClick={() => onChange?.("")}>
            Remove
          </Button>
        ) : null}
      </div>
      {allowed ? (
        <MediaPickerDialog open={open} onOpenChange={setOpen} folder={folder} initialSelected={value ? [value] : []} apiClient={apiClient} tenantId={tenantId} scope={scope} title={`Choose ${label.toLowerCase()}`} onPick={(urls) => onChange?.(urls[0] || "")} />
      ) : null}
    </div>
  );
}
