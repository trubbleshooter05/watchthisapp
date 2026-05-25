import type { Metadata } from "next";
import { TrendingMovieComparisons } from "@/components/TrendingMovieComparisons";
import { getSiteUrl } from "@/lib/site-url";

const baseUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Movies Like - Find Movies You'll Love",
  description: "Discover movies similar to your favorites. Browse trending movie comparisons and find your next watch.",
  alternates: { canonical: `${baseUrl}/movies-like` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Movies Like - Find Movies You'll Love",
    description: "Discover movies similar to your favorites. Browse trending movie comparisons and find your next watch.",
    url: `${baseUrl}/movies-like`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Movies Like - Find Movies You'll Love",
    description: "Discover movies similar to your favorites. Browse trending movie comparisons and find your next watch.",
  },
};

export default function MoviesLikePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Movies Like</h1>
          <p className="text-lg text-muted-foreground">
            Discover what audiences are searching for right now
          </p>
        </div>

        <TrendingMovieComparisons />

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-3">How it works</h2>
          <p className="text-muted-foreground">
            Browse trending movie comparisons based on real search demand. Find movies similar to ones you love,
            and discover what other viewers are looking for.
          </p>
        </div>
      </div>
    </main>
  );
}
