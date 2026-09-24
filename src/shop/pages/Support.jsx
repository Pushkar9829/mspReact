import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { formatDate } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { AccountCard, AccountEmpty, AccountHead, accountField } from "../components/accountUi.jsx";

export default function Support() {
  const chats = useApi(() => api.listChats({ limit: 30 }), []);
  const orders = useApi(() => api.listOrders({ limit: 20 }), []);
  const threads = rowsOf(chats.data);
  const orderRows = rowsOf(orders.data);
  const [activeId, setActiveId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const thread = useApi(() => (activeId ? api.listChatMessages(activeId) : Promise.resolve([])), [activeId]);
  const messages = rowsOf(thread.data);

  async function start(e) {
    e.preventDefault();
    setBusy("start");
    setError("");
    try {
      const created = await api.createChat({
        subject: subject.trim(),
        message: message.trim(),
        ...(orderId ? { orderId } : {}),
      });
      setSubject("");
      setMessage("");
      setOrderId("");
      setActiveId(created._id);
      chats.reload();
    } catch (err) {
      setError(err.message || "Could not start a conversation.");
    } finally {
      setBusy("");
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    setBusy("reply");
    setError("");
    try {
      await api.postChatMessage(activeId, { body: reply.trim() });
      setReply("");
      thread.reload();
      chats.reload();
    } catch (err) {
      setError(err.message || "Could not send the message.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <AccountHead
        title="Support"
        subtitle="Message the store about an order, or write to platform support."
      />

      <form onSubmit={start} className="mt-5">
        <AccountCard>
          <h2 className="font-bold text-msr-navy">New message</h2>
          <div className="mt-3 grid gap-3">
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className={accountField}
            />
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={accountField}>
              <option value="">Platform support (no order)</option>
              {orderRows.map((order) => (
                <option key={order._id} value={order._id}>
                  {order.orderNumber}
                  {order.tenantId?.name ? ` · ${order.tenantId.name}` : ""}
                </option>
              ))}
            </select>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              className={`${accountField} h-auto py-3`}
            />
            {error && !activeId ? <p className="text-sm text-msr-danger">{error}</p> : null}
            <button
              type="submit"
              disabled={busy === "start"}
              className="h-11 rounded-full bg-msr-navy text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "start" ? "Sending…" : "Send message"}
            </button>
          </div>
        </AccountCard>
      </form>

      <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          {chats.loading && !threads.length ? <p className="text-sm text-msr-muted">Loading conversations…</p> : null}
          {chats.error ? <p className="text-sm text-msr-danger">{chats.error}</p> : null}
          {!chats.loading && !threads.length ? (
            <AccountEmpty icon={MessageCircle} title="No conversations yet" text="Send a message and it will show up here." />
          ) : null}
          {threads.map((row) => (
            <button
              key={row._id}
              type="button"
              onClick={() => setActiveId(row._id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left ${
                activeId === row._id ? "border-msr-navy bg-msr-navy text-white" : "border-msr-line bg-white text-msr-navy"
              }`}
            >
              <p className="truncate text-sm font-bold">{row.subject || "Support"}</p>
              <p className={`mt-1 text-[12px] ${activeId === row._id ? "text-white/70" : "text-msr-muted"}`}>
                {String(row.status || "").replaceAll("_", " ")} · {formatDate(row.lastMessageAt || row.createdAt)}
              </p>
            </button>
          ))}
        </div>

        <AccountCard>
          {!activeId ? (
            <p className="text-sm text-msr-muted">Choose a conversation to read the thread.</p>
          ) : (
            <>
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {thread.loading ? <p className="text-sm text-msr-muted">Loading messages…</p> : null}
                {messages.map((msg) => (
                  <div key={msg._id} className="rounded-xl bg-msr-surface px-3 py-2">
                    <p className="text-[12px] font-bold text-msr-muted">{msg.senderId?.name || "Support"}</p>
                    <p className="mt-1 text-sm text-msr-navy">{msg.body}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="mt-4 grid gap-2">
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply"
                  className={`${accountField} h-auto py-3`}
                />
                {error && activeId ? <p className="text-sm text-msr-danger">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy === "reply" || !reply.trim()}
                  className="h-11 rounded-full bg-msr-navy text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "reply" ? "Sending…" : "Reply"}
                </button>
              </form>
            </>
          )}
          <Link to="/account/help" className="mt-4 inline-block text-sm font-bold text-msr-navy">
            Help topics →
          </Link>
        </AccountCard>
      </div>
    </div>
  );
}
