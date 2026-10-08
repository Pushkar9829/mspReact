import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, ArrowLeft, BookmarkPlus, CheckCircle2, Inbox, Lock, MessageSquare, MessagesSquare, Send, Settings2, ShoppingBag, Trash2, UserCheck, Zap } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useUrlTableState } from "../hooks/useUrlTableState.js";
import { useApiMutation } from "../hooks/useApiMutation.js";
import { useAuth, useCan } from "../context/AuthContext.jsx";
import { emitWithAck, getSocket, useSocketEvent } from "../realtime/socket.js";
import { CHAT_STATUSES, statusOptions } from "../lib/panel.js";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  DateTime,
  Dialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FacetFilter,
  Field,
  IconButton,
  Input,
  Kbd,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  PageHeader,
  Pagination,
  RelativeTime,
  Skeleton,
  StatusPill,
  Textarea,
  Tooltip,
  cn,
  toast,
} from "../ui/index.js";

const QUEUES = [
  { value: "", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
  { value: "waiting", label: "Waiting on buyer" },
  { value: "escalated", label: "Escalated" },
];
const PAGE = 30;
const idOf = (v) => (v && typeof v === "object" ? v._id || v.id : v) || "";

/* ------------------------------------------------------------------ drafts (per viewer, per conversation) */

function readDraft(id) {
  try {
    return localStorage.getItem(`msr-chat-draft:${id}`) || "";
  } catch {
    return "";
  }
}
function writeDraft(id, text) {
  try {
    if (text) localStorage.setItem(`msr-chat-draft:${id}`, text);
    else localStorage.removeItem(`msr-chat-draft:${id}`);
  } catch {
    /* storage blocked */
  }
}

/* ------------------------------------------------------------------ list */

function ConversationList({ rows, activeId, onSelect, showTenants, loading, error, onRetry, meta, page, onPage, me }) {
  if (loading) {
    return (
      <ul className="divide-y divide-border">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="grid gap-2 p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </li>
        ))}
      </ul>
    );
  }
  if (error) return <ErrorState error={error} onRetry={onRetry} compact />;
  if (!rows.length) return <EmptyState icon={Inbox} title="No conversations" description="Nothing in this queue. Try another queue or clear the search." compact />;
  return (
    <>
      <ul className="divide-y divide-border" aria-label="Conversations">
        {rows.map((c) => {
          const active = String(c._id) === String(activeId);
          const unread = Number(c.unreadAgent) || 0;
          const mine = idOf(c.assigneeId) && String(idOf(c.assigneeId)) === String(me);
          return (
            <li key={c._id}>
              <button
                type="button"
                onClick={() => onSelect(c._id)}
                aria-current={active ? "true" : undefined}
                className={cn("grid w-full gap-1 px-3 py-2.5 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", active && "bg-primary-soft/60")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-ui-sm text-fg", unread ? "font-semibold" : "font-medium")}>{c.buyerId?.name || c.buyerId?.email || "Buyer"}</span>
                  <span className="shrink-0 text-ui-2xs text-fg-subtle">
                    <RelativeTime value={c.lastMessageAt} />
                  </span>
                </span>
                <span className="truncate text-ui-xs text-fg-muted">{c.subject || "No subject"}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <StatusPill status={c.status} />
                  {c.escalated ? <Badge tone="danger">Escalated</Badge> : null}
                  {unread ? <Badge tone="primary">{unread} new</Badge> : null}
                  {showTenants && c.tenantId?.name ? <Badge tone="outline">{c.tenantId.name}</Badge> : null}
                  {c.assigneeId ? <span className="truncate text-ui-2xs text-fg-subtle">→ {mine ? "you" : c.assigneeId.name || "assigned"}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {meta && (meta.pages || 1) > 1 ? <Pagination meta={meta} page={page} onPageChange={onPage} compact className="border-t border-border p-2" /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ messages */

function MessageBubble({ m, buyerId, me }) {
  const sender = m.senderId || {};
  const fromBuyer = String(idOf(sender)) === String(buyerId);
  const own = String(idOf(sender)) === String(me);
  return (
    <li className={cn("flex", fromBuyer ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-ui-sm shadow-xs sm:max-w-[75%]",
          m.internal ? "border border-dashed border-warning/50 bg-warning-soft text-warning-fg" : fromBuyer ? "border border-border bg-surface text-fg" : "bg-primary-soft text-primary-soft-fg"
        )}
      >
        <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-ui-2xs opacity-80">
          {m.internal ? (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <Lock aria-hidden className="size-3" /> Internal note
            </span>
          ) : null}
          <span className="font-medium">{own ? "You" : sender.name || (fromBuyer ? "Buyer" : "Staff")}</span>
          <DateTime value={m.createdAt} />
        </p>
        {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
        {m.attachments?.length ? (
          <ul className="mt-1 grid gap-0.5">
            {m.attachments.map((a) => (
              <li key={a}>
                <a href={a} target="_blank" rel="noreferrer" className="break-all underline">
                  {a.split("/").pop()}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function useTeammates(enabled, apiClient, scope) {
  return useQuery({
    queryKey: keys.users.list({ staff: "true", limit: 100, purpose: "chat-assign", scope }),
    queryFn: () => apiClient.listUsers({ staff: "true", limit: 100, status: "active" }),
    enabled,
    staleTime: 300_000,
    select: (res) => (res?.data || []).filter((u) => (u.role?.permissions || []).some((p) => p === "chat.reply" || p === "chat.assign" || p === "*")),
  });
}

function MacrosDialog({ open, onOpenChange, macros, apiClient }) {
  const can = useCan();
  const [toDelete, setToDelete] = useState(null);
  const remove = useApiMutation((id) => apiClient.deleteChatMacro(id), { invalidate: [keys.macros], success: "Macro deleted", error: false });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Saved replies" description="Macros are shared with your whole team." footer={<Button onClick={() => onOpenChange(false)}>Close</Button>}>
      {macros.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {macros.map((m) => (
            <li key={m._id} className="flex items-start gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-ui-sm font-medium text-fg">{m.title}</p>
                <p className="line-clamp-2 whitespace-pre-line text-ui-xs text-fg-muted">{m.body}</p>
              </div>
              {can("chat.assign") ? <IconButton icon={Trash2} size="xs" label={`Delete macro ${m.title}`} className="text-danger-fg" onClick={() => setToDelete(m)} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Zap} title="No saved replies yet" description="Write a reply and choose “Save as macro” to reuse it." compact />
      )}
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.title}”?`}
        description="The saved reply is removed for everyone on your team."
        confirmLabel="Delete macro"
        tone="danger"
        onConfirm={() => remove.mutateAsync(toDelete._id)}
      />
    </Dialog>
  );
}

function SaveMacroDialog({ open, onOpenChange, body, apiClient }) {
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (open) setTitle("");
  }, [open]);
  const save = useApiMutation((b) => apiClient.saveChatMacro(b), { invalidate: [keys.macros], success: "Saved reply created", error: false, onSuccess: () => onOpenChange(false) });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      busy={save.isPending}
      title="Save as macro"
      description="Reuse this text in any conversation."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="save-macro" loading={save.isPending} disabled={!title.trim()}>
            Save macro
          </Button>
        </>
      }
    >
      <form
        id="save-macro"
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) save.mutate({ title: title.trim(), body: body.trim() });
        }}
      >
        <Field label="Title" required error={save.error?.fieldError?.("title") || (save.error && !Object.keys(save.error.fields || {}).length ? save.error.message : undefined)}>
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <p className="line-clamp-4 whitespace-pre-line rounded-md bg-surface-2 p-2 text-ui-xs text-fg-muted">{body}</p>
      </form>
    </Dialog>
  );
}

function Conversation({ id, apiClient: listApiClient, me, orderHref, showTenants, onBack, scope: listScope }) {
  const can = useCan();
  const queryClient = useQueryClient();
  const convo = useQuery({ queryKey: keys.chats.detail(id), queryFn: () => listApiClient.getChat(id) });
  // Cross-store view ("all stores"): macros, teammates and actions must run in the conversation's own store.
  const convoTenant = showTenants ? String(idOf(convo.data?.tenantId) || "") : "";
  const apiClient = useMemo(() => (convoTenant ? defaultApi.withTenant(convoTenant) : listApiClient), [convoTenant, listApiClient]);
  const scope = convoTenant ? `${listScope}:${convoTenant}` : listScope;
  const scopeReady = !showTenants || Boolean(convoTenant);
  const msgKey = keys.chats.sub(id, "messages");
  const messages = useInfiniteQuery({
    queryKey: msgKey,
    queryFn: ({ pageParam }) => apiClient.listChatMessagesPage(id, { limit: PAGE, ...(pageParam ? { before: pageParam } : {}) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.hasMore ? last.nextBefore : undefined),
  });
  const macros = useQuery({ queryKey: [...keys.macros, scope], queryFn: () => apiClient.listChatMacros(), staleTime: 120_000, enabled: scopeReady });
  const teammates = useTeammates(can("chat.assign") && scopeReady, apiClient, scope);
  const [draft, setDraft] = useState(() => readDraft(id));
  const [internal, setInternal] = useState(false);
  const [confirm, setConfirm] = useState(null); // "close" | "escalate"
  const [macroDialog, setMacroDialog] = useState(null); // "manage" | "save"
  const [typing, setTyping] = useState(null); // userId of whoever is typing
  const [joined, setJoined] = useState(false);
  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingEmit = useRef(0);

  useEffect(() => writeDraft(id, draft), [id, draft]);

  // Realtime: join the conversation room (acknowledged), leave on unmount.
  useEffect(() => {
    let alive = true;
    setJoined(false);
    emitWithAck("chat:join", id)
      .then((ack) => alive && setJoined(Boolean(ack?.ok)))
      .catch(() => alive && setJoined(false));
    return () => {
      alive = false;
      try {
        getSocket().emit("chat:leave", id);
      } catch {
        /* offline */
      }
    };
  }, [id]);

  const appendMessage = useCallback(
    (msg) => {
      queryClient.setQueryData(msgKey, (old) => {
        if (!old?.pages?.length) return old;
        if (old.pages.some((p) => (p.data || []).some((m) => String(m._id) === String(msg._id)))) return old;
        const [first, ...rest] = old.pages;
        return { ...old, pages: [{ ...first, data: [...(first.data || []), msg] }, ...rest] };
      });
    },
    [queryClient, msgKey]
  );

  useSocketEvent("chat:message", (msg) => {
    if (String(idOf(msg?.conversationId)) !== String(id)) return;
    appendMessage(msg);
    setTyping(null);
    queryClient.invalidateQueries({ queryKey: keys.chats.lists() });
    if (String(idOf(msg.senderId)) !== String(me)) apiClient.markChatRead(id).catch(() => {});
  });
  useSocketEvent("chat:typing", (p) => {
    if (String(p?.conversationId) !== String(id) || String(p?.userId) === String(me)) return;
    setTyping(p.typing ? String(p.userId || "") : null);
    clearTimeout(typingTimer.current);
    if (p.typing) typingTimer.current = setTimeout(() => setTyping(null), 6000);
  });

  // Mark read when opened.
  const c = convo.data;
  useEffect(() => {
    if (c && Number(c.unreadAgent) > 0) {
      apiClient
        .markChatRead(id)
        .then(() => queryClient.invalidateQueries({ queryKey: keys.chats.lists() }))
        .catch(() => {});
    }
  }, [c, id, apiClient, queryClient]);

  const ordered = useMemo(() => {
    const pages = messages.data?.pages || [];
    return [...pages].reverse().flatMap((p) => p.data || []);
  }, [messages.data]);
  const lastId = ordered[ordered.length - 1]?._id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  const send = useApiMutation((body) => apiClient.postChatMessage(id, body), {
    error: false,
    invalidate: [keys.chats.lists(), keys.chats.detail(id)],
    onSuccess: (msg) => {
      appendMessage(msg);
      setDraft("");
      writeDraft(id, "");
    },
  });
  const assign = useApiMutation((assigneeId) => apiClient.assignChat(id, assigneeId || null), {
    invalidate: [keys.chats.all],
    success: (_d, v) => (v ? "Conversation assigned" : "Assigned to you"),
  });
  const close = useApiMutation(() => apiClient.closeChat(id), { invalidate: [keys.chats.all], success: "Conversation closed", error: false });
  const escalate = useApiMutation(() => apiClient.escalateChat(id), { invalidate: [keys.chats.all], success: "Conversation escalated", error: false });

  function onType(text) {
    setDraft(text);
    const now = Date.now();
    if (!internal && now - lastTypingEmit.current > 2500) {
      lastTypingEmit.current = now;
      try {
        getSocket().emit("chat:typing", { conversationId: id, typing: true });
      } catch {
        /* offline */
      }
    }
  }

  function submit(e) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || send.isPending || body.length > 4000) return;
    send.mutate({ body, internal });
  }

  if (convo.isPending) {
    return (
      <div className="grid gap-3 p-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (convo.error) return <ErrorState error={convo.error} onRetry={convo.refetch} />;

  const closed = c.status === "closed";
  const assignedToMe = String(idOf(c.assigneeId)) === String(me);
  const canReply = can("chat.reply") && !closed;
  const macroRows = Array.isArray(macros.data) ? macros.data : macros.data?.data || [];
  let typingLabel = null;
  if (typing != null) {
    if (typing && typing === String(idOf(c.buyerId))) typingLabel = `${c.buyerId?.name || "Buyer"} is typing…`;
    else {
      const agent = (teammates.data || []).find((u) => String(u.id || u._id) === typing);
      typingLabel = `${agent?.name || "Another agent"} is typing…`;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {onBack ? <IconButton icon={ArrowLeft} size="sm" label="Back to conversations" className="md:hidden" onClick={onBack} /> : null}
          <Avatar name={c.buyerId?.name || c.buyerId?.email} />
          <div className="min-w-0">
            <p className="truncate text-ui font-semibold text-fg">{c.buyerId?.name || "Buyer"}</p>
            <p className="truncate text-ui-xs text-fg-muted">
              {c.buyerId?.email}
              {showTenants && c.tenantId?.name ? ` · ${c.tenantId.name}` : ""}
            </p>
            <p className="truncate text-ui-sm text-fg">{c.subject || "No subject"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusPill status={c.status} />
              {c.escalated ? <Badge tone="danger">Escalated</Badge> : null}
              <Badge tone="outline">{String(c.type || "").replaceAll("_", " ")}</Badge>
              <span className="text-ui-xs text-fg-subtle">{c.assigneeId ? `Assigned to ${assignedToMe ? "you" : c.assigneeId.name}` : "Unassigned"}</span>
              {c.orderId && orderHref ? (
                <Link to={orderHref(idOf(c.orderId))} className="inline-flex items-center gap-1 text-ui-xs text-primary-soft-fg hover:underline">
                  <ShoppingBag aria-hidden className="size-3" /> Order
                </Link>
              ) : null}
              <Tooltip content={joined ? "Live updates on" : "Live updates offline — refresh to see new messages"}>
                <span tabIndex={0} className={cn("size-2 rounded-full", joined ? "bg-success" : "bg-fg-subtle")} aria-label={joined ? "Live" : "Offline"} />
              </Tooltip>
            </div>
          </div>
        </div>
        {!closed ? (
          <div className="flex flex-wrap items-center gap-2">
            {can("chat.assign") && !assignedToMe ? (
              <Button size="sm" leftIcon={UserCheck} loading={assign.isPending && !assign.variables} onClick={() => assign.mutate(null)}>
                Assign to me
              </Button>
            ) : null}
            {can("chat.assign") ? (
              <Combobox
                size="sm"
                className="w-44"
                aria-label="Assign to teammate"
                placeholder="Assign to…"
                value={idOf(c.assigneeId)}
                options={(teammates.data || []).map((u) => ({ value: String(u.id || u._id), label: String(u.id || u._id) === String(me) ? `${u.name} (you)` : u.name, description: u.role?.name }))}
                selectedLabel={c.assigneeId?.name}
                onChange={(v) => v && v !== idOf(c.assigneeId) && assign.mutate(v)}
              />
            ) : null}
            <DropdownMenu trigger={<IconButton icon={Settings2} variant="secondary" size="sm" label="Conversation actions" />}>
              <MenuItem icon={AlertOctagon} disabled={!can("chat.assign") || c.escalated} onSelect={() => setConfirm("escalate")}>
                Escalate
              </MenuItem>
              <MenuItem icon={CheckCircle2} tone="danger" disabled={!can("chat.close")} onSelect={() => setConfirm("close")}>
                Close conversation
              </MenuItem>
            </DropdownMenu>
          </div>
        ) : null}
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-surface-2 px-3 py-4 sm:px-4" aria-live="polite" aria-label="Messages">
        {messages.hasNextPage ? (
          <div className="mb-3 flex justify-center">
            <Button size="xs" variant="secondary" loading={messages.isFetchingNextPage} onClick={() => messages.fetchNextPage()}>
              Load older messages
            </Button>
          </div>
        ) : null}
        {messages.isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </div>
        ) : messages.error ? (
          <ErrorState error={messages.error} onRetry={messages.refetch} compact />
        ) : ordered.length ? (
          <ul className="grid gap-2.5">
            {ordered.map((m) => (
              <MessageBubble key={m._id} m={m} buyerId={idOf(c.buyerId)} me={me} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={MessagesSquare} title="No messages yet" compact />
        )}
        {typingLabel ? <p className="mt-2 text-ui-xs italic text-fg-muted">{typingLabel}</p> : null}
      </div>

      {closed ? (
        <p className="border-t border-border px-4 py-3 text-ui-sm text-fg-muted">This conversation is closed. The buyer can start a new one.</p>
      ) : !can("chat.reply") ? (
        <p className="border-t border-border px-4 py-3 text-ui-sm text-fg-muted">Replying requires chat.reply.</p>
      ) : (
        <form onSubmit={submit} className={cn("grid gap-2 border-t border-border p-3", internal && "bg-warning-soft/40")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="radiogroup" aria-label="Message type" className="inline-flex rounded-md bg-surface-sunken p-0.5">
              {[
                { v: false, label: "Reply", icon: MessageSquare },
                { v: true, label: "Internal note", icon: Lock },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={internal === o.v}
                  onClick={() => setInternal(o.v)}
                  className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-ui-xs font-medium", internal === o.v ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg")}
                >
                  <o.icon aria-hidden className="size-3.5" /> {o.label}
                </button>
              ))}
            </div>
            <DropdownMenu trigger={<Button size="xs" variant="ghost" leftIcon={Zap}>Macros</Button>}>
              {macroRows.length ? <MenuLabel>Insert saved reply</MenuLabel> : <MenuLabel>No saved replies yet</MenuLabel>}
              {macroRows.map((m) => (
                <MenuItem key={m._id} onSelect={() => setDraft((d) => (d ? `${d}\n${m.body}` : m.body))}>
                  {m.title}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem icon={BookmarkPlus} disabled={!draft.trim() || !(can("chat.reply") && can("chat.assign"))} onSelect={() => setMacroDialog("save")}>
                Save current text as macro
              </MenuItem>
              <MenuItem icon={Settings2} onSelect={() => setMacroDialog("manage")}>
                Manage macros
              </MenuItem>
            </DropdownMenu>
          </div>
          <label htmlFor={`reply-${id}`} className="sr-only">
            {internal ? "Internal note (only your team sees it)" : "Reply to buyer"}
          </label>
          <Textarea
            id={`reply-${id}`}
            rows={3}
            maxLength={4000}
            value={draft}
            disabled={!canReply}
            placeholder={internal ? "Internal note — only your team sees this" : "Write a reply…"}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(e);
            }}
          />
          {send.error ? (
            <Alert tone="danger">
              {send.error.message}
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-ui-xs text-fg-subtle">
              <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to send · drafts are kept on this device · {draft.length}/4000
            </span>
            <Button type="submit" size="sm" variant={internal ? "secondary" : "primary"} leftIcon={internal ? Lock : Send} loading={send.isPending} disabled={!draft.trim()}>
              {internal ? "Add note" : "Send reply"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirm === "close"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Close this conversation?"
        description="The buyer can no longer reply here and the conversation leaves the open queues. This can’t be reopened."
        confirmLabel="Close conversation"
        tone="danger"
        onConfirm={() => close.mutateAsync()}
      />
      <ConfirmDialog
        open={confirm === "escalate"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Escalate this conversation?"
        description="It is unassigned and moved to the escalated queue for a senior teammate or the platform team."
        confirmLabel="Escalate"
        onConfirm={() => escalate.mutateAsync()}
      />
      <MacrosDialog open={macroDialog === "manage"} onOpenChange={(o) => !o && setMacroDialog(null)} macros={macroRows} apiClient={apiClient} />
      <SaveMacroDialog open={macroDialog === "save"} onOpenChange={(o) => !o && setMacroDialog(null)} body={draft} apiClient={apiClient} />
    </div>
  );
}

/**
 * Support inbox (both panels): queue filters, search, cursor-paged messages, realtime, macros,
 * internal notes, assign / escalate / close, per-conversation drafts. State lives in the URL
 * (?queue, ?status, ?q, ?page, ?chat).
 *
 *   <SupportInbox orderHref={(id) => `/tenant/orders/${id}`} />
 *   <SupportInbox showTenants title="Support" />                         // super admin (cross-tenant)
 * Props: title, subtitle, breadcrumbs, header (false to omit the PageHeader), showTenants, orderHref(orderId),
 * apiClient, tenantId (scopes requests + cache to one store), tenantFilter (node above the search box), scope.
 */
export default function SupportInbox({ title = "Support", subtitle = "Conversations with buyers. Reply, add internal notes, assign and close.", showTenants = false, apiClient: apiClientProp, orderHref, header = true, breadcrumbs, tenantId, tenantFilter = null, scope: scopeProp = "default" }) {
  const apiClient = useMemo(() => apiClientProp || (tenantId ? defaultApi.withTenant(tenantId) : defaultApi), [apiClientProp, tenantId]);
  const scope = `${scopeProp}:${tenantId || "all"}`;
  const { user } = useAuth();
  const me = user?.id;
  const [params, setParams] = useSearchParams();
  const table = useUrlTableState({ filters: ["queue", "status"], defaults: { limit: 20 } });
  const activeId = params.get("chat") || "";
  const q = useQuery({
    queryKey: keys.chats.list({ ...table.query, scope }),
    queryFn: () => apiClient.listChats(table.query),
    refetchInterval: 30_000,
    ...listQueryOptions,
  });
  useSocketEvent("notification", () => {}, { invalidate: [keys.chats.lists()] });
  const rows = q.data?.data || [];

  function select(id) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("chat", id);
      else next.delete("chat");
      return next;
    });
  }

  return (
    <>
      {header ? <PageHeader title={title} description={subtitle} breadcrumbs={breadcrumbs} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] h-[calc(100dvh-12rem)] min-h-[32rem] overflow-hidden rounded-lg border border-border bg-surface shadow-xs md:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className={cn("flex min-h-0 flex-col border-border md:border-r", activeId && "hidden md:flex")} aria-label="Conversation list">
          <div className="grid gap-2 border-b border-border p-3">
            {tenantFilter}
            <Input size="sm" type="search" aria-label="Search conversations" placeholder="Search subject, buyer name or email" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />
            <div className="flex flex-wrap gap-1" role="group" aria-label="Queue">
              {QUEUES.map((qq) => (
                <button
                  key={qq.value || "all"}
                  type="button"
                  aria-pressed={(table.filters.queue || "") === qq.value}
                  onClick={() => table.setFilter("queue", qq.value)}
                  className={cn("rounded-md px-2 py-1 text-ui-xs font-medium", (table.filters.queue || "") === qq.value ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg")}
                >
                  {qq.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <FacetFilter title="Status" value={table.filters.status} onChange={(v) => table.setFilter("status", v)} options={statusOptions(CHAT_STATUSES)} />
              <span className="text-ui-xs text-fg-subtle">{q.data?.meta?.total != null ? `${q.data.meta.total} total` : ""}</span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList rows={rows} activeId={activeId} onSelect={select} showTenants={showTenants} loading={q.isPending} error={q.error} onRetry={q.refetch} meta={q.data?.meta} page={table.page} onPage={table.setPage} me={me} />
          </div>
        </aside>
        <section className={cn("min-h-0 min-w-0", !activeId && "hidden md:block")} aria-label="Conversation">
          {activeId ? (
            <Conversation key={activeId} id={activeId} apiClient={apiClient} me={me} orderHref={orderHref} showTenants={showTenants} onBack={() => select("")} scope={scope} />
          ) : (
            <EmptyState icon={MessagesSquare} title="Select a conversation" description="Pick a conversation from the list to read and reply." />
          )}
        </section>
      </div>
    </>
  );
}
