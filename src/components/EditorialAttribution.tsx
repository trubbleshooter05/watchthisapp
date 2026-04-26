type Props = {
  /** ISO 8601 datetime */
  updatedIso: string;
  className?: string;
};

/** Visible byline + last updated (E-E-A-T / audit). */
export function EditorialAttribution({ updatedIso, className = "" }: Props) {
  const pretty = new Date(updatedIso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <p
      className={`text-sm text-[#6B7280] border-t border-white/10 pt-6 mt-10 ${className}`.trim()}
    >
      <span className="text-[#9CA3AF]">MoviesLike Editorial Team</span>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <time dateTime={updatedIso}>Updated {pretty}</time>
    </p>
  );
}
