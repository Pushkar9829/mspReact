import { useEffect, useState } from "react";
import { api } from "../api.js";
import { prettyStatus, rowsOf } from "../auth.js";
import { formatDateTime } from "../lib/format.js";
import { useApi } from "../hooks/useApi.js";
import { useListQuery } from "../hooks/useListQuery.js";
import { PanelState } from "./PanelTable.jsx";
import { ActionBtn, FIELD, PanelPager, PanelToolbar, StatusBadge } from "./PanelKit.jsx";
import { CHAT_STATUSES, metaOf, rowId, statusOptions } from "../lib/panel.js";

export default function SupportInbox({
  title = "Support",
  subtitle = "Search, filter, reply, or close conversations.",
  showTenants = false,
}) {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listChats(query), [query]);
  const tenants = useApi(() => (showTenants ? api.listTenants({ limit: 100 }) : Promise.resolve({ data: [] })), [showTenants]);
  const rows = rowsOf(data);
  const tenantRows = rowsOf(tenants.data);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const active = rows.find((row) => rowId(row) === activeId) || null;

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    api
      .listChatMessages(activeId)
      .then((list) => {
        if (!cancelled) setMessages(Array.isArray(list) ? list : rowsOf(list));
      })
      .catch((err) => {
        if (!cancelled) setMsg(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function send(e) {
    e.preventDefault();
    if (!reply.trim() || !activeId) return;
    setBusy("send");
    setMsg("");
    try {
      const created = await api.postChatMessage(activeId, { body: reply.trim() });
      setMessages((prev) => [...prev, created]);
      setReply("");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function close() {
    if (!activeId) return;
    setBusy("close");
    try {
      await api.closeChat(activeId);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function assign() {
    if (!activeId) return;
    setBusy("assign");
    try {
      await api.assignChat(activeId);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="mt-1 text-sm text-msr-muted">{subtitle}</p>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Subject or customer"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(CHAT_STATUSES),
          },
          ...(showTenants
            ? [
                {
                  key: "tenantId",
                  label: "Tenant",
                  value: filters.tenantId || "",
                  onChange: (value) => setFilter("tenantId", value),
                  options: tenantRows.map((row) => ({ value: rowId(row), label: row.name })),
                },
              ]
            : []),
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No conversations match these filters.">
            <div className="grid gap-2">
              {rows.map((row) => {
                const id = rowId(row);
                const selected = id === activeId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveId(id)}
                    className={`rounded-2xl bg-white p-4 text-left shadow-sm ${selected ? "ring-1 ring-msr-navy/20" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.subject || prettyStatus(row.type) || "Conversation"}</p>
                        <p className="mt-1 text-xs text-msr-muted">
                          {row.buyerId?.email || row.buyerId?.name || "Customer"}
                          {showTenants ? ` · ${row.tenantId?.name || "Platform"}` : ""}
                        </p>
                      </div>
                      <StatusBadge value={row.status} />
                    </div>
                    <p className="mt-2 text-[11px] text-msr-muted">{formatDateTime(row.lastMessageAt || row.updatedAt)}</p>
                  </button>
                );
              })}
            </div>
          </PanelState>
          <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {!active ? (
            <p className="text-sm text-msr-muted">Select a conversation.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{active.subject || prettyStatus(active.type)}</h2>
                  <p className="text-xs text-msr-muted">{active.buyerId?.email}</p>
                </div>
                <div className="flex gap-3">
                  {active.status !== "assigned" && active.status !== "closed" ? (
                    <ActionBtn disabled={busy === "assign"} onClick={assign}>
                      Assign me
                    </ActionBtn>
                  ) : null}
                  {active.status !== "closed" ? (
                    <ActionBtn danger disabled={busy === "close"} onClick={close}>
                      Close
                    </ActionBtn>
                  ) : null}
                </div>
              </div>
              <div className="msr-pane mt-4 max-h-[48vh] space-y-3 overflow-y-auto">
                {messages.map((item) => (
                  <div key={rowId(item)} className="rounded-xl bg-msr-bg px-3 py-2">
                    <p className="text-[11px] font-semibold text-msr-muted">
                      {item.senderId?.name || item.senderId?.email || "User"} · {formatDateTime(item.createdAt)}
                      {item.internal ? " · internal" : ""}
                    </p>
                    <p className="mt-1 text-sm">{item.body}</p>
                  </div>
                ))}
                {!messages.length ? <p className="text-sm text-msr-muted">No messages yet.</p> : null}
              </div>
              {active.status !== "closed" ? (
                <form className="mt-4 grid gap-2" onSubmit={send}>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="Reply…" className={FIELD} />
                  <button disabled={busy === "send"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
                    {busy === "send" ? "Sending…" : "Send reply"}
                  </button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-msr-muted">This conversation is closed.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
