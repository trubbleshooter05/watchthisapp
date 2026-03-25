import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About WatchThis — movie recommendations with streaming context.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-6">About WatchThis</h1>
      <div className="space-y-4 text-[#D1D5DB] leading-relaxed">
        <p>
          WatchThis helps you answer &quot;what should I watch if I loved X?&quot; with specific
          reasons—not just a flat list—and up-to-date streaming availability in the US via TMDB.
        </p>
        <p>
          Recommendation blurbs are original editorial-style copy stored with each page; we do not
          copy plot summaries from third-party databases.
        </p>
        <p className="text-sm text-[#6B7280]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </main>
  );
}
