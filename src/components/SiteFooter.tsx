import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#0a0a0a] px-4 py-12 text-sm text-[#6B7280] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="text-xs leading-relaxed max-w-2xl">
          WatchThis may earn commissions from qualifying purchases or sign-ups through links to
          streaming services (affiliate disclosure). Availability and prices change; confirm on the
          provider&apos;s site.
        </p>
        <p className="text-xs">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/movies-like/top-gun-maverick" className="hover:text-amber-500">
            Films like Top Gun Maverick
          </Link>
          <Link href="/popular" className="hover:text-amber-500">
            Popular guides
          </Link>
          <Link href="/blog" className="hover:text-amber-500">
            Essays
          </Link>
          <Link href="/about" className="hover:text-amber-500">
            About
          </Link>
          <Link href="/privacy" className="hover:text-amber-500">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-amber-500">
            Terms
          </Link>
          <Link href="/sitemap.xml" className="hover:text-amber-500">
            Sitemap
          </Link>
        </div>
        <p className="text-xs text-[#4B5563]">© {new Date().getFullYear()} WatchThis</p>
      </div>
    </footer>
  );
}
