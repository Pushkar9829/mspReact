import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../../../shared/api/keys.js";
import { useAuth } from "../../../shared/context/AuthContext.jsx";
import { Badge, Button, Card, Tooltip, cn, toast } from "../../../shared/ui/index.js";

/* ------------------------------------------------------------------ page context */

/** { canEdit, tenant, settings (stored overrides map), commerce, reportDirty(id, bool) } */
export const SettingsContext = createContext(null);
export function useSettingsContext() {
  return useContext(SettingsContext);
}

/* ------------------------------------------------------------------ section form state */

/**
 * Controlled form state seeded from server data.
 * - When the server data changes and the form is clean, the form follows it.
 * - When the form is dirty, the user's edits are kept and compared against the new server data.
 * - `reset(next)` marks `next` as the saved baseline (call it with the server response after a save).
 */
export function useSectionForm(initial) {
  const key = JSON.stringify(initial);
  // server: last server snapshot seen; base: the saved baseline the form is compared against.
  const [state, setState] = useState(() => ({ server: key, base: key, form: initial }));
  let current = state;
  if (state.server !== key) {
    const wasDirty = JSON.stringify(state.form) !== state.base;
    current = { server: key, base: key, form: wasDirty ? state.form : initial };
    setState(current);
  }
  const dirty = JSON.stringify(current.form) !== current.base;
  const setForm = useCallback((update) => setState((s) => ({ ...s, form: typeof update === "function" ? update(s.form) : update })), []);
  const reset = useCallback((next) => setState((s) => ({ ...s, base: JSON.stringify(next), form: next })), []);
  const discard = useCallback(() => setState((s) => ({ ...s, form: JSON.parse(s.base) })), []);
  return { form: current.form, setForm, dirty, reset, discard, base: JSON.parse(current.base) };
}

/** Report a section's dirty state to the page (one unsaved-changes guard for all sections). */
export function useReportDirty(id, dirty) {
  const ctx = useSettingsContext();
  const report = ctx?.reportDirty;
  useEffect(() => {
    report?.(id, dirty);
  }, [report, id, dirty]);
  useEffect(() => () => report?.(id, false), [report, id]);
}

/* ------------------------------------------------------------------ save runners */

/**
 * Runs several writes one after another (registry settings are one key per request). Stops at the
 * first failure and reports every step: saved / failed (with message) / not attempted.
 */
export function useStepSave() {
  const queryClient = useQueryClient();
  const { reloadUser } = useAuth();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (steps, { refreshUser = false } = {}) => {
      setPending(true);
      const results = [];
      let failed = null;
      for (const step of steps) {
        if (failed) {
          results.push({ label: step.label, status: "skipped", message: "Not attempted because an earlier change failed." });
          continue;
        }
        try {
          const data = await step.run();
          step.onSuccess?.(data);
          results.push({ label: step.label, status: "saved" });
        } catch (error) {
          failed = error;
          results.push({ label: step.label, status: "failed", message: error?.message || "Something went wrong", error });
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.settings.all }),
        queryClient.invalidateQueries({ queryKey: keys.myTenant }),
      ]);
      if (refreshUser && results.some((r) => r.status === "saved")) {
        Promise.resolve(reloadUser?.()).catch(() => {});
      }
      setPending(false);
      const saved = results.filter((r) => r.status === "saved").length;
      if (!failed) toast.success(saved === 1 ? `${results[0].label} saved` : `${saved} changes saved`);
      else if (saved) toast.error(`Saved ${saved} of ${results.length} changes`, { description: failed.message });
      else toast.error("Changes not saved", { description: failed.requestId ? `${failed.message} · Reference: ${failed.requestId}` : failed.message });
      return { results, error: failed, ok: !failed, at: new Date() };
    },
    [queryClient, reloadUser]
  );
  return { run, pending };
}

/* ------------------------------------------------------------------ UI */

export function StepResults({ results }) {
  if (!results?.length || (results.length === 1 && results[0].status === "saved")) return null;
  return (
    <ul className="grid gap-1 text-ui-sm" aria-label="Save results">
      {results.map((r, i) => (
        <li key={`${r.label}-${i}`} className="flex items-start gap-2">
          {r.status === "saved" ? (
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success-fg" />
          ) : r.status === "failed" ? (
            <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger-fg" />
          ) : (
            <CircleSlash aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          )}
          <span className="min-w-0">
            <span className="font-medium text-fg">{r.label}</span>
            <span className="text-fg-muted"> — {r.status === "saved" ? "saved" : r.status === "failed" ? r.message : "not attempted"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function timeLabel(d) {
  try {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
}

/**
 * One independently saved settings section.
 *   <SettingsSection title description dirty saving onSubmit onDiscard outcome canEdit>…</SettingsSection>
 * `outcome`: { ok, error, results?, at } from the last save; rendered as an inline result line.
 */
export function SettingsSection({ id, title, description, dirty, saving, onSubmit, onDiscard, outcome, canEdit: canEditProp, children, footerNote, saveLabel = "Save", headerExtra }) {
  const ctx = useSettingsContext();
  const canEdit = canEditProp ?? ctx?.canEdit;
  const autoId = useId();
  const headingId = `${id || autoId}-title`;
  const fieldErrors = outcome?.error && Object.keys(outcome.error.fields || {}).length;
  return (
    <Card as="section" aria-labelledby={headingId}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canEdit && !saving) onSubmit?.();
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={headingId} className="text-ui-lg font-semibold text-fg">
              {title}
            </h2>
            {description ? <p className="mt-1 max-w-2xl text-ui-sm text-fg-muted">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {headerExtra}
            {dirty && canEdit ? <Badge tone="warning" dot>Unsaved</Badge> : null}
          </div>
        </div>
        <fieldset disabled={!canEdit || saving} className="m-0 min-w-0 border-0 px-5 py-5">
          {children}
        </fieldset>
        {canEdit || outcome ? (
          <div className="grid gap-3 border-t border-border px-5 py-3">
            {outcome?.results ? <StepResults results={outcome.results} /> : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <p role="status" className={cn("mr-auto text-ui-sm", outcome?.error ? "text-danger-fg" : "text-fg-muted")}>
                {outcome
                  ? outcome.error
                    ? fieldErrors
                      ? "Fix the highlighted fields and save again."
                      : outcome.results?.length > 1
                        ? "Some changes were not saved."
                        : `Not saved: ${outcome.error.message}`
                    : `Saved at ${timeLabel(outcome.at)}`
                  : footerNote || null}
              </p>
              {canEdit ? (
                <>
                  {dirty ? (
                    <Button variant="ghost" onClick={onDiscard} disabled={saving}>
                      Discard
                    </Button>
                  ) : null}
                  <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                    {saveLabel}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>
    </Card>
  );
}

/** Badge showing whether a registry setting is overridden by the store or inherited from the platform. */
export function OverrideBadge({ settingKey }) {
  const ctx = useSettingsContext();
  if (!ctx?.settings) return null;
  const overridden = Object.prototype.hasOwnProperty.call(ctx.settings, settingKey);
  return overridden ? (
    <Tooltip content={`Your store sets ${settingKey}`}>
      <span tabIndex={0} className="inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring">
        <Badge tone="info">Store value</Badge>
      </span>
    </Tooltip>
  ) : (
    <Tooltip content={`Not set by your store; the platform default applies. Saving stores your own value for ${settingKey}.`}>
      <span tabIndex={0} className="inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring">
        <Badge tone="outline">Platform default</Badge>
      </span>
    </Tooltip>
  );
}

/** Field label with an override badge. */
export function SettingLabel({ children, settingKey }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {children}
      <OverrideBadge settingKey={settingKey} />
    </span>
  );
}

/* ------------------------------------------------------------------ helpers */

export const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const HEX_RX = /^#[0-9a-fA-F]{3,8}$/;
export const GSTIN_RX = /^[0-9A-Z]{15}$/;
export const PIN_RX = /^\d{6}$/;

/** Parse a numeric text input. Returns NaN for empty/invalid. */
export function num(value) {
  if (value === "" || value == null) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function str(value) {
  return value == null ? "" : String(value);
}

/** Error for a field: client error (after first submit) or the server error for that path. */
export function makeErr(showErrors, clientErrors, serverError) {
  return (name) => (showErrors ? clientErrors[name] : undefined) || serverError?.fieldError?.(name);
}

/** Only the keys of `next` whose values differ from `prev`. */
export function changed(prev, next) {
  const out = {};
  Object.keys(next).forEach((k) => {
    if (JSON.stringify(prev?.[k]) !== JSON.stringify(next[k])) out[k] = next[k];
  });
  return out;
}

export function SectionSkeletonNote({ children }) {
  return <p className="text-ui-sm text-fg-muted">{children}</p>;
}
