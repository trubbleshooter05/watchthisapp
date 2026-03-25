function ringColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400 border-emerald-400/60";
  if (pct >= 80) return "text-amber-400 border-amber-400/60";
  return "text-orange-400 border-orange-400/60";
}

export function MatchBadge({ pct }: { pct: number }) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-[#141414] text-xs font-bold ${ringColor(pct)}`}
      aria-label={`${pct} percent match`}
    >
      <span className="text-sm leading-none">{pct}</span>
      <span className="text-[9px] font-medium uppercase tracking-wide opacity-80">match</span>
    </div>
  );
}
