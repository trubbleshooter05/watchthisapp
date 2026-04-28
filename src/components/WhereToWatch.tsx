import { buildWhereToWatchUrls } from "@/lib/where-to-watch";

type Props = {
  movieTitle: string;
  includeNetflix?: boolean;
};

export function WhereToWatch({ movieTitle, includeNetflix }: Props) {
  const { netflix, amazonPrime, appleTv, fandango, justWatch } = buildWhereToWatchUrls(movieTitle);

  const linkClass =
    "text-amber-500/90 hover:text-amber-400 underline-offset-2 hover:underline transition-colors";

  return (
    <section
      className="mb-8 max-w-3xl border border-white/10 rounded-xl bg-white/[0.02] px-4 py-3 sm:px-5"
      aria-labelledby="where-to-watch-heading"
    >
      <h2
        id="where-to-watch-heading"
        className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF] mb-3"
      >
        Where to Watch
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#D1D5DB]">
        {includeNetflix ? (
          <li>
            <a
              href={netflix}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              Watch on Netflix
            </a>
          </li>
        ) : null}
        <li>
          <a
            href={amazonPrime}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Watch on Amazon Prime
          </a>
        </li>
        <li>
          <a
            href={appleTv}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={linkClass}
          >
            Watch on Apple TV
          </a>
        </li>
        <li>
          <a
            href={fandango}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={linkClass}
          >
            Find tickets on Fandango
          </a>
        </li>
        <li>
          <a
            href={justWatch}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={linkClass}
          >
            Compare streaming options
          </a>
        </li>
      </ul>
    </section>
  );
}
