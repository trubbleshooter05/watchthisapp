"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { EnrichedRecommendation } from "@/lib/enrich-page";
import type { Mood } from "@/lib/types/recommendation";
import { MatchBadge } from "@/components/MatchBadge";

const MOODS: (Mood | "all")[] = ["all", "dark", "uplifting", "tense", "funny", "bittersweet"];
const STREAMS = ["all", "netflix", "hulu", "prime", "disney", "max", "apple"] as const;
const ERAS = ["all", "classic", "1980s", "1990s", "2000s", "2010s", "2020s"] as const;

type StreamFilter = (typeof STREAMS)[number];
type EraFilter = (typeof ERAS)[number];

function eraMatches(year: number, era: EraFilter): boolean {
  if (era === "all") return true;
  if (era === "classic") return year < 1980;
  if (era === "1980s") return year >= 1980 && year <= 1989;
  if (era === "1990s") return year >= 1990 && year <= 1999;
  if (era === "2000s") return year >= 2000 && year <= 2009;
  if (era === "2010s") return year >= 2010 && year <= 2019;
  return year >= 2020;
}

function streamMatches(providers: EnrichedRecommendation["providers"], key: StreamFilter): boolean {
  if (key === "all") return true;
  const needle = key === "prime" ? "prime" : key;
  return providers.some((p) => p.name.toLowerCase().includes(needle));
}

function providerLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `https://image.tmdb.org/t/p/w45${logoPath}`;
}

export function RecommendationList({ items }: { items: EnrichedRecommendation[] }) {
  const [mood, setMood] = useState<Mood | "all">("all");
  const [stream, setStream] = useState<StreamFilter>("all");
  const [era, setEra] = useState<EraFilter>("all");

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (mood !== "all" && r.mood !== mood) return false;
      if (!eraMatches(r.year, era)) return false;
      if (!streamMatches(r.providers, stream)) return false;
      return true;
    });
  }, [items, mood, era, stream]);

  return (
    <div className="space-y-8">
      <section
        className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-6"
        aria-label="Filter recommendations"
      >
        <h2 className="font-display text-lg font-semibold text-[#FAFAFA] mb-4">Filter your results</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Mood</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <FilterChip key={m} active={mood === m} onClick={() => setMood(m)} label={m === "all" ? "All" : m} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Streaming (US)</p>
            <div className="flex flex-wrap gap-2">
              {STREAMS.map((s) => (
                <FilterChip
                  key={s}
                  active={stream === s}
                  onClick={() => setStream(s)}
                  label={s === "all" ? "All" : s === "prime" ? "Prime" : s.charAt(0).toUpperCase() + s.slice(1)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6B7280] mb-2">Era</p>
            <div className="flex flex-wrap gap-2">
              {ERAS.map((e) => (
                <FilterChip
                  key={e}
                  active={era === e}
                  onClick={() => setEra(e)}
                  label={e === "all" ? "All" : e === "classic" ? "Pre-1980" : e}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <p className="text-sm text-[#9CA3AF]">
        Showing <span className="text-[#FAFAFA] font-medium">{filtered.length}</span> of {items.length}{" "}
        picks
      </p>

      <ol className="space-y-10 list-none p-0 m-0">
        {filtered.map((rec, i) => (
          <li key={rec.tmdbId}>
            <article className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden sm:flex">
              <div className="relative aspect-[2/3] w-full sm:w-48 shrink-0 bg-black/40">
                {rec.posterUrl ? (
                  <Image
                    src={rec.posterUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 192px"
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center text-[#4B5563] text-sm px-4 text-center">
                    Poster unavailable
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <MatchBadge pct={rec.matchPercentage} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-semibold text-[#FAFAFA]">
                      <span className="text-amber-500/90 mr-2">{i + 1}.</span>
                      {rec.title}{" "}
                      <span className="text-[#6B7280] font-normal">({rec.year})</span>
                    </h3>
                    <p className="mt-1 text-sm text-[#9CA3AF]">
                      {rec.voteAverage != null && (
                        <>
                          ★ {rec.voteAverage.toFixed(1)}
                          {rec.genreNames.length > 0 && <> · {rec.genreNames.slice(0, 3).join(" · ")}</>}
                          {rec.runtimeLabel && <> · {rec.runtimeLabel}</>}
                        </>
                      )}
                      {rec.voteAverage == null && rec.genreNames.length > 0 && (
                        <>{rec.genreNames.slice(0, 3).join(" · ")}</>
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-500/90 mb-1">
                    Why you&apos;ll love it
                  </p>
                  <p className="text-[#D1D5DB] leading-relaxed">{rec.whyYoullLoveIt}</p>
                </div>
                {rec.providers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280] mb-2">
                      Watch on
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {rec.providers.slice(0, 8).map((p, idx) => (
                        <li
                          key={`${p.name}-${p.kind}-${idx}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-[#E5E7EB]"
                        >
                          {p.logo && (
                            <Image
                              src={providerLogoUrl(p.logo)!}
                              alt=""
                              width={18}
                              height={18}
                              className="rounded-sm"
                            />
                          )}
                          <span>{p.name}</span>
                          {p.kind !== "flatrate" && (
                            <span className="text-[#6B7280]">
                              ({p.kind === "rent" ? "Rent" : "Buy"})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href="/signup"
                  className="inline-flex w-fit items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500 hover:bg-amber-500/20 transition-colors"
                >
                  + Save for later
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ol>

      {filtered.length === 0 && (
        <p className="text-center text-[#9CA3AF] py-12">
          No matches for those filters — try &quot;All&quot; on one of the rows.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active
          ? "bg-amber-500 text-[#0F0F0F] font-medium"
          : "bg-white/5 text-[#9CA3AF] hover:bg-white/10 hover:text-[#FAFAFA]"
      }`}
    >
      {label}
    </button>
  );
}
