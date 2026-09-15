import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Clock3, Search, TrendingUp, X } from "lucide-react";
import { api } from "../../shared/api.js";
import {
  clearRecentSearches,
  normalizeSearchTerm,
  pushRecentSearch,
  readRecentSearches,
  removeRecentSearch,
} from "../lib/recentSearches.js";

const FALLBACK_POPULAR = [
  { term: "atta", display: "Atta" },
  { term: "maggi", display: "Maggi" },
  { term: "oil", display: "Oil" },
  { term: "rice", display: "Rice" },
  { term: "surf excel", display: "Surf Excel" },
  { term: "parle", display: "Parle" },
  { term: "amul", display: "Amul" },
  { term: "tea", display: "Tea" },
];

export default function SearchBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const boxRef = useRef(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(() => readRecentSearches());
  const [popular, setPopular] = useState(FALLBACK_POPULAR);

  useEffect(() => {
    if (pathname.startsWith("/category")) {
      setQ(params.get("q") || "");
    }
  }, [pathname, params]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    api
      .searchSuggestions()
      .then((res) => {
        if (cancelled) return;
        const apiRecent = Array.isArray(res.recent) ? res.recent : [];
        const local = readRecentSearches();
        const seen = new Set(local.map((row) => row.term));
        setRecent([...local, ...apiRecent.filter((row) => row.term && !seen.has(row.term))].slice(0, 8));
        if (Array.isArray(res.popular) && res.popular.length) {
          setPopular(res.popular);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const typed = q.trim().toLowerCase();
  const recentShown = useMemo(
    () => recent.filter((row) => !typed || row.display.toLowerCase().includes(typed) || row.term.includes(typed)),
    [recent, typed],
  );
  const popularShown = useMemo(() => {
    const recentTerms = new Set(recentShown.map((row) => row.term));
    return popular.filter((row) => {
      if (recentTerms.has(row.term)) return false;
      if (!typed) return true;
      return row.display.toLowerCase().includes(typed) || row.term.includes(typed);
    });
  }, [popular, recentShown, typed]);

  function go(raw) {
    const parsed = normalizeSearchTerm(raw);
    const next = parsed?.display || String(raw || "").trim();
    setOpen(false);
    if (parsed) {
      setRecent(pushRecentSearch(parsed.display));
      api.recordSearch(parsed.display).catch(() => {});
      setQ(parsed.display);
      navigate(`/category/all?q=${encodeURIComponent(parsed.display)}`);
      return;
    }
    setQ(next);
    navigate("/category/all");
  }

  function onSubmit(e) {
    e.preventDefault();
    go(q);
  }

  function removeRecent(row, e) {
    e.preventDefault();
    e.stopPropagation();
    setRecent(removeRecentSearch(row.display));
    api.removeRecentSearch(row.display).catch(() => {});
  }

  function clearRecent(e) {
    e.preventDefault();
    e.stopPropagation();
    setRecent(clearRecentSearches());
    api.clearRecentSearches().catch(() => {});
  }

  const showPanel = open && (recentShown.length || popularShown.length || typed.length >= 2);

  return (
    <div className="relative min-w-0 flex-1" ref={boxRef}>
      <form onSubmit={onSubmit}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-msr-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products, brands..."
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-suggestions"
          className="h-10 w-full rounded-full bg-white pl-10 pr-4 text-sm text-msr-text outline-none placeholder:text-[#8b8ea3] focus:ring-2 focus:ring-msr-accent-light/70"
        />
      </form>

      {showPanel ? (
        <div
          id="search-suggestions"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-[#ece6d4] bg-white shadow-[0_18px_40px_rgba(8,10,61,0.16)]"
        >
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
            {typed.length >= 2 ? (
              <button
                type="button"
                onClick={() => go(q)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-msr-bg"
              >
                <Search className="h-4 w-4 shrink-0 text-[#8a6a12]" />
                <span className="min-w-0 truncate text-msr-navy">
                  Search for <span className="font-bold">“{q.trim()}”</span>
                </span>
              </button>
            ) : null}

            {recentShown.length ? (
              <section className="border-t border-[#f0eee6] px-3 py-3 first:border-t-0">
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6a12]">Recent searches</p>
                  <button type="button" onClick={clearRecent} className="text-[11px] font-bold text-[#8b8ea3] hover:text-msr-navy">
                    Clear
                  </button>
                </div>
                <ul>
                  {recentShown.map((row) => (
                    <li key={`r-${row.term}`}>
                      <div className="group flex items-center rounded-xl hover:bg-msr-bg">
                        <button
                          type="button"
                          onClick={() => go(row.display)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left text-sm text-msr-navy"
                        >
                          <Clock3 className="h-4 w-4 shrink-0 text-[#8b8ea3]" />
                          <span className="truncate font-medium">{row.display}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => removeRecent(row, e)}
                          className="mr-1 grid h-8 w-8 place-items-center rounded-full text-[#9aa0b4] opacity-0 hover:bg-white hover:text-msr-navy group-hover:opacity-100"
                          aria-label={`Remove ${row.display}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {popularShown.length ? (
              <section className="border-t border-[#f0eee6] px-3 py-3 first:border-t-0">
                <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a6a12]">
                  Popular searches
                </p>
                <div className="flex flex-wrap gap-2 px-1 pb-1">
                  {popularShown.map((row) => (
                    <button
                      key={`p-${row.term}`}
                      type="button"
                      onClick={() => go(row.display)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#ece6d4] bg-[#fffaf0] px-3 py-1.5 text-[12px] font-bold text-msr-navy hover:border-msr-gold"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-[#8a6a12]" />
                      {row.display}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
