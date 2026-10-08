/**
 * Setting metadata for the settings console.
 *
 * GET /settings/keys returns `definitions: [{ key, type, label, description, group, scopes, overridable,
 * default, secret, public, min?, max?, enum? }]` — that is the source of truth. Call
 * `registerDefinitions(defs)` with every definitions list you load; `metaFor(key)` then merges the
 * server definition with the small UI overlay below (input adornments, rich editors for the partner
 * list and the festival banner, option labels).
 *
 * Meta shape: { key, label, description, group, type, scopes, overridable, default, secret, public,
 *   min, max, int, step, prefix, suffix, required, options }
 *   type: "string" | "email" | "number" | "boolean" | "enum" | "partners" | "festival" | "json"
 *   number: min/max are values; string/email: min/max are lengths.
 *
 * Drafts: every editor works on a "draft" representation (strings for number inputs, IST local
 * datetimes for the festival window…). `toDraft(meta, value)` / `fromDraft(meta, draft)` convert
 * between the stored value and the draft, and `validateDraft(meta, draft)` returns
 * { [path]: message } where "" is the value itself and "0.fee" / "title" are nested paths, matching
 * the server's `fields: { "value.<path>": message }` (see parseServerError).
 */
import { fromIstInputValue, toIstInputValue } from "../../../shared/lib/format.js";

/** UI-only hints layered over the server definitions. */
const OVERLAY = {
  "platform.name": { required: true },
  "platform.currency": { options: [{ value: "INR", label: "INR — Indian Rupee (₹)" }] },
  "platform.defaultTaxRate": { step: 0.01, suffix: "%" },
  "platform.mapsProvider": {
    options: [
      { value: "stub", label: "Stub (offline, approximate PIN-code locations)" },
      { value: "google", label: "Google Maps (needs MAPS_API_KEY on the server)" },
    ],
  },
  "platform.festival": { type: "festival" },
  "returns.windowDays": { suffix: "days" },
  "platform.feeAmount": { step: 0.01, prefix: "₹" },
  "platform.feePercent": { step: 0.01, suffix: "%" },
  "platform.deliveryPartners": { type: "partners" },
  "delivery.freeAbove": { step: 0.01, prefix: "₹" },
};

const SERVER = new Map();

/** Merge server definitions (GET /settings/keys → definitions) into the registry. */
export function registerDefinitions(defs = []) {
  (defs || []).forEach((d) => d?.key && SERVER.set(d.key, d));
}

function fromServer(def) {
  const base = {
    key: def.key,
    label: def.label || def.key,
    description: def.description || "",
    group: def.group || "Other",
    scopes: def.scopes || [],
    overridable: Boolean(def.overridable),
    default: def.default ?? null,
    secret: Boolean(def.secret),
    public: Boolean(def.public),
    min: def.min,
    max: def.max,
  };
  switch (def.type) {
    case "integer":
      return { ...base, type: "number", int: true, step: 1 };
    case "number":
      return { ...base, type: "number" };
    case "string":
    case "email":
    case "boolean":
      return { ...base, type: def.type };
    case "enum":
      return { ...base, type: "enum", options: (def.enum || []).map((v) => ({ value: String(v), label: String(v) })) };
    default:
      return { ...base, type: "json" };
  }
}

/** Metadata for a key (server definition + UI overlay). Unknown keys are edited as raw JSON. */
export function metaFor(key) {
  const def = SERVER.get(key);
  const overlay = OVERLAY[key] || {};
  if (!def) {
    return {
      key,
      label: key,
      description: "Not described by the API — edit the raw JSON value.",
      type: "json",
      group: "Other",
      scopes: [],
      default: null,
      unknown: true,
      ...overlay,
      ...(overlay.type ? {} : { type: "json" }),
    };
  }
  return { ...fromServer(def), ...overlay };
}

/** Ordered groups → keys for `keys` (server order is kept). */
export function groupKeys(keys = []) {
  const out = new Map();
  keys.forEach((k) => {
    const g = metaFor(k).group || "Other";
    if (!out.has(g)) out.set(g, []);
    out.get(g).push(k);
  });
  return [...out.entries()].map(([label, list]) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, keys: list }));
}

export const TYPE_LABELS = {
  string: "Text",
  email: "Email",
  number: "Number",
  boolean: "On / off",
  enum: "Choice",
  partners: "Partner list",
  festival: "Banner",
  json: "JSON",
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export { same as sameValue };

/* ------------------------------------------------------------------ draft conversion */

function festivalDraft(value) {
  if (!value || typeof value !== "object") return null;
  return {
    enabled: Boolean(value.enabled),
    title: value.title || "",
    message: value.message || "",
    startsAt: value.startsAt ? toIstInputValue(value.startsAt) : "",
    endsAt: value.endsAt ? toIstInputValue(value.endsAt) : "",
  };
}

export function toDraft(meta, value) {
  switch (meta.type) {
    case "number":
      return value == null || value === "" ? "" : String(value);
    case "boolean":
      return Boolean(value);
    case "string":
    case "email":
    case "enum":
      return value == null ? "" : String(value);
    case "partners":
      return (Array.isArray(value) ? value : []).map((p) => ({
        id: String(p?.id ?? ""),
        name: String(p?.name ?? ""),
        fee: p?.fee == null ? "" : String(p.fee),
        isDefault: Boolean(p?.isDefault),
      }));
    case "festival":
      return festivalDraft(value);
    default:
      return value === undefined ? "" : JSON.stringify(value, null, 2);
  }
}

/** Draft → value sent to PUT /settings/:key. Returns { value, parseError? }. */
export function fromDraft(meta, draft) {
  switch (meta.type) {
    case "number": {
      if (draft === "" || draft == null) return { value: null, parseError: "Enter a number" };
      const n = Number(draft);
      return Number.isFinite(n) ? { value: n } : { value: null, parseError: "Enter a number" };
    }
    case "boolean":
      return { value: Boolean(draft) };
    case "string":
    case "email":
      return { value: String(draft ?? "").trim() };
    case "enum":
      return { value: String(draft ?? "") };
    case "partners":
      return {
        value: (draft || []).map((p) => ({
          id: String(p.id || "").trim(),
          name: String(p.name || "").trim(),
          fee: p.fee === "" || p.fee == null ? NaN : Number(p.fee),
          isDefault: Boolean(p.isDefault),
        })),
      };
    case "festival":
      if (!draft) return { value: null };
      return {
        value: {
          enabled: Boolean(draft.enabled),
          title: String(draft.title || "").trim(),
          message: String(draft.message || "").trim(),
          startsAt: draft.startsAt ? fromIstInputValue(draft.startsAt) || null : null,
          endsAt: draft.endsAt ? fromIstInputValue(draft.endsAt) || null : null,
        },
      };
    default: {
      const text = String(draft ?? "").trim();
      if (!text) return { value: null, parseError: "Enter a JSON value (use null for empty)" };
      try {
        return { value: JSON.parse(text) };
      } catch (e) {
        return { value: null, parseError: `Invalid JSON: ${e.message}` };
      }
    }
  }
}

/** Normalised stored value (draft round trip) so dirty checks ignore formatting differences. */
export function normalizeValue(meta, value) {
  return fromDraft(meta, toDraft(meta, value)).value;
}

/* ------------------------------------------------------------------ validation */

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (n) => Number(n).toLocaleString("en-IN");

/** Validate a draft against the definition. Returns { [path]: message } (empty object when valid). */
export function validateDraft(meta, draft) {
  const { value, parseError } = fromDraft(meta, draft);
  if (parseError) return { "": parseError };
  const errs = {};
  switch (meta.type) {
    case "number":
      if (meta.int && !Number.isInteger(value)) errs[""] = "Must be a whole number";
      else if (meta.min != null && value < meta.min) errs[""] = `Must be at least ${meta.prefix || ""}${fmt(meta.min)}`;
      else if (meta.max != null && value > meta.max) errs[""] = `Must be at most ${meta.prefix || ""}${fmt(meta.max)}`;
      break;
    case "string":
    case "email":
      if ((meta.required || meta.min) && value.length < Math.max(1, meta.min || 0)) errs[""] = meta.min > 1 ? `At least ${meta.min} characters` : "Required";
      else if (meta.max && value.length > meta.max) errs[""] = `At most ${meta.max} characters`;
      else if (meta.type === "email" && value && !EMAIL_RX.test(value)) errs[""] = "Enter a valid email address";
      break;
    case "enum":
      if (!(meta.options || []).some((o) => o.value === value)) errs[""] = "Pick one of the options";
      break;
    case "partners": {
      if (value.length < 1) errs[""] = "Add at least one delivery partner";
      if (value.length > 20) errs[""] = "At most 20 delivery partners";
      const seen = new Map();
      value.forEach((p, i) => {
        if (!p.id) errs[`${i}.id`] = "Required";
        else if (p.id.length > 40) errs[`${i}.id`] = "At most 40 characters";
        else if (seen.has(p.id)) errs[`${i}.id`] = "Ids must be unique";
        seen.set(p.id, i);
        if (!p.name) errs[`${i}.name`] = "Required";
        else if (p.name.length > 80) errs[`${i}.name`] = "At most 80 characters";
        if (!Number.isFinite(p.fee)) errs[`${i}.fee`] = "Enter a fee";
        else if (p.fee < 0) errs[`${i}.fee`] = "Can't be negative";
        else if (p.fee > 10_000) errs[`${i}.fee`] = "At most ₹10,000";
      });
      break;
    }
    case "festival": {
      if (!value) break;
      if (value.title.length > 100) errs.title = "At most 100 characters";
      if (value.message.length > 500) errs.message = "At most 500 characters";
      if (value.enabled && !value.message) errs.message = "A message is required while the banner is enabled";
      if (draft.startsAt && !value.startsAt) errs.startsAt = "Invalid date";
      if (draft.endsAt && !value.endsAt) errs.endsAt = "Invalid date";
      if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) errs.endsAt = "Must be after the start";
      break;
    }
    default:
      break;
  }
  return errs;
}

/** Warnings that don't block saving. */
export function draftWarnings(meta, draft) {
  if (meta.type !== "partners") return [];
  const defaults = (draft || []).filter((p) => p.isDefault).length;
  if (defaults === 0) return ["No partner is marked default — the first one will be used."];
  if (defaults > 1) return ["More than one partner is marked default — the first of them will be used."];
  return [];
}

/**
 * Server error → editor paths. Uses `fields` ({ "value.0.fee": msg, "value": msg }) when present,
 * else parses the message ("value.0.fee: Too big…"), else { "": message }.
 */
export function parseServerError(err) {
  const fields = err?.fields && typeof err.fields === "object" ? err.fields : {};
  const out = {};
  Object.entries(fields).forEach(([k, v]) => {
    const m = /^value(?:\.(.+))?$/.exec(k);
    if (m) out[m[1] || ""] = v;
  });
  if (Object.keys(out).length) return out;
  const msg = String(err?.message || "Request failed");
  const m = /^value(?:\.([\w.]+))?:\s+(.+)$/.exec(msg);
  if (m) return { [m[1] || ""]: m[2] };
  return { "": msg };
}

/** Is the festival banner live right now (mirrors liveFestival() in settings/routes.js)? */
export function festivalLive(value, now = Date.now()) {
  if (!value || !value.enabled || !String(value.message || "").trim()) return false;
  if (value.startsAt && now < new Date(value.startsAt).getTime()) return false;
  if (value.endsAt && now > new Date(value.endsAt).getTime()) return false;
  return true;
}

export const SECRET_MASK = "••••••••";

/** Short human summary of a stored value (tables, override list). Secrets are masked. */
export function summarizeValue(meta, value) {
  if (value === undefined) return "—";
  if (meta.secret) return value == null || value === "" ? "(not set)" : SECRET_MASK;
  if (value === null) return meta.type === "festival" ? "No banner" : "null";
  switch (meta.type) {
    case "boolean":
      return value ? "On" : "Off";
    case "number":
      return `${meta.prefix || ""}${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}${meta.suffix ? (meta.suffix === "%" ? "%" : ` ${meta.suffix}`) : ""}`;
    case "partners":
      return Array.isArray(value) ? `${value.length} partner${value.length === 1 ? "" : "s"} (${value.map((p) => p.name).join(", ")})` : "—";
    case "festival":
      return value.enabled ? `On: ${value.title || "Festival wishes"}` : "Off";
    case "enum":
      return meta.options?.find((o) => o.value === value)?.label || String(value);
    case "string":
    case "email":
      return value === "" ? "(empty)" : String(value);
    default:
      return JSON.stringify(value);
  }
}
