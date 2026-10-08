import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, Card, Checkbox, EmptyState, Input, Tooltip, cn } from "../../../shared/ui/index.js";
import { groupPermissions, holds } from "./permissions.js";

/**
 * Grouped permission checklist.
 * value: string[]; onChange(next: string[]); available: string[] (keys from GET /permissions);
 * myPermissions: keys the actor holds (others are disabled — backend 403s on granting them);
 * readOnly: render checks without interaction (system roles / no edit permission).
 */
export function PermissionMatrix({ value, onChange, available, myPermissions, readOnly }) {
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  // Keys already on the role that the catalog doesn't list (e.g. renamed) still show up.
  const allKeys = useMemo(() => [...new Set([...available, ...value])], [available, value]);
  const groups = useMemo(() => groupPermissions(allKeys), [allKeys]);
  const term = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: term
            ? g.items.filter((i) => [i.key, i.label, i.description, g.label].some((v) => String(v).toLowerCase().includes(term)))
            : g.items,
        }))
        .filter((g) => g.items.length),
    [groups, term]
  );

  const grantable = (key) => !readOnly && holds(myPermissions, key);

  function toggle(key, on) {
    const next = new Set(selected);
    if (on) next.add(key);
    else next.delete(key);
    onChange([...next].sort());
  }

  function toggleGroup(items, on) {
    const next = new Set(selected);
    items.filter((i) => grantable(i.key)).forEach((i) => (on ? next.add(i.key) : next.delete(i.key)));
    onChange([...next].sort());
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          size="sm"
          type="search"
          aria-label="Filter permissions"
          placeholder="Filter permissions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          prefix={<Search aria-hidden />}
          className="w-full sm:w-72"
        />
        <span className="text-ui-sm text-fg-muted" aria-live="polite">
          <span className="font-semibold tabular-nums text-fg">{selected.size}</span> of {allKeys.length} selected
        </span>
        {!readOnly ? (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => toggleGroup(groups.flatMap((g) => g.items), true)}>
              Select all
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange([...selected].filter((k) => !grantable(k)).sort())} disabled={!selected.size}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      {!visible.length ? (
        <EmptyState compact title="No permissions match" description="Try a different word, like “orders” or “refund”." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((g) => {
            const editable = g.items.filter((i) => grantable(i.key));
            const on = g.items.filter((i) => selected.has(i.key)).length;
            const editableOn = editable.filter((i) => selected.has(i.key)).length;
            const groupState = editable.length && editableOn === editable.length ? true : editableOn ? "indeterminate" : false;
            return (
              <Card key={g.id} as="section" aria-labelledby={`perm-group-${g.id}`} className="overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {!readOnly ? (
                      <div className="pt-0.5">
                        <Checkbox
                          aria-label={`Select all ${g.label} permissions`}
                          checked={groupState}
                          disabled={!editable.length}
                          onCheckedChange={(v) => toggleGroup(g.items, v === true)}
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <h3 id={`perm-group-${g.id}`} className="text-ui font-semibold text-fg">
                        {g.label}
                      </h3>
                      <p className="text-ui-xs text-fg-subtle">{g.description}</p>
                    </div>
                  </div>
                  <Badge tone={on ? "primary" : "neutral"}>
                    {on}/{g.items.length}
                  </Badge>
                </div>
                <ul className="divide-y divide-border">
                  {g.items.map((i) => {
                    const canGrant = grantable(i.key);
                    const notHeld = !readOnly && !holds(myPermissions, i.key);
                    const row = (
                      <li key={i.key} className={cn("px-4 py-2.5", notHeld && "opacity-60")}>
                        <Checkbox
                          checked={selected.has(i.key)}
                          disabled={!canGrant}
                          onCheckedChange={(v) => toggle(i.key, v === true)}
                          label={
                            <span className="inline-flex flex-wrap items-center gap-x-2">
                              {i.label}
                              <code className="font-mono text-ui-2xs font-normal text-fg-subtle">{i.key}</code>
                            </span>
                          }
                          description={notHeld ? `${i.description} You can’t grant this because you don’t hold it.` : i.description}
                        />
                      </li>
                    );
                    return notHeld ? (
                      <Tooltip key={i.key} content="You can only grant permissions you hold yourself" side="top" align="start">
                        {row}
                      </Tooltip>
                    ) : (
                      row
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
