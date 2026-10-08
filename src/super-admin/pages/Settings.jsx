import { useCallback, useId, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Globe2, Lock, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Code,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  PageHeader,
  RelativeTime,
  Select,
  SkeletonText,
  Switch,
  TabPanel,
  Tabs,
  TenantCombobox,
  Textarea,
  Tooltip,
  UnsavedChangesDialog,
  toast,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import { useTenantScope, TenantRequired, TenantLink } from "./lib/tenantScope.jsx";
import { JsonBlock } from "./lib/diff.jsx";
import {
  TYPE_LABELS,
  draftWarnings,
  festivalLive,
  fromDraft,
  groupKeys,
  metaFor,
  normalizeValue,
  parseServerError,
  registerDefinitions,
  sameValue,
  summarizeValue,
  toDraft,
  validateDraft,
} from "./lib/settingsRegistry.js";

const platformApi = api.withTenant(null);
const PLATFORM_LIST_KEY = keys.settings.list({ scope: "platform" });
const asRows = (res) => (Array.isArray(res) ? res : res?.data || []);

/** GET /settings/keys, registering the definitions so metaFor() knows every key's type and limits. */
async function loadKeys(client) {
  const res = await client.listSettingKeys();
  registerDefinitions(res?.definitions);
  return res;
}

/* ================================================================== draft state */

/**
 * Drafts for a set of settings in one scope. Only edited keys live in `drafts`; everything else
 * shows the stored value (or the registry default). Saving PUTs each changed key in turn.
 */
function useSettingsDraft({ storedMap, client, listKey }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [showAll, setShowAll] = useState({});
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState("");

  const baseline = useCallback((key) => {
    const row = storedMap.get(key);
    return row ? row.value : metaFor(key).default;
  }, [storedMap]);

  const draftOf = useCallback((key) => (key in drafts ? drafts[key] : toDraft(metaFor(key), baseline(key))), [drafts, baseline]);

  const isDirty = useCallback(
    (key) => {
      if (!(key in drafts)) return false;
      const meta = metaFor(key);
      const parsed = fromDraft(meta, drafts[key]);
      if (parsed.parseError) return drafts[key] !== toDraft(meta, baseline(key));
      return !sameValue(parsed.value, normalizeValue(meta, baseline(key)));
    },
    [drafts, baseline]
  );

  const setDraft = useCallback((key, value) => {
    setDrafts((d) => ({ ...d, [key]: value }));
    setServerErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const discard = useCallback((list) => {
    setDrafts((d) => {
      const next = { ...d };
      list.forEach((k) => delete next[k]);
      return next;
    });
    setServerErrors((e) => {
      const next = { ...e };
      list.forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  const errorsFor = useCallback(
    (key) => {
      const live = isDirty(key) || showAll[key] ? validateDraft(metaFor(key), draftOf(key)) : {};
      return { ...live, ...(serverErrors[key] || {}) };
    },
    [isDirty, showAll, draftOf, serverErrors]
  );

  async function save(group, list) {
    const changed = list.filter(isDirty);
    if (!changed.length) return;
    const invalid = changed.filter((k) => Object.keys(validateDraft(metaFor(k), draftOf(k))).length);
    if (invalid.length) {
      setShowAll((s) => ({ ...s, ...Object.fromEntries(invalid.map((k) => [k, true])) }));
      toast.error(`Fix ${invalid.length === 1 ? "the highlighted field" : `${invalid.length} highlighted fields`} before saving`);
      return;
    }
    setSaving(group);
    setResults((r) => ({ ...r, [group]: undefined }));
    const items = [];
    for (const key of changed) {
      const { value } = fromDraft(metaFor(key), drafts[key]);
      try {
        const row = await client.upsertSetting(key, value);
        qc.setQueryData(listKey, (old) => {
          const rows = asRows(old).filter((r) => r.key !== key);
          return row && row.key ? [...rows, row].sort((a, b) => a.key.localeCompare(b.key)) : old;
        });
        discard([key]);
        items.push({ key, ok: true });
      } catch (err) {
        setServerErrors((e) => ({ ...e, [key]: parseServerError(err) }));
        items.push({ key, ok: false, message: err?.message || "Failed", requestId: err?.requestId });
      }
    }
    await qc.invalidateQueries({ queryKey: keys.settings.all });
    setSaving("");
    const failed = items.filter((i) => !i.ok);
    if (!failed.length) {
      toast.success(items.length === 1 ? `${metaFor(items[0].key).label} saved` : `${items.length} settings saved`);
      setResults((r) => ({ ...r, [group]: undefined }));
    } else {
      setResults((r) => ({ ...r, [group]: items }));
      toast.error(`${failed.length} of ${items.length} setting${items.length === 1 ? "" : "s"} couldn’t be saved`);
    }
  }

  const dirtyKeys = Object.keys(drafts).filter(isDirty);
  return { drafts, draftOf, setDraft, isDirty, discard, errorsFor, save, saving, results, dirtyKeys, storedMap, baseline };
}

/* ================================================================== editors */

function StoredHint({ meta, row, dirty }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-ui-xs text-fg-subtle">
      {dirty ? <Badge tone="warning" dot>Unsaved</Badge> : null}
      {row ? (
        <span>
          Updated <RelativeTime value={row.updatedAt} />
        </span>
      ) : (
        <span>Not set — using the default{meta.default != null && meta.type !== "partners" ? ` (${summarizeValue(meta, meta.default)})` : ""}</span>
      )}
      {meta.overridable ? <span>· Stores can override</span> : null}
      {meta.public ? (
        <Tooltip content="Exposed to buyers through GET /settings/public.">
          <span className="inline-flex items-center gap-1">
            · <Globe2 aria-hidden className="size-3" /> Public
          </span>
        </Tooltip>
      ) : null}
      {meta.type === "festival" && row ? (
        <span className="inline-flex items-center gap-1">
          · <Badge tone={festivalState(row.value).tone} dot>{festivalState(row.value).label}</Badge>
        </span>
      ) : null}
    </div>
  );
}

function SecretInput({ value, onChange, disabled, maxLength, type }) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      type={shown ? (type === "email" ? "email" : "text") : "password"}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      disabled={disabled}
      autoComplete="new-password"
      spellCheck={false}
      suffix={
        <button type="button" className="pointer-events-auto text-fg-subtle hover:text-fg" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide value" : "Show value"}>
          {shown ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      }
    />
  );
}

function limitsHint(meta) {
  const parts = [];
  if (meta.type === "number") {
    const f = (n) => `${meta.prefix || ""}${Number(n).toLocaleString("en-IN")}${meta.suffix === "%" ? "%" : ""}`;
    if (meta.min != null && meta.max != null) parts.push(`${f(meta.min)}–${f(meta.max)}`);
    else if (meta.min != null) parts.push(`at least ${f(meta.min)}`);
    else if (meta.max != null) parts.push(`at most ${f(meta.max)}`);
    if (meta.int) parts.push("whole number");
  } else if ((meta.type === "string" || meta.type === "email") && meta.max) {
    parts.push(`up to ${meta.max} characters`);
  }
  return parts.length ? parts.join(" · ") : "";
}

/** Typed input for one setting. `draft`/`onChange` are in draft form (see settingsRegistry.js). */
function SettingEditor({ settingKey, meta, draft, onChange, errors = {}, disabled, hint }) {
  const err = errors[""];
  const limits = limitsHint(meta);
  const help = [meta.description, limits ? `(${limits})` : ""].filter(Boolean).join(" ");
  switch (meta.type) {
    case "boolean":
      return (
        <div className="grid gap-1.5">
          <Switch checked={Boolean(draft)} onCheckedChange={onChange} label={meta.label} description={meta.description} disabled={disabled} />
          {err ? <p role="alert" className="text-ui-xs text-danger-fg">{err}</p> : null}
          {hint}
        </div>
      );
    case "enum":
      return (
        <Field label={meta.label} hint={meta.description} error={err}>
          <Select value={draft} onValueChange={onChange} options={meta.options} disabled={disabled || meta.options.length < 2} aria-label={meta.label} />
        </Field>
      );
    case "number":
      return (
        <Field label={meta.label} hint={help} error={err}>
          <Input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            min={meta.min}
            max={meta.max}
            step={meta.step ?? "any"}
            prefix={meta.prefix}
            suffix={meta.suffix}
            disabled={disabled}
            className="max-w-xs"
          />
        </Field>
      );
    case "string":
    case "email":
      return (
        <Field label={meta.label} hint={help} error={err} required={Boolean(meta.required || meta.min)}>
          {meta.secret ? (
            <SecretInput type={meta.type} value={draft} onChange={(e) => onChange(e.target.value)} maxLength={meta.max} disabled={disabled} />
          ) : (
            <Input
              type={meta.type === "email" ? "email" : "text"}
              value={draft}
              onChange={(e) => onChange(e.target.value)}
              maxLength={meta.max}
              disabled={disabled}
              autoComplete="off"
            />
          )}
        </Field>
      );
    case "partners":
    case "festival":
      return (
        <div className="grid gap-2">
          <div>
            <p className="text-ui-sm font-medium text-fg">{meta.label}</p>
            {meta.type === "partners" && meta.description ? <p className="text-ui-xs text-fg-subtle">{meta.description}</p> : null}
          </div>
          {meta.type === "partners" ? (
            <PartnersEditor draft={draft} onChange={onChange} errors={errors} disabled={disabled} />
          ) : (
            <FestivalEditor draft={draft} onChange={onChange} errors={errors} disabled={disabled} />
          )}
        </div>
      );
    default:
      return (
        <Field label={<span className="font-mono">{settingKey}</span>} hint="Raw JSON value (validated by the server)." error={err}>
          <Textarea rows={5} value={draft} onChange={(e) => onChange(e.target.value)} disabled={disabled} spellCheck={false} className="font-mono text-ui-sm" />
        </Field>
      );
  }
}

function PlatformField({ settingKey, form, disabled }) {
  const meta = metaFor(settingKey);
  return (
    <div className="grid gap-1.5">
      <SettingEditor
        settingKey={settingKey}
        meta={meta}
        draft={form.draftOf(settingKey)}
        onChange={(v) => form.setDraft(settingKey, v)}
        errors={form.errorsFor(settingKey)}
        disabled={disabled}
      />
      <StoredHint meta={meta} row={form.storedMap.get(settingKey)} dirty={form.isDirty(settingKey)} />
    </div>
  );
}

let partnerSeq = 0;

function PartnersEditor({ draft, onChange, errors, disabled }) {
  const list = Array.isArray(draft) ? draft : [];
  const [removing, setRemoving] = useState(null);
  const radioName = `default-partner-${useId()}`;
  const warnings = draftWarnings({ type: "partners" }, list);
  const update = (i, patch) => onChange(list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const makeDefault = (i) => onChange(list.map((p, idx) => ({ ...p, isDefault: idx === i })));
  function add() {
    let id;
    do {
      partnerSeq += 1;
      id = `partner-${list.length + partnerSeq}`;
    } while (list.some((p) => p.id === id));
    onChange([...list, { id, name: "", fee: "0", isDefault: list.length === 0 }]);
  }
  function remove(i) {
    const next = list.filter((_, idx) => idx !== i);
    if (list[i]?.isDefault && next.length && !next.some((p) => p.isDefault)) next[0] = { ...next[0], isDefault: true };
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {errors[""] ? <Alert tone="danger">{errors[""]}</Alert> : null}
      {warnings.map((w) => (
        <Alert key={w} tone="warning">{w}</Alert>
      ))}
      <div className="hidden grid-cols-[minmax(0,9rem)_minmax(0,1fr)_8rem_5.5rem_2.25rem] gap-3 px-1 text-ui-xs font-medium text-fg-muted md:grid">
        <span>Id</span>
        <span>Name</span>
        <span>Fee</span>
        <span>Default</span>
        <span className="sr-only">Remove</span>
      </div>
      <ul className="grid gap-3">
        {list.map((p, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-md border border-border p-3 md:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_8rem_5.5rem_2.25rem] md:items-start md:border-0 md:p-0">
            <Field label="Id" className="md:[&>label]:sr-only" error={errors[`${i}.id`]}>
              <Input size="sm" value={p.id} maxLength={40} onChange={(e) => update(i, { id: e.target.value })} disabled={disabled} className="font-mono" aria-label={`Partner ${i + 1} id`} />
            </Field>
            <Field label="Name" className="md:[&>label]:sr-only" error={errors[`${i}.name`]}>
              <Input size="sm" value={p.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} disabled={disabled} aria-label={`Partner ${i + 1} name`} placeholder="e.g. Delhivery" />
            </Field>
            <Field label="Fee" className="md:[&>label]:sr-only" error={errors[`${i}.fee`]}>
              <Input size="sm" type="number" inputMode="decimal" min={0} max={10000} step={0.01} prefix="₹" value={p.fee} onChange={(e) => update(i, { fee: e.target.value })} disabled={disabled} aria-label={`Partner ${i + 1} fee`} />
            </Field>
            <label className="flex h-8 items-center gap-2 text-ui-sm text-fg">
              <input type="radio" name={radioName} checked={Boolean(p.isDefault)} onChange={() => makeDefault(i)} disabled={disabled} className="size-4 accent-primary" />
              <span className="md:sr-only">Default partner</span>
              <span className="hidden text-fg-muted md:inline" aria-hidden>{p.isDefault ? "Yes" : ""}</span>
            </label>
            {!disabled ? (
              <Tooltip content={list.length <= 1 ? "At least one partner is required" : undefined}>
                <span className="justify-self-end">
                  <IconButton icon={Trash2} size="sm" variant="danger-ghost" label={`Remove ${p.name || p.id || "partner"}`} disabled={list.length <= 1} onClick={() => setRemoving(i)} />
                </span>
              </Tooltip>
            ) : null}
          </li>
        ))}
      </ul>
      {!disabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" leftIcon={Plus} onClick={add} disabled={list.length >= 20}>
            Add partner
          </Button>
          <span className="text-ui-xs text-fg-subtle">{list.length} of 20 · ids must be unique · fees ₹0–₹10,000</span>
        </div>
      ) : null}
      <ConfirmDialog
        open={removing != null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${list[removing]?.name || list[removing]?.id || "this partner"}?`}
        description="Once you save, buyers can no longer pick this partner at checkout. Orders already placed keep their partner and fee."
        confirmLabel="Remove partner"
        tone="danger"
        onConfirm={() => {
          remove(removing);
          setRemoving(null);
        }}
      />
    </div>
  );
}

function festivalState(value, now = Date.now()) {
  if (!value) return { tone: "neutral", label: "No banner" };
  if (!value.enabled) return { tone: "neutral", label: "Disabled" };
  if (!value.message) return { tone: "warning", label: "Hidden (no message)" };
  if (value.startsAt && now < new Date(value.startsAt).getTime()) return { tone: "info", label: "Scheduled" };
  if (value.endsAt && now > new Date(value.endsAt).getTime()) return { tone: "neutral", label: "Ended" };
  return festivalLive(value, now) ? { tone: "success", label: "Live now" } : { tone: "neutral", label: "Not live" };
}

function FestivalEditor({ draft, onChange, errors, disabled }) {
  if (!draft) {
    return (
      <EmptyState
        compact
        icon={Sparkles}
        title="No festival banner"
        description="Greet buyers across the storefront for Diwali, Holi, Eid and other occasions."
        action={!disabled ? <Button size="sm" leftIcon={Plus} onClick={() => onChange({ enabled: true, title: "", message: "", startsAt: "", endsAt: "" })}>Set up a banner</Button> : null}
      />
    );
  }
  const set = (patch) => onChange({ ...draft, ...patch });
  const value = fromDraft({ type: "festival" }, draft).value;
  const state = festivalState(value);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4">
        <Switch checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v })} label="Show the banner" description="Only shown while enabled, with a message, inside the time window." disabled={disabled} />
        <Field label="Title" hint={`${draft.title.length}/100 · defaults to “Festival wishes”`} error={errors.title}>
          <Input value={draft.title} maxLength={100} onChange={(e) => set({ title: e.target.value })} disabled={disabled} placeholder="Happy Diwali" />
        </Field>
        <Field label="Message" hint={`${draft.message.length}/500`} error={errors.message} required={draft.enabled}>
          <Textarea rows={3} value={draft.message} maxLength={500} onChange={(e) => set({ message: e.target.value })} disabled={disabled} placeholder="Wishing you light and prosperity. Festive offers all week." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" hint="IST · optional (shows immediately when empty)" error={errors.startsAt}>
            <Input type="datetime-local" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} disabled={disabled} />
          </Field>
          <Field label="Ends" hint="IST · optional (no end when empty)" error={errors.endsAt}>
            <Input type="datetime-local" value={draft.endsAt} min={draft.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} disabled={disabled} />
          </Field>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ui-xs font-medium text-fg-muted">Preview</span>
          <Badge tone={state.tone} dot>{state.label}</Badge>
        </div>
        <div className={cn("rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-accent-fg", !draft.enabled && "opacity-60")} aria-label="Banner preview">
          <p className="flex items-center gap-1.5 text-ui-sm font-semibold">
            <Sparkles aria-hidden className="size-4" /> {value?.title || "Festival wishes"}
          </p>
          <p className="mt-1 whitespace-pre-line text-ui-sm">{value?.message || <span className="opacity-70">Your message appears here.</span>}</p>
        </div>
        {!disabled ? (
          <Button size="sm" variant="danger-ghost" leftIcon={Trash2} className="justify-self-start" onClick={() => onChange(null)}>
            Remove banner
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ================================================================== platform cards */

function SaveResults({ items }) {
  if (!items?.length) return null;
  const failed = items.filter((i) => !i.ok);
  const saved = items.filter((i) => i.ok);
  return (
    <Alert tone={failed.length ? "danger" : "success"} title={failed.length ? "Some settings weren’t saved" : "Saved"}>
      <ul className="mt-1 grid gap-0.5">
        {saved.map((i) => (
          <li key={i.key}>✓ {metaFor(i.key).label}</li>
        ))}
        {failed.map((i) => (
          <li key={i.key}>
            ✕ {metaFor(i.key).label}: {i.message}
            {i.requestId ? <span className="ml-1 font-mono text-ui-2xs opacity-80">({i.requestId})</span> : null}
          </li>
        ))}
      </ul>
      {failed.length ? <p className="mt-1">Unsaved values are kept — fix them and save again.</p> : null}
    </Alert>
  );
}

function SettingsCard({ id, title, description, settingKeys, form, canEdit, allowed, children, missingNote = true }) {
  const present = settingKeys.filter((k) => allowed.has(k));
  const missing = settingKeys.filter((k) => !allowed.has(k));
  const dirty = present.filter(form.isDirty);
  const saving = form.saving === id;
  return (
    <Card as="form" noValidate onSubmit={(e) => { e.preventDefault(); form.save(id, present); }} className="max-w-4xl">
      <CardHeader title={title} description={description} actions={dirty.length ? <Badge tone="warning">{dirty.length} unsaved</Badge> : null} />
      <CardBody className="grid gap-5">
        {children ||
          present.map((k) => <PlatformField key={k} settingKey={k} form={form} disabled={!canEdit || saving} />)}
        {missingNote && missing.length ? (
          <Alert tone="info">The API no longer lists {missing.map((k) => <Code key={k} className="mx-0.5">{k}</Code>)} for this scope, so it is hidden.</Alert>
        ) : null}
        <SaveResults items={form.results[id]} />
      </CardBody>
      {canEdit ? (
        <CardFooter>
          <Button variant="ghost" disabled={!dirty.length || saving} onClick={() => form.discard(present)}>
            Discard
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty.length || Boolean(form.saving)}>
            {dirty.length > 1 ? `Save ${dirty.length} changes` : "Save"}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/* ================================================================== tenant overrides */

/** GET /settings/commerce field holding the effective value of a tenant-scope key. */
const COMMERCE_FIELD = {
  "platform.feeEnabled": "feeEnabled",
  "platform.feeAmount": "feeAmount",
  "platform.feePercent": "feePercent",
  "platform.deliveryPartnerChoiceEnabled": "deliveryPartnerChoiceEnabled",
  "platform.deliveryPartners": "deliveryPartners",
  "payments.codEnabled": "codEnabled",
  "delivery.freeAbove": "freeDeliveryAbove",
};

function OverrideDialog({ open, onOpenChange, tenantId, settingKey, initial, hasOverride }) {
  const meta = metaFor(settingKey);
  const [draft, setDraft] = useState(() => toDraft(meta, initial));
  const [showErrors, setShowErrors] = useState(false);
  const save = useApiMutation((value) => api.withTenant(tenantId).upsertSetting(settingKey, value), {
    invalidate: [keys.settings.all],
    success: `${meta.label} override saved`,
    error: false,
  });
  const parsedInitial = normalizeValue(meta, initial);
  const parsed = fromDraft(meta, draft);
  const changed = parsed.parseError ? true : !sameValue(parsed.value, parsedInitial);
  const dirty = changed;
  const errors = { ...(showErrors || dirty ? validateDraft(meta, draft) : {}), ...(save.error ? parseServerError(save.error) : {}) };

  function submit(e) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(validateDraft(meta, draft)).length) return;
    save.mutate(parsed.value, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size={meta.type === "partners" ? "xl" : "md"}
      title={`${hasOverride ? "Edit" : "Set"} store override`}
      description={`${meta.label} for this store only. Other stores keep using the platform default.`}
      dirty={dirty}
      busy={save.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="override-form" variant="primary" loading={save.isPending} disabled={hasOverride && !dirty}>
            Save override
          </Button>
        </>
      }
    >
      <form id="override-form" noValidate onSubmit={submit} className="grid gap-4">
        <SettingEditor settingKey={settingKey} meta={meta} draft={draft} onChange={(v) => { save.reset(); setDraft(v); }} errors={errors} />
        <p className="text-ui-xs text-fg-subtle">
          Key <Code>{settingKey}</Code>
        </p>
      </form>
    </Dialog>
  );
}

function ResetOverrideDialog({ tenantId, settingKey, override, platformValue, storeOnly, onClose }) {
  const qc = useQueryClient();
  const meta = metaFor(settingKey);
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Reset ${meta.label} to the ${storeOnly ? "built-in" : "platform"} default?`}
      description={
        storeOnly
          ? `The store’s value (${summarizeValue(meta, override?.value)}) is removed and the built-in default (${summarizeValue(meta, meta.default)}) applies.`
          : `The store’s override (${summarizeValue(meta, override?.value)}) is removed. The store then follows the platform default — currently ${summarizeValue(meta, platformValue)} — including later platform changes.`
      }
      confirmLabel="Reset to default"
      tone="danger"
      onConfirm={async () => {
        const res = await api.deleteSettingOverride(settingKey, tenantId);
        await qc.invalidateQueries({ queryKey: keys.settings.all });
        toast.success(res?.removed === false ? `${meta.label} had no override` : `${meta.label} reset — now ${summarizeValue(meta, res?.effective)}`);
      }}
    />
  );
}

function TenantOverrides({ platformStored, canEdit }) {
  const scope = useTenantScope();
  const tenantId = scope.tenantId;
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const tenantApi = useMemo(() => api.withTenant(tenantId || null), [tenantId]);
  const keysQ = useQuery({
    queryKey: keys.settings.custom("keys", "tenant", tenantId),
    queryFn: () => loadKeys(tenantApi),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const rowsQ = useQuery({
    queryKey: keys.settings.list({ scope: "tenant", tenantId }),
    queryFn: () => tenantApi.listSettings(),
    enabled: Boolean(tenantId),
  });
  const commerceQ = useQuery({
    queryKey: keys.settings.custom("commerce", tenantId),
    queryFn: () => tenantApi.getCommerce(),
    enabled: Boolean(tenantId),
  });

  if (!tenantId) {
    return <TenantRequired value="" onChange={scope.setTenant} title="Pick a store" description="See which settings a store overrides and what buyers of that store actually get." />;
  }

  const overrides = new Map(asRows(rowsQ.data).map((r) => [r.key, r]));
  const tenantKeys = keysQ.data?.keys || [];
  const commerce = commerceQ.data;

  function platformDefault(key) {
    const meta = metaFor(key);
    if (!meta.scopes?.includes("platform")) return { value: meta.default, builtIn: true, storeOnly: true };
    const row = platformStored.get(key);
    return row ? { value: row.value } : { value: meta.default, builtIn: true };
  }
  function effective(key) {
    const field = COMMERCE_FIELD[key];
    if (commerce && field && field in commerce) return commerce[field];
    const o = overrides.get(key);
    return o && o.value != null ? o.value : platformDefault(key).value;
  }

  const loading = keysQ.isPending || rowsQ.isPending;
  const error = keysQ.error || rowsQ.error;

  return (
    <div className="grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Field label="Store" labelHidden>
            <TenantCombobox value={tenantId} onChange={(id) => scope.setTenant(id || "")} placeholder="Pick a store" aria-label="Store" />
          </Field>
        </div>
        <span className="text-ui-sm text-fg-muted">
          Overrides for <TenantLink tenant={tenantId} />
          {scope.fromContext ? " (from the tenant switcher)" : ""}
        </span>
      </div>
      <Alert tone="info" title="How overrides work">
        A store value wins over the platform default (cash on delivery needs both to allow it). “Reset to default” removes the override so the store
        follows the platform default again, including later changes.
      </Alert>
      <Card>
        <CardHeader title="Store settings" description="Effective values come from the live checkout configuration for this store." />
        {error ? (
          <ErrorState error={error} onRetry={() => { keysQ.refetch(); rowsQ.refetch(); }} compact />
        ) : loading ? (
          <SkeletonText lines={6} className="p-5" />
        ) : (
          <ul className="divide-y divide-border">
            {tenantKeys.map((key) => {
              const meta = metaFor(key);
              const o = overrides.get(key);
              const def = platformDefault(key);
              return (
                <li key={key} className="grid grid-cols-[minmax(0,1fr)] gap-3 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="text-ui-sm font-medium text-fg">{meta.label}</p>
                    <p className="truncate font-mono text-ui-2xs text-fg-subtle">{key}</p>
                  </div>
                  <div className="min-w-0 text-ui-sm">
                    <p className="text-ui-2xs text-fg-subtle">Platform default</p>
                    <p className="truncate text-fg-muted" title={summarizeValue(meta, def.value)}>
                      {def.storeOnly ? "Store only" : summarizeValue(meta, def.value)}
                      {def.builtIn && !def.storeOnly ? <span className="text-fg-subtle"> (built-in)</span> : null}
                    </p>
                  </div>
                  <div className="min-w-0 text-ui-sm">
                    <p className="text-ui-2xs text-fg-subtle">Store override</p>
                    {o ? (
                      <p className="truncate text-fg" title={summarizeValue(meta, o.value)}>
                        {summarizeValue(meta, o.value)} <span className="text-ui-2xs text-fg-subtle">· <RelativeTime value={o.updatedAt} /></span>
                      </p>
                    ) : (
                      <p className="text-fg-subtle">Not overridden</p>
                    )}
                  </div>
                  <div className="min-w-0 text-ui-sm">
                    <p className="text-ui-2xs text-fg-subtle">Effective</p>
                    {commerceQ.isPending && COMMERCE_FIELD[key] ? (
                      <SkeletonText lines={1} />
                    ) : (
                      <p className="truncate font-medium text-fg" title={summarizeValue(meta, effective(key))}>{summarizeValue(meta, effective(key))}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-self-end">
                    {canEdit ? (
                      <Button size="sm" onClick={() => setEditing({ key, initial: o ? o.value : def.value ?? meta.default, hasOverride: Boolean(o) })}>
                        {o ? "Edit" : "Override"}
                      </Button>
                    ) : null}
                    {canEdit && o ? (
                      <Tooltip content={def.storeOnly ? "Remove the store value (built-in default applies)" : "Remove the override (follow the platform default)"}>
                        <Button size="sm" variant="ghost" leftIcon={RotateCcw} onClick={() => setResetting({ key, override: o, platformValue: def.value, storeOnly: def.storeOnly })}>
                          Reset
                        </Button>
                      </Tooltip>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {!tenantKeys.length ? <li className="px-5 py-8 text-center text-ui-sm text-fg-subtle">The API lists no store-scope settings.</li> : null}
          </ul>
        )}
      </Card>
      {resetting ? (
        <ResetOverrideDialog
          key={`${tenantId}:${resetting.key}:reset`}
          tenantId={tenantId}
          settingKey={resetting.key}
          override={resetting.override}
          platformValue={resetting.platformValue}
          storeOnly={resetting.storeOnly}
          onClose={() => setResetting(null)}
        />
      ) : null}
      {editing ? (
        <OverrideDialog
          key={`${tenantId}:${editing.key}`}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          tenantId={tenantId}
          settingKey={editing.key}
          initial={editing.initial}
          hasOverride={editing.hasOverride}
        />
      ) : null}
    </div>
  );
}

/* ================================================================== advanced */

function AdvancedTab({ allowedKeys, rows, form, canEdit, allowed }) {
  const unknown = allowedKeys.filter((k) => metaFor(k).unknown);
  const legacy = rows.filter((r) => !allowed.has(r.key));
  const stored = new Map(rows.map((r) => [r.key, r]));
  return (
    <div className="grid max-w-5xl gap-6">
      <Card>
        <CardHeader title="Registry" description="Every key the API accepts at platform scope (GET /settings/keys) and its stored value." />
        <div className="overflow-x-auto">
          <table className="w-full text-ui-sm">
            <thead className="bg-surface-2 text-left text-ui-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Key</th>
                <th scope="col" className="px-4 py-2 font-medium">Type</th>
                <th scope="col" className="px-4 py-2 font-medium">Scopes</th>
                <th scope="col" className="px-4 py-2 font-medium">Value</th>
                <th scope="col" className="px-4 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {allowedKeys.map((k) => {
                const meta = metaFor(k);
                const row = stored.get(k);
                return (
                  <tr key={k} className="border-t border-border align-top">
                    <td className="px-4 py-2">
                      <p className="font-mono text-ui-xs text-fg">{k}</p>
                      <p className="text-ui-xs text-fg-subtle">{meta.label}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-fg-muted">
                      {TYPE_LABELS[meta.type] || meta.type}
                      {meta.secret ? <Badge tone="warning" className="ml-1.5">Secret</Badge> : null}
                      {meta.public ? <Badge tone="info" className="ml-1.5">Public</Badge> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-fg-muted">{(meta.scopes || []).map((s) => (s === "tenant" ? "store" : s)).join(" + ") || "—"}</td>
                    <td className="max-w-[20rem] truncate px-4 py-2" title={row ? summarizeValue(meta, row.value) : undefined}>
                      {row ? summarizeValue(meta, row.value) : <span className="text-fg-subtle">Default · {summarizeValue(meta, meta.default)}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-fg-muted">{row ? <RelativeTime value={row.updatedAt} /> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {unknown.length ? (
        <SettingsCard
          id="other"
          title="Other settings"
          description="Keys the API accepts that this console doesn’t describe yet. Values are validated by the server."
          settingKeys={unknown}
          form={form}
          canEdit={canEdit}
          allowed={allowed}
        />
      ) : null}

      <Card>
        <CardHeader title="Legacy keys" description="Stored platform values whose key is no longer in the registry. They can’t be edited and are ignored by the API." />
        <CardBody>
          {legacy.length ? (
            <ul className="grid gap-3">
              {legacy.map((r) => (
                <li key={r._id || r.key} className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Code>{r.key}</Code>
                    <Badge tone="neutral"><Lock aria-hidden className="mr-1 size-3" />Read-only</Badge>
                    <span className="text-ui-xs text-fg-subtle">Updated <RelativeTime value={r.updatedAt} /></span>
                  </div>
                  <JsonBlock value={r.value} className="max-h-40" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ui-sm text-fg-subtle">No legacy keys — every stored value belongs to the registry.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ================================================================== page */

export default function Settings() {
  const can = useCan();
  const canEdit = can("settings.edit");

  const keysQ = useQuery({ queryKey: keys.settings.custom("keys", "platform"), queryFn: () => loadKeys(platformApi), staleTime: 5 * 60_000 });
  const rowsQ = useQuery({ queryKey: PLATFORM_LIST_KEY, queryFn: () => platformApi.listSettings() });

  const rows = useMemo(() => asRows(rowsQ.data), [rowsQ.data]);
  const storedMap = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
  const allowedKeys = useMemo(() => keysQ.data?.keys || [], [keysQ.data]);
  const allowed = useMemo(() => new Set(allowedKeys), [allowedKeys]);

  const form = useSettingsDraft({ storedMap, client: platformApi, listKey: PLATFORM_LIST_KEY });
  const blocker = useUnsavedChangesGuard(form.dirtyKeys.length > 0 && !form.saving);

  const dirtyIn = (list) => list.filter((k) => form.dirtyKeys.includes(k)).length || undefined;
  // One tab per server group (GET /settings/keys definitions), in registry order.
  const groups = useMemo(() => groupKeys(allowedKeys.filter((k) => !metaFor(k).unknown)), [allowedKeys]);
  const unknownKeys = allowedKeys.filter((k) => metaFor(k).unknown);

  const tabs = [
    ...(groups.length ? groups : [{ id: "general", label: "General", keys: [] }]).map((g) => ({ value: g.id, label: g.label, count: dirtyIn(g.keys) })),
    { value: "tenants", label: "Store overrides" },
    { value: "advanced", label: "Advanced", count: dirtyIn(unknownKeys) },
  ];

  const loading = keysQ.isPending || rowsQ.isPending;
  const error = keysQ.error || rowsQ.error;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Marketplace-wide configuration. Changes apply to every store unless a store overrides them."
        breadcrumbs={[{ label: "Platform", to: "/super-admin" }, { label: "Settings" }]}
        meta={form.dirtyKeys.length ? <Badge tone="warning" dot>{form.dirtyKeys.length} unsaved</Badge> : null}
      />
      {!canEdit ? (
        <Alert tone="info" title="View only" className="mb-4 max-w-4xl">
          You can see these settings but need the <Code>settings.edit</Code> permission to change them.
        </Alert>
      ) : null}

      {error ? (
        <Card><ErrorState error={error} onRetry={() => { keysQ.refetch(); rowsQ.refetch(); }} /></Card>
      ) : (
        <Tabs urlParam="tab" tabs={tabs} aria-label="Settings sections">
          {loading ? (
            <Card className="max-w-4xl"><SkeletonText lines={8} className="p-5" /></Card>
          ) : (
            <>
              {groups.map((g) => {
                const overridable = g.keys.some((k) => metaFor(k).overridable);
                return (
                  <TabPanel key={g.id} value={g.id}>
                    <SettingsCard
                      id={g.id}
                      title={g.label}
                      description={overridable ? "Platform defaults. Stores can override the marked settings on the Store overrides tab." : "Applies to the whole marketplace."}
                      settingKeys={g.keys}
                      form={form}
                      canEdit={canEdit}
                      allowed={allowed}
                    />
                  </TabPanel>
                );
              })}
              <TabPanel value="tenants">
                <TenantOverrides platformStored={storedMap} canEdit={canEdit} />
              </TabPanel>
              <TabPanel value="advanced">
                <AdvancedTab allowedKeys={allowedKeys} rows={rows} form={form} canEdit={canEdit} allowed={allowed} />
              </TabPanel>
            </>
          )}
        </Tabs>
      )}
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}

