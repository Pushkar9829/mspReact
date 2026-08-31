import { useCallback, useEffect, useRef, useState } from "react";

const DELAY = 240;

function preloadImages(rows) {
  rows.forEach((p) => {
    if (!p.image) return;
    const img = new Image();
    img.src = p.image;
  });
}

export function useInfiniteFeed(items, pageSize = 8) {
  const [count, setCount] = useState(() => Math.min(pageSize, items.length));
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);
  const itemsRef = useRef(items);
  const countRef = useRef(count);
  const bufferRef = useRef(null);
  const inflightRef = useRef(false);

  itemsRef.current = items;
  countRef.current = count;

  useEffect(() => {
    setCount(Math.min(pageSize, items.length));
    bufferRef.current = null;
    inflightRef.current = false;
    setLoading(false);
  }, [items, pageSize]);

  const prefetch = useCallback(() => {
    const start = countRef.current;
    const all = itemsRef.current;
    if (start >= all.length) return;
    if (bufferRef.current?.start === start) return;
    const rows = all.slice(start, start + pageSize);
    bufferRef.current = { start, rows };
    preloadImages(rows);
  }, [pageSize]);

  const append = useCallback(async () => {
    if (inflightRef.current) return;
    const start = countRef.current;
    const all = itemsRef.current;
    if (start >= all.length) return;

    inflightRef.current = true;
    const buffered = bufferRef.current?.start === start ? bufferRef.current.rows : null;

    if (!buffered) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, DELAY));
    } else {
      await new Promise((r) => setTimeout(r, 40));
    }

    const rows = buffered || all.slice(start, start + pageSize);
    bufferRef.current = null;
    setCount((c) => Math.min(c + rows.length, all.length));
    setLoading(false);
    inflightRef.current = false;
  }, [pageSize]);

  useEffect(() => {
    prefetch();
  }, [count, items, prefetch]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) append();
      },
      { root: null, rootMargin: "640px 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [append, count, items]);

  return {
    visible: items.slice(0, count),
    hasMore: count < items.length,
    loading,
    sentinelRef,
  };
}
