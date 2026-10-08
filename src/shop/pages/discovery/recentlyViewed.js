/**
 * Recently viewed products on this device. Only slugs are stored: cards re-read the live product
 * (price, stock) from the server, so nothing stale is ever shown.
 */
import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "../../lib/storage.js";

const KEY = "msr-recently-viewed";
const MAX = 12;
const subs = new Set();
let cache = null;

function read() {
  if (!cache) {
    const raw = readJson(KEY, []);
    cache = Array.isArray(raw) ? raw.filter((s) => typeof s === "string" && s) : [];
  }
  return cache;
}

export function pushRecentlyViewed(slug) {
  if (!slug) return;
  const next = [slug, ...read().filter((s) => s !== slug)].slice(0, MAX);
  cache = next;
  writeJson(KEY, next);
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Slugs, newest first. */
export function useRecentlyViewed() {
  return useSyncExternalStore(subscribe, read, () => []);
}
