import { useEffect } from "react";

const SUFFIX = "MS₹";

/** Sets document.title to "<title> · <suffix>". Pass a falsy title to skip. */
export function useDocumentTitle(title, suffix = SUFFIX) {
  useEffect(() => {
    if (!title) return;
    // No restore on unmount: the panel shell resets the section title on every navigation, and
    // restoring could resurrect a stale title when pages swap inside Suspense.
    document.title = suffix ? `${title} · ${suffix}` : title;
  }, [title, suffix]);
}

export default useDocumentTitle;
