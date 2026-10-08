import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Card, Checkbox, Input } from "../../../shared/ui/index.js";
import { cn } from "../../../shared/ui/cn.js";
import { groupPermissions, indexCatalog, labelOf } from "./permissions.js";

/**
 * Grouped permission picker with per-group select-all. Groups, labels and descriptions come from
 * GET /permissions (`catalog`).
 *   <PermissionMatrix catalog={rows} value={Set} onChange={(nextSet) => …} readOnly tenantRole initial={Set} />
 */
export function PermissionMatrix({ catalog = [], value, onChange, readOnly = false, tenantRole = true, initial }) {
  const [filter, setFilter] = useState("");
  const groups = useMemo(() => groupPermissions(catalog, { tenantRole }), [catalog, tenantRole]);
  const byKey = useMemo(() => indexCatalog(catalog), [catalog]);
  const f = filter.trim().toLowerCase();
  const matches = (k, g) => {
    if (!f) return true;
    const row = byKey.get(k);
    return [k, row?.label, row?.description, g.label].some((s) => String(s || "").toLowerCase().includes(f));
  };
  const visible = groups.map((g) => ({ ...g, keys: g.keys.filter((k) => matches(k, g)) })).filter((g) => g.keys.length);
  const total = groups.reduce((n, g) => n + g.keys.length, 0);
  const selectedCount = groups.reduce((n, g) => n + g.keys.filter((k) => value.has(k)).length, 0);

  const toggle = (key, on) => {
    const next = new Set(value);
    on ? next.add(key) : next.delete(key);
    onChange(next);
  };
  const toggleGroup = (keys, on) => {
    const next = new Set(value);
    keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          size="sm"
          type="search"
          aria-label="Filter permissions"
          placeholder="Filter permissions"
          prefix={<Search aria-hidden />}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:w-64"
        />
        <p className="text-ui-sm text-fg-muted" aria-live="polite">
          <span className="font-medium tabular-nums text-fg">{selectedCount}</span> of {total} selected
        </p>
      </div>
      {!visible.length ? <p className="py-6 text-center text-ui-sm text-fg-subtle">No permissions match “{filter}”.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((g) => {
          const all = groups.find((x) => x.id === g.id)?.keys || g.keys;
          const on = all.filter((k) => value.has(k)).length;
          const state = on === 0 ? false : on === all.length ? true : "indeterminate";
          return (
            <Card key={g.id} as="fieldset" className="min-w-0 p-0">
              <legend className="sr-only">{g.label}</legend>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                <Checkbox
                  label={g.label}
                  checked={state}
                  disabled={readOnly}
                  onCheckedChange={() => toggleGroup(all, state !== true)}
                  aria-label={`Select all ${g.label} permissions`}
                />
                <span className="shrink-0 text-ui-xs tabular-nums text-fg-subtle">
                  {on}/{all.length}
                </span>
              </div>
              <ul className="grid gap-2.5 px-4 py-3">
                {g.keys.map((k) => {
                  const row = byKey.get(k);
                  const changed = initial && initial.has(k) !== value.has(k);
                  return (
                    <li key={k} className={cn("flex items-start justify-between gap-2", changed && "-mx-2 rounded-sm bg-primary-soft/40 px-2")}>
                      <Checkbox
                        label={
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span>{row?.label || labelOf(k)}</span>
                            <span className="font-mono text-ui-2xs text-fg-subtle">{k}</span>
                          </span>
                        }
                        description={row?.description || undefined}
                        checked={value.has(k)}
                        disabled={readOnly}
                        onCheckedChange={(v) => toggle(k, Boolean(v))}
                      />
                      {changed ? <Badge tone={value.has(k) ? "success" : "danger"}>{value.has(k) ? "added" : "removed"}</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default PermissionMatrix;
