import { useState } from "react";
import { api } from "../api.js";
import { rowId } from "../lib/panel.js";
import { ActionBtn, FIELD, PanelModal } from "./PanelKit.jsx";

/** Add, rename or delete categories / brands so a typo can be fixed after creating one. */
export default function CatalogManager({ kind, rows, onClose, onChanged, canEdit = () => true, note = "" }) {
  const label = kind === "category" ? "category" : "brand";
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", tone: "muted" });

  async function run(key, fn, done) {
    setBusy(key);
    setMsg({ text: "", tone: "muted" });
    try {
      await fn();
      setMsg({ text: done, tone: "muted" });
      onChanged();
    } catch (err) {
      setMsg({ text: err.message, tone: "danger" });
    } finally {
      setBusy("");
    }
  }

  function create(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim();
    if (!name) return;
    run(
      "create",
      async () => {
        if (kind === "category") await api.createCategory({ name });
        else await api.createBrand({ name });
        form.reset();
      },
      `Added ${name}.`
    );
  }

  function rename(row) {
    const id = rowId(row);
    const name = String(names[id] ?? row.name).trim();
    if (!name || name === row.name) return;
    run(
      id,
      () => (kind === "category" ? api.updateCategory(id, { name }) : api.updateBrand(id, { name })),
      `Renamed to ${name}.`
    );
  }

  function remove(row) {
    const id = rowId(row);
    if (!window.confirm(`Delete ${label} “${row.name}”? This cannot be undone.`)) return;
    run(id, () => (kind === "category" ? api.deleteCategory(id) : api.deleteBrand(id)), `Deleted ${row.name}.`);
  }

  return (
    <PanelModal title={kind === "category" ? "Categories" : "Brands"} onClose={onClose}>
      <form className="flex gap-2" onSubmit={create}>
        <input name="name" required placeholder={`New ${label} name`} className={`flex-1 ${FIELD}`} />
        <button disabled={busy === "create"} className="rounded-xl bg-msr-navy px-4 text-sm font-bold text-white disabled:opacity-50">
          {busy === "create" ? "Adding…" : "Add"}
        </button>
      </form>
      {msg.text ? (
        <p className={`mt-3 text-sm ${msg.tone === "danger" ? "text-msr-danger" : "text-msr-muted"}`}>{msg.text}</p>
      ) : null}
      <p className="mt-4 text-xs text-msr-muted">
        Edit a name and press Save (or Enter) to fix a mistake. A {label} that products still use can’t be deleted.
        {note ? ` ${note}` : ""}
      </p>
      <ul className="mt-2 max-h-[50vh] divide-y divide-[#eceef4] overflow-auto rounded-xl border border-[#eceef4]">
        {rows.map((row) => {
          const id = rowId(row);
          if (!canEdit(row)) {
            return (
              <li key={id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span>{row.name}</span>
                <span className="rounded-md bg-[#f2f4f8] px-2 py-0.5 text-[11px] font-semibold text-msr-muted">Shared</span>
              </li>
            );
          }
          const value = names[id] ?? row.name;
          const dirty = value.trim() && value.trim() !== row.name;
          return (
            <li key={id} className="flex items-center gap-2 p-2">
              <input
                value={value}
                onChange={(e) => setNames((prev) => ({ ...prev, [id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") rename(row);
                  if (e.key === "Escape") setNames((prev) => ({ ...prev, [id]: row.name }));
                }}
                aria-label={`${label} name`}
                className={`flex-1 ${FIELD}`}
              />
              <ActionBtn disabled={!dirty || busy === id} onClick={() => rename(row)}>
                Save
              </ActionBtn>
              {dirty ? (
                <ActionBtn onClick={() => setNames((prev) => ({ ...prev, [id]: row.name }))}>Reset</ActionBtn>
              ) : null}
              <ActionBtn danger disabled={busy === id} onClick={() => remove(row)}>
                Delete
              </ActionBtn>
            </li>
          );
        })}
        {!rows.length ? <li className="p-4 text-center text-sm text-msr-muted">No {label === "category" ? "categories" : "brands"} yet.</li> : null}
      </ul>
    </PanelModal>
  );
}
