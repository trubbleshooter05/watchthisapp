import Link from "next/link";

const nav = [
  { href: "/browse", label: "Browse" },
  { href: "/popular", label: "Popular" },
  { href: "/movies-like/top-gun-maverick", label: "Top Gun: Maverick" },
  { href: "/blog", label: "Essays" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-[#FAFAFA]">
          Watch<span className="text-amber-500">This</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-x-6 text-sm text-[#9CA3AF]">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`hover:text-amber-500 transition-colors ${
                item.href === "/movies-like/top-gun-maverick" ? "text-amber-500/90 font-medium" : ""
              }`}
            >
              {item.href === "/movies-like/top-gun-maverick" ? (
                <>
                  <span className="sm:hidden">Maverick</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
