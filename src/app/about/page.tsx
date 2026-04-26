import type { Metadata } from "next";
import Link from "next/link";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { getProjectFileMtimeIso } from "@/lib/editorial-meta";
import { getSiteUrl } from "@/lib/site-url";

const aboutUpdatedIso = getProjectFileMtimeIso("src/app/about/page.tsx");

export const metadata: Metadata = {
  title: "About",
  description: "About MoviesLike — movie recommendations with streaming context at movieslike.app.",
  alternates: { canonical: `${getSiteUrl()}/about` },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold mb-6">About MoviesLike</h1>
      <div className="space-y-4 text-[#D1D5DB] leading-relaxed">
        <p>
          MoviesLike.app was built by a movie fan tired of generic recommendation algorithms that
          just serve up the same ten blockbusters. Every page is curated with AI-powered analysis
          to match the specific vibe, themes, and emotional experience of each film — not just genre
          tags.
        </p>
        <p>
          MoviesLike helps you answer &quot;what should I watch if I loved X?&quot; with specific
          reasons — not just a flat list — and up-to-date streaming availability in the US via TMDB.
          Recommendation blurbs are original editorial-style copy; we do not copy plot summaries
          from third-party databases. Example: our{" "}
          <Link href="/movies-like/top-gun-maverick" className="text-amber-500 hover:underline">
            full guide to movies like Top Gun: Maverick
          </Link>
          .
        </p>
        <p>
          Have a movie you want covered, or spotted something wrong? Reach out at{" "}
          <a href="mailto:privacy@movieslike.app" className="text-amber-500 hover:underline">
            privacy@movieslike.app
          </a>
          .
        </p>
        <p className="text-sm text-[#6B7280]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>

      <EditorialAttribution updatedIso={aboutUpdatedIso} />
    </main>
  );
}
