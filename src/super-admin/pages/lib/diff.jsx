import { useMemo, useState } from "react";
import { cn } from "../../../shared/ui/cn.js";
import { Button } from "../../../shared/ui/index.js";

const isPlain = (v) => v != null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Flatten an object into { "a.b.c": value } (arrays are kept whole unless `arrays: true`). */
export function flatten(value, prefix = "", out = {}, { arrays = false } = {}) {
  if (isPlain(value)) {
    const keys = Object.keys(value);
    if (!keys.length && prefix) out[prefix] = {};
    keys.forEach((k) => flatten(value[k], prefix ? `${prefix}.${k}` : k, out, { arrays }));
  } else if (arrays && Array.isArray(value) && value.length) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out, { arrays }));
  } else if (prefix) {
    out[prefix] = value;
  }
  return out;
}

const IGNORED = /(^|\.)(_id|__v|updatedAt|createdAt|version)$/;

/**
 * A populated reference on one side ({ _id, name, … }) and its bare id on the other are the same
 * value: collapse the object to its id so audit diffs don't report "tenantId changed".
 */
function collapseRefs(a, b) {
  if (isPlain(a) && isPlain(b)) {
    const outA = { ...a };
    const outB = { ...b };
    Object.keys(a).forEach((k) => {
      if (k in b) [outA[k], outB[k]] = collapseRefs(a[k], b[k]);
    });
    return [outA, outB];
  }
  if (isPlain(a) && a._id != null && typeof b === "string" && String(a._id) === b) return [b, b];
  if (isPlain(b) && b._id != null && typeof a === "string" && String(b._id) === a) return [a, a];
  return [a, b];
}

/** [{ path, before, after, kind: "added" | "removed" | "changed" }] between two objects. */
export function diffPaths(before, after, { ignore = IGNORED, arrays = true } = {}) {
  const [x, y] = collapseRefs(before || {}, after || {});
  const a = flatten(x, "", {}, { arrays });
  const b = flatten(y, "", {}, { arrays });
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((p) => !ignore || !ignore.test(p)).sort();
  return paths
    .filter((p) => !same(a[p], b[p]))
    .map((p) => ({ path: p, before: a[p], after: b[p], kind: !(p in a) ? "added" : !(p in b) ? "removed" : "changed" }));
}

/**
 * Partial patch with only the fields that changed. Nested plain objects listed in `nested` are
 * diffed one level deep (the backend merges them field by field); everything else is compared whole.
 */
export function changedFields(initial, current, { nested = [] } = {}) {
  const out = {};
  Object.keys(current || {}).forEach((key) => {
    const a = initial?.[key];
    const b = current[key];
    if (nested.includes(key) && isPlain(b)) {
      const sub = {};
      Object.keys(b).forEach((k) => {
        if (!same(a?.[k], b[k])) sub[k] = b[k];
      });
      if (Object.keys(sub).length) out[key] = sub;
    } else if (!same(a, b)) {
      out[key] = b;
    }
  });
  return out;
}

function show(v) {
  if (v === undefined) return <span className="text-fg-subtle">—</span>;
  if (v === null) return <span className="text-fg-subtle">null</span>;
  if (typeof v === "string") return v === "" ? <span className="text-fg-subtle">""</span> : v;
  return JSON.stringify(v);
}

/**
 * Before/after table of changed paths.
 *   <JsonDiff before={entry.before} after={entry.after} />
 */
export function JsonDiff({ before, after, ignore, empty = "No field changes recorded.", className, max = 200 }) {
  const rows = useMemo(() => diffPaths(before, after, ignore === undefined ? undefined : { ignore }), [before, after, ignore]);
  const [all, setAll] = useState(false);
  if (!rows.length) return <p className={cn("text-ui-sm text-fg-subtle", className)}>{empty}</p>;
  const visible = all ? rows : rows.slice(0, max);
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-ui-xs">
          <thead className="bg-surface-2 text-left text-fg-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Field</th>
              <th scope="col" className="px-3 py-2 font-medium">Before</th>
              <th scope="col" className="px-3 py-2 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.path} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-fg">{r.path}</td>
                <td className={cn("break-all px-3 py-1.5 font-mono", r.kind !== "added" && "bg-danger-soft text-danger-fg")}>{show(r.before)}</td>
                <td className={cn("break-all px-3 py-1.5 font-mono", r.kind !== "removed" && "bg-success-soft text-success-fg")}>{show(r.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > max ? (
        <Button size="xs" variant="ghost" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${rows.length} changes`}
        </Button>
      ) : null}
    </div>
  );
}

/** Pretty JSON block. */
export function JsonBlock({ value, className }) {
  return (
    <pre className={cn("max-h-80 overflow-auto rounded-md border border-border bg-surface-sunken p-3 font-mono text-ui-xs text-fg", className)}>
      {value === undefined ? "—" : JSON.stringify(value, null, 2)}
    </pre>
  );
}
