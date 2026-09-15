import { useState } from "react";
import { api } from "../../shared/api.js";
import { prettyStatus, rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { CMS_STATUSES, CMS_TYPES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

export default function Cms() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listCmsAdmin(query), [query]);
  const rows = rowsOf(data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy("create");
    const form = new FormData(e.currentTarget);
    try {
      await api.createCmsPage({
        title: String(form.get("title") || "").trim(),
        slug: String(form.get("slug") || "").trim() || undefined,
        type: String(form.get("type") || "custom"),
        global: true,
      });
      setOpen(false);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function transition(id, action) {
    setBusy(id);
    setMsg("");
    try {
      await api.cmsTransition(id, action);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function remove(id) {
    setBusy(id);
    setMsg("");
    try {
      await api.deleteCmsPage(id);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">CMS</h1>
          <p className="mt-1 text-sm text-msr-muted">Platform pages, policies, and publish workflow.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New page
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Title or slug"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(CMS_STATUSES),
          },
          {
            key: "type",
            label: "Type",
            value: filters.type || "",
            onChange: (value) => setFilter("type", value),
            options: statusOptions(CMS_TYPES),
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No CMS pages match these filters.">
        <div className="mt-4 grid gap-3">
          {rows.map((page) => (
            <div key={rowId(page)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div>
                <p className="font-bold">{page.title}</p>
                <p className="text-xs text-msr-muted">
                  /{page.slug} · {prettyStatus(page.type)}
                  {page.tenantId?.name ? ` · ${page.tenantId.name}` : " · Platform"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={page.status} />
                {page.status !== "review" && page.status !== "published" ? (
                  <ActionBtn disabled={busy === rowId(page)} onClick={() => transition(rowId(page), "review")}>
                    Review
                  </ActionBtn>
                ) : null}
                {page.status !== "published" ? (
                  <ActionBtn disabled={busy === rowId(page)} onClick={() => transition(rowId(page), "publish")}>
                    Publish
                  </ActionBtn>
                ) : (
                  <ActionBtn danger disabled={busy === rowId(page)} onClick={() => transition(rowId(page), "unpublish")}>
                    Unpublish
                  </ActionBtn>
                )}
                <ActionBtn danger disabled={busy === rowId(page)} onClick={() => remove(rowId(page))}>
                  Delete
                </ActionBtn>
              </div>
            </div>
          ))}
        </div>
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
      {open ? (
        <PanelModal title="Create page" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={create}>
            <input name="title" required placeholder="Title" className={FIELD} />
            <input name="slug" placeholder="slug (optional)" className={FIELD} />
            <select name="type" className={FIELD} defaultValue="custom">
              {CMS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {prettyStatus(type)}
                </option>
              ))}
            </select>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "create"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "create" ? "Creating…" : "Create page"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
