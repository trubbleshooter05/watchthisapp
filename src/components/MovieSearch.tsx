"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

export type MovieEntry = {
  slug: string;
  title: string;
};

type Props = {
  movies: MovieEntry[];
  placeholder?: string;
  /** If true, filters an existing list instead of navigating */
  onFilter?: (filtered: MovieEntry[]) => void;
  className?: string;
  /** For <label htmlFor> on the homepage */
  id?: string;
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function score(query: string, title: string): number {
  const q = normalize(query);
  const t = normalize(title);
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const words = q.split(" ");
  const matched = words.filter((w) => w.length > 1 && t.includes(w));
  return matched.length > 0 ? (matched.length / words.length) * 40 : 0;
}

export function MovieSearch({
  movies,
  placeholder = 'Search for a movie... (e.g. Interstellar)',
  onFilter,
  className = "",
  id,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /** Keyboard/hover highlight only; cleared while a navigation is pending. */
  const [activeIdx, setActiveIdx] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results =
    query.trim().length === 0
      ? []
      : movies
          .map((m) => ({ ...m, score: score(query, m.title) }))
          .filter((m) => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

  useEffect(() => {
    setNavigatingSlug(null);
    setActiveIdx(-1);
  }, [pathname]);

  const handleFilter = useCallback(() => {
    if (!onFilter) return;
    const q = normalize(query.trim());
    if (!q) {
      onFilter(movies);
      return;
    }
    const filtered = movies
      .map((m) => ({ ...m, score: score(query, m.title) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
    onFilter(filtered);
  }, [query, movies, onFilter]);

  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function goToMovie(slug: string) {
    setNavigatingSlug(slug);
    setOpen(false);
    setQuery("");
    setActiveIdx(-1);
    startTransition(() => {
      router.push(`/movies-like/${slug}`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0 || isPending) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (target) goToMovie(target.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = !onFilter && open && query.trim().length > 0;
  const showRowHighlight = (idx: number) =>
    !isPending && idx === activeIdx;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={isPending && !onFilter}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-full border border-white/15 bg-[#1a1a1a] pl-11 py-3.5 text-sm text-[#FAFAFA] placeholder-[#6B7280] focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors disabled:opacity-70 ${
            isPending && !onFilter ? "pr-11" : "pr-4"
          }`}
          aria-label={id ? undefined : "Search movies"}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="movie-search-listbox"
          aria-busy={isPending && !onFilter}
          role="combobox"
        />
        {isPending && !onFilter ? (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-amber-500/25 border-t-amber-500"
            aria-hidden
          />
        ) : null}
      </div>

      {showDropdown && (
        <ul
          id="movie-search-listbox"
          role="listbox"
          className={`absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl overflow-hidden ${
            isPending ? "pointer-events-none opacity-80" : ""
          }`}
        >
          {results.length > 0 ? (
            results.map((m, idx) => {
              const pendingRow = navigatingSlug === m.slug && isPending;
              const keyboardActive = showRowHighlight(idx);
              return (
                <li
                  key={m.slug}
                  role="option"
                  aria-selected={keyboardActive}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!isPending) goToMovie(m.slug);
                  }}
                  onMouseEnter={() => {
                    if (!isPending) setActiveIdx(idx);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm transition-colors ${
                    pendingRow
                      ? "bg-amber-500/10 text-amber-400"
                      : keyboardActive
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-[#D1D5DB] hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs text-[#6B7280] shrink-0">Movies like</span>
                  <span className="font-medium flex-1">{m.title}</span>
                  {pendingRow ? (
                    <span
                      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500"
                      aria-hidden
                    />
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="px-4 py-4 text-sm text-[#6B7280] italic">
              We don&apos;t have that movie yet — but we&apos;re adding new ones every week.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
