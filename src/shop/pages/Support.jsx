/**
 * /account/support — buyer support chat: paginated conversations, a thread with older-message
 * paging and realtime updates (socket rooms work for buyers), and a new conversation that can be
 * linked to an order (?new=1&order=<id> preselects it). ?c=<id> opens a conversation.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, CreditCard, HelpCircle, LifeBuoy, MessageCircle, MessagesSquare, Package, PackageSearch, Plus, RotateCcw, Send, Truck } from "lucide-react";
import { Button, EmptyState, Field, Input, Notice, RowSkeleton, Select, ShopPageHeader, ShopSheet, Skeleton, Textarea, toast } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { api } from "../../shared/api/index.js";
import { useMyOrders, useViewer } from "../hooks/index.js";
import { formatDate, formatDateTime, relativeTime } from "../../shared/lib/format.js";
import { emitWithAck, getSocket, useSocketConnection, useSocketEvent } from "../../shared/realtime/socket.js";
import { Pill, sellerName } from "../components/buying/orderUi.jsx";
import { displayName, initialsOf } from "../lib/text.js";

const K = ["shop", "support"];
const idOf = (v) => String(v?._id || v?.id || v || "");
const TOPICS = [
  { value: "order_support", label: "An order", icon: Package },
  { value: "delivery", label: "Delivery", icon: Truck },
  { value: "payment", label: "Payment or invoice", icon: CreditCard },
  { value: "returns", label: "Return or refund", icon: RotateCcw },
  { value: "product_inquiry", label: "A product", icon: PackageSearch },
  { value: "general_support", label: "Something else", icon: HelpCircle },
];
const sellerLabel = (c) => (c?.tenantId?.name ? displayName(c.tenantId.name) : "MS₹ support");
const dayKey = (d) => (d ? new Date(d).toDateString() : "");
const STATUS = {
  unassigned: ["Waiting for reply", "warning"],
  open: ["Open", "info"],
  assigned: ["With an agent", "info"],
  waiting_customer: ["Your reply needed", "business"],
  resolved: ["Resolved", "success"],
  closed: ["Closed", "neutral"],
};

function NewConversation({ open, onOpenChange, initialOrder, onCreated }) {
  const orders = useMyOrders({ limit: 20 });
  const [form, setForm] = useState({ type: initialOrder ? "order_support" : "general_support", orderId: initialOrder || "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const create = useMutation({ mutationFn: (body) => api.createChat(body) });
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const rows = orders.data?.data || [];
  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (!form.message.trim()) v.message = "Tell us what you need help with";
    if (form.type === "order_support" && !form.orderId) v.orderId = "Choose the order";
    setErrors(v);
    if (Object.keys(v).length) return;
    try {
      const order = rows.find((o) => idOf(o) === form.orderId);
      const convo = await create.mutateAsync({
        type: form.type,
        ...(form.orderId ? { orderId: form.orderId } : {}),
        subject: (form.subject.trim() || (order ? `Order ${order.orderNumber}` : TOPICS.find((t) => t.value === form.type)?.label || "Support")).slice(0, 200),
        message: form.message.trim().slice(0, 4000),
      });
      onCreated(convo);
    } catch (err) {
      const f = err?.fields || {};
      setErrors({ orderId: f.orderId, subject: f.subject, message: f.message, _: Object.keys(f).length ? undefined : err?.message });
    }
  }
  return (
    <ShopSheet
      open={open}
      onOpenChange={(v) => !create.isPending && onOpenChange(v)}
      title="New conversation"
      description="Order questions go straight to that seller’s team. We’ll notify you when someone replies."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-chat" loading={create.isPending} leftIcon={Send}>
            Send
          </Button>
        </div>
      }
    >
      <form id="new-chat" onSubmit={submit} noValidate className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-shop-sm font-semibold text-shop-ink">What is it about?</legend>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-shop-line bg-shop-card px-3 py-2 text-shop-sm font-semibold text-shop-ink transition-colors hover:border-shop-line-strong has-checked:border-shop-primary has-checked:bg-shop-primary-soft has-checked:text-shop-primary-ink has-focus-visible:ring-2 has-focus-visible:ring-shop-primary"
              >
                <input type="radio" name="type" value={value} checked={form.type === value} onChange={set("type")} className="sr-only" />
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 leading-tight">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Order" optional={form.type !== "order_support"} required={form.type === "order_support"} error={errors.orderId} hint="Linking the order helps the seller answer faster">
          <Select name="orderId" value={form.orderId} onChange={set("orderId")} disabled={orders.isPending}>
            <option value="">{orders.isPending ? "Loading orders…" : "No order"}</option>
            {rows.map((o) => (
              <option key={idOf(o)} value={idOf(o)}>
                {o.orderNumber} · {sellerName(o)} · {formatDate(o.createdAt)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject" optional error={errors.subject}>
          <Input name="subject" maxLength={200} value={form.subject} onChange={set("subject")} />
        </Field>
        <Field label="Message" required error={errors.message}>
          <Textarea name="message" rows={5} maxLength={4000} value={form.message} onChange={set("message")} placeholder="Describe the issue. Include pack sizes, quantities or invoice numbers if relevant." />
        </Field>
        {errors._ ? <Notice tone="danger">{errors._}</Notice> : null}
      </form>
    </ShopSheet>
  );
}

function Thread({ id, onBack, onNew }) {
  const { user } = useViewer();
  const qc = useQueryClient();
  const me = String(user?.id || "");
  const convo = useQuery({ queryKey: [...K, "chat", id], queryFn: () => api.getChat(id) });
  const msgKey = [...K, "chat", id, "messages"];
  const messages = useInfiniteQuery({
    queryKey: msgKey,
    queryFn: ({ pageParam }) => api.listChatMessagesPage(id, { limit: 30, ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.hasMore ? last.nextBefore : undefined),
  });
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let alive = true;
    emitWithAck("chat:join", id)
      .then((ack) => alive && setLive(Boolean(ack?.ok)))
      .catch(() => alive && setLive(false));
    api.markChatRead(id).then(() => qc.invalidateQueries({ queryKey: [...K, "list"] })).catch(() => {});
    return () => {
      alive = false;
      try {
        getSocket().emit("chat:leave", id);
      } catch {
        /* offline */
      }
    };
  }, [id, qc]);

  const append = (msg) =>
    qc.setQueryData(msgKey, (old) => {
      if (!old?.pages?.length) return old;
      if (old.pages.some((p) => (p.data || []).some((m) => idOf(m) === idOf(msg)))) return old;
      const [first, ...rest] = old.pages;
      return { ...old, pages: [{ ...first, data: [...(first.data || []), msg] }, ...rest] };
    });

  useSocketEvent("chat:message", (msg) => {
    if (idOf(msg?.conversationId) !== id || msg?.internal) return;
    append(msg);
    qc.invalidateQueries({ queryKey: [...K, "list"] });
    if (idOf(msg.senderId) !== me) api.markChatRead(id).catch(() => {});
  });

  // Without realtime, poll gently.
  useEffect(() => {
    if (live) return undefined;
    const t = setInterval(() => qc.invalidateQueries({ queryKey: msgKey }), 20_000);
    return () => clearInterval(t);
  }, [live, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(() => [...(messages.data?.pages || [])].reverse().flatMap((p) => p.data || []).filter((m) => !m.internal), [messages.data]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [ordered.length]);

  const send = useMutation({
    mutationFn: (body) => api.postChatMessage(id, { body }),
    onSuccess: (msg) => {
      if (msg?._id) append(msg);
      setDraft("");
      qc.invalidateQueries({ queryKey: [...K, "list"] });
    },
    onError: (err) => toast.error(err?.message || "Message not sent"),
  });

  const c = convo.data;
  const closed = c && ["closed"].includes(c.status);
  const [label, tone] = STATUS[c?.status] || [c?.status, "neutral"];

  if (convo.error) {
    return (
      <section aria-label="Conversation" className="grid min-h-60 place-items-center rounded-[1.25rem] border border-shop-line bg-shop-card p-6 text-center">
        <div className="grid justify-items-center gap-3">
          <p className="font-semibold text-shop-ink">{convo.error.status === 404 ? "This conversation isn’t available" : "Couldn’t load this conversation"}</p>
          <p className="max-w-sm text-shop-sm text-shop-muted">{convo.error.status === 404 ? "It may belong to another account. Pick one from your list or start a new one." : convo.error.message}</p>
          <Button variant="secondary" leftIcon={ArrowLeft} onClick={onBack}>
            Back to conversations
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Conversation" className="flex h-[min(78dvh,720px)] min-h-[28rem] flex-col overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <header className="flex items-center gap-2 border-b border-shop-line px-2 py-2 sm:px-4 sm:py-3">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Back to conversations" onClick={onBack}>
          <ArrowLeft className="size-5" aria-hidden />
        </Button>
        <span aria-hidden className="hidden size-10 shrink-0 place-items-center rounded-full bg-shop-navy text-shop-sm font-bold text-white sm:grid">
          {c?.tenantId?.name ? initialsOf(c.tenantId.name) : <LifeBuoy className="size-5" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          {convo.isPending ? <Skeleton className="h-5 w-40" /> : <h2 className="truncate font-display text-shop-md font-bold text-shop-ink">{c?.subject || "Support"}</h2>}
          <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-shop-xs text-shop-muted">
            <span className="truncate">{sellerLabel(c)}</span>
            {live ? (
              <span className="inline-flex items-center gap-1 text-shop-primary-ink">
                <span aria-hidden className="size-1.5 rounded-full bg-shop-primary" /> Live
              </span>
            ) : null}
            {c?.orderId ? (
              <>
                <span aria-hidden>·</span>
                <Link className="inline-flex items-center font-semibold text-shop-primary-ink hover:underline pointer-coarse:min-h-11" to={`/account/orders/${idOf(c.orderId)}`}>
                  View order
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {c ? <Pill tone={tone}>{label}</Pill> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-shop-page/60 px-3 py-4 sm:px-5" aria-live="polite" aria-relevant="additions">
        {messages.hasNextPage ? (
          <div className="mb-4 text-center">
            <Button size="sm" variant="secondary" className="rounded-full" loading={messages.isFetchingNextPage} onClick={() => messages.fetchNextPage()}>
              Earlier messages
            </Button>
          </div>
        ) : null}
        {messages.isPending ? (
          <RowSkeleton />
        ) : messages.error ? (
          <Notice
            tone="danger"
            action={
              <Button size="sm" variant="secondary" onClick={() => messages.refetch()}>
                Retry
              </Button>
            }
          >
            {messages.error.message || "Couldn’t load messages"}
          </Notice>
        ) : ordered.length ? (
          <ol className="grid gap-1.5">
            {ordered.map((m, i) => {
              const mine = idOf(m.senderId) === me;
              const prev = ordered[i - 1];
              const newDay = dayKey(m.createdAt) !== dayKey(prev?.createdAt);
              const sameSender = !newDay && prev && idOf(prev.senderId) === idOf(m.senderId);
              const name = m.senderId?.name ? displayName(m.senderId.name) : "Support";
              return (
                <li key={idOf(m)} className="grid gap-1.5">
                  {newDay && m.createdAt ? (
                    <p className="my-2 flex items-center gap-3 text-shop-xs font-semibold text-shop-muted before:h-px before:flex-1 before:bg-shop-line after:h-px after:flex-1 after:bg-shop-line">
                      {formatDate(m.createdAt)}
                    </p>
                  ) : null}
                  <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", !sameSender && i > 0 && "mt-2")}>
                    {!mine ? (
                      <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-shop-well text-[0.6875rem] font-bold text-shop-text", sameSender && "invisible")}>
                        {initialsOf(name)}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[82%] px-3.5 py-2 text-shop-sm sm:max-w-[70%]",
                        mine ? "rounded-2xl rounded-br-md bg-shop-primary text-white" : "rounded-2xl rounded-bl-md border border-shop-line bg-shop-card text-shop-ink"
                      )}
                    >
                      {!mine && !sameSender ? <p className="mb-0.5 text-shop-xs font-semibold text-shop-primary-ink">{name}</p> : null}
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                      <p className={cn("mt-0.5 text-right text-[0.6875rem]", mine ? "text-white/80" : "text-shop-muted")} title={formatDateTime(m.createdAt)}>
                        {relativeTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="py-10 text-center text-shop-sm text-shop-muted">No messages yet.</p>
        )}
        <div ref={endRef} />
      </div>
      {closed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-shop-line px-4 py-3">
          <p className="text-shop-sm text-shop-muted">This conversation is closed. Start a new one if you need more help.</p>
          {onNew ? (
            <Button size="sm" variant="secondary" leftIcon={Plus} onClick={onNew}>
              New conversation
            </Button>
          ) : null}
        </div>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-shop-line bg-shop-card p-2.5 sm:p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && !send.isPending) send.mutate(draft.trim());
          }}
        >
          <label htmlFor="chat-draft" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-draft"
            rows={1}
            maxLength={4000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message"
            aria-describedby="chat-draft-hint"
            className="max-h-32 min-h-11 resize-none rounded-[1.375rem] bg-shop-page/60 px-4 py-2.5"
          />
          <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Send message" loading={send.isPending} disabled={!draft.trim()}>
            {!send.isPending ? <Send className="size-5" aria-hidden /> : null}
          </Button>
          <span id="chat-draft-hint" className="sr-only">
            Enter sends, Shift+Enter adds a new line.
          </span>
        </form>
      )}
    </section>
  );
}

export default function Support() {
  const [params, setParams] = useSearchParams();
  const active = params.get("c") || "";
  const wantsNew = params.get("new") === "1";
  const initialOrder = params.get("order") || "";
  const qc = useQueryClient();
  useSocketConnection(true);

  const list = useInfiniteQuery({
    queryKey: [...K, "list"],
    queryFn: ({ pageParam }) => api.listChats({ page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last?.meta && last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const rows = (list.data?.pages || []).flatMap((p) => p.data || []);

  useSocketEvent("chat:message", () => qc.invalidateQueries({ queryKey: [...K, "list"] }));

  const open = (id) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("c", id);
      n.delete("new");
      n.delete("order");
      return n;
    });
  const setNew = (on) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (on) n.set("new", "1");
      else {
        n.delete("new");
        n.delete("order");
      }
      return n;
    });

  const unreadTotal = rows.reduce((n, c) => n + (Number(c.unreadBuyer) || 0), 0);

  return (
    <div className="grid gap-4">
      <ShopPageHeader
        title="Support"
        description="Talk to your sellers and the MS₹ team about orders, delivery, payments and returns."
        actions={
          <Button leftIcon={Plus} onClick={() => setNew(true)}>
            New conversation
          </Button>
        }
      />
      {list.error ? (
        <Notice
          tone="danger"
          action={
            <Button size="sm" variant="secondary" onClick={() => list.refetch()}>
              Retry
            </Button>
          }
        >
          {list.error.message || "Couldn’t load your conversations"}
        </Notice>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn("grid content-start gap-3", active && "hidden lg:grid")}>
          {list.isPending ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : rows.length ? (
            <div className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card">
              <div className="flex items-center justify-between gap-2 border-b border-shop-line px-4 py-3">
                <h2 className="flex items-center gap-2 text-shop-sm font-semibold text-shop-ink">
                  <MessagesSquare className="size-4 text-shop-primary-ink" strokeWidth={1.75} aria-hidden />
                  Your conversations
                </h2>
                {unreadTotal > 0 ? <span className="rounded-full bg-shop-saffron-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-saffron-ink">{unreadTotal} unread</span> : null}
              </div>
              <ul className="divide-y divide-shop-line" aria-label="Conversations">
                {rows.map((c) => {
                  const [label, tone] = STATUS[c.status] || [c.status, "neutral"];
                  const on = idOf(c) === active;
                  const unread = Number(c.unreadBuyer) > 0;
                  return (
                    <li key={idOf(c)}>
                      <button
                        type="button"
                        onClick={() => open(idOf(c))}
                        aria-current={on ? "true" : undefined}
                        className={cn(
                          "relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                          on ? "bg-shop-primary-soft/60 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-shop-primary" : "hover:bg-shop-hover"
                        )}
                      >
                        <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full text-shop-sm font-bold", c.tenantId?.name ? "bg-shop-navy text-white" : "bg-shop-primary-soft text-shop-primary-ink")}>
                          {c.tenantId?.name ? initialsOf(c.tenantId.name) : <LifeBuoy className="size-5" strokeWidth={1.75} />}
                        </span>
                        <span className="grid min-w-0 flex-1 gap-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={cn("line-clamp-1 text-shop-ink", unread ? "font-bold" : "font-semibold")}>{c.subject || "Support"}</span>
                            <span className="shrink-0 text-shop-xs text-shop-muted">{relativeTime(c.lastMessageAt)}</span>
                          </span>
                          <span className="truncate text-shop-xs text-shop-muted">{sellerLabel(c)}</span>
                          <span className="flex items-center justify-between gap-2">
                            <Pill tone={tone}>{label}</Pill>
                            {unread ? (
                              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-shop-deal px-1.5 text-shop-xs font-bold text-white">
                                {c.unreadBuyer}
                                <span className="sr-only"> unread</span>
                              </span>
                            ) : (
                              <ChevronRight className="size-4 text-shop-subtle lg:hidden" aria-hidden />
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {list.hasNextPage ? (
                <div className="border-t border-shop-line bg-shop-page/60 p-3">
                  <Button variant="secondary" block loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
                    Load more
                  </Button>
                </div>
              ) : null}
            </div>
          ) : !list.error ? (
            <EmptyState
              compact
              icon={MessageCircle}
              title="No conversations yet"
              description="Questions about an order, delivery or an invoice? Start a conversation and the right team will reply here."
              action={
                <>
                  <Button leftIcon={Plus} onClick={() => setNew(true)}>
                    Start a conversation
                  </Button>
                  <Button to="/account/help" variant="secondary">
                    Browse help
                  </Button>
                </>
              }
            />
          ) : null}
          {rows.length ? (
            <Link to="/account/help" className="inline-flex min-h-11 items-center gap-1.5 px-1 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
              <HelpCircle className="size-4" aria-hidden /> Quick answers in the help centre
            </Link>
          ) : null}
        </div>
        <div className={cn("min-w-0", !active && "hidden lg:block")}>
          {active ? (
            <Thread key={active} id={active} onBack={() => setParams({})} onNew={() => setNew(true)} />
          ) : (
            <div className="grid h-full min-h-72 place-items-center rounded-[1.25rem] border border-dashed border-shop-line-strong bg-shop-card p-6 text-center">
              <div className="grid justify-items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
                  <MessagesSquare className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="font-semibold text-shop-ink">{rows.length ? "Choose a conversation" : "Your messages will appear here"}</p>
                <p className="max-w-xs text-shop-sm text-shop-muted">{rows.length ? "Pick one from the list to read and reply, or start a new one." : "Start a conversation and replies from sellers and our team show up here."}</p>
                <Button size="sm" variant="secondary" leftIcon={Plus} onClick={() => setNew(true)}>
                  New conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {wantsNew ? (
        <NewConversation
          open
          initialOrder={initialOrder}
          onOpenChange={(v) => !v && setNew(false)}
          onCreated={(c) => {
            qc.invalidateQueries({ queryKey: [...K, "list"] });
            toast.success("Message sent", { description: "We’ll notify you when someone replies." });
            open(idOf(c));
          }}
        />
      ) : null}
    </div>
  );
}
