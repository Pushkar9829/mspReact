/**
 * Socket.IO client (one connection per tab, shared by every hook).
 *
 * - Auth: `auth.token` is read from memory on every (re)connect, so a refreshed access token is
 *   picked up automatically; a token change forces a reconnect. No token → disconnected.
 * - Connection errors "unauthorized" trigger one token refresh, then reconnect.
 * - `emitWithAck(event, payload, { timeout })` → Promise of the server ack.
 * - `useSocketEvent(event, handler, { invalidate: [queryKey, …] })` subscribes while mounted.
 *
 * Server events: "notification" (new notification), "chat:message", "chat:typing", "chat:read".
 * Client events: "chat:join" (ack { ok }), "chat:leave", "chat:typing", "presence:ping".
 */
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "../config.js";
import { getAccessToken, onTokenChange, refreshAccessToken } from "../api/session.js";

let socket = null;
let lastToken = null;
let refreshing = false;
const statusListeners = new Set();

function notifyStatus() {
  const s = getSocketStatus();
  statusListeners.forEach((fn) => fn(s));
}

export function getSocketStatus() {
  if (!socket) return "idle";
  if (socket.connected) return "connected";
  return socket.active ? "connecting" : "disconnected";
}

function create() {
  socket = io(API_BASE || undefined, {
    path: "/socket.io",
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    auth: (cb) => cb({ token: getAccessToken() || "" }),
  });
  socket.on("connect", notifyStatus);
  socket.on("disconnect", notifyStatus);
  socket.on("connect_error", async (err) => {
    notifyStatus();
    if (String(err?.message) === "unauthorized" && !refreshing && getAccessToken()) {
      refreshing = true;
      try {
        await refreshAccessToken();
        socket?.connect();
      } catch {
        socket?.disconnect();
      } finally {
        refreshing = false;
      }
    }
  });
  return socket;
}

/** The shared socket (created lazily). Connected only while an access token exists. */
export function getSocket() {
  return socket || create();
}

export function connectSocket() {
  const s = getSocket();
  lastToken = getAccessToken();
  if (lastToken && !s.connected && !s.active) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  notifyStatus();
}

onTokenChange((token) => {
  if (!socket) return;
  if (!token) {
    disconnectSocket();
    return;
  }
  if (token !== lastToken) {
    lastToken = token;
    // Reconnect so the server re-authenticates with the new token (and new permissions).
    if (socket.connected || socket.active) {
      socket.disconnect();
      socket.connect();
    }
  }
});

/** Emit with acknowledgement. Resolves with the ack payload; rejects on timeout / disconnect. */
export function emitWithAck(event, payload, { timeout = 8000 } = {}) {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    if (!s.connected) {
      reject(new Error("Realtime connection is offline"));
      return;
    }
    s.timeout(timeout).emit(event, payload, (err, ack) => {
      if (err) reject(new Error("Realtime request timed out"));
      else resolve(ack);
    });
  });
}

/** Keep the socket connected while a component (the panel shell) is mounted. */
export function useSocketConnection(enabled = true) {
  const [status, setStatus] = useState(getSocketStatus());
  useEffect(() => {
    statusListeners.add(setStatus);
    if (enabled) connectSocket();
    return () => {
      statusListeners.delete(setStatus);
    };
  }, [enabled]);
  return status;
}

/**
 * Subscribe to a server event while mounted.
 *   useSocketEvent("notification", (n) => toast(n.title), { invalidate: [keys.notifications.all] });
 */
export function useSocketEvent(event, handler, { invalidate = [], enabled = true } = {}) {
  const queryClient = useQueryClient();
  const ref = useRef(handler);
  ref.current = handler;
  const invKey = JSON.stringify(invalidate);
  useEffect(() => {
    if (!enabled) return undefined;
    const s = getSocket();
    const list = JSON.parse(invKey);
    const fn = (payload) => {
      ref.current?.(payload);
      list.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    };
    s.on(event, fn);
    return () => {
      s.off(event, fn);
    };
  }, [event, enabled, invKey, queryClient]);
}
