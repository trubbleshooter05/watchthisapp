import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal text-white">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <style jsx>{`
          main :global(h1) {
            @apply mb-6 text-5xl font-bold tracking-tight text-white mt-8;
            font-family: var(--font-display);
          }
          main :global(h2) {
            @apply mb-4 text-3xl font-bold tracking-tight text-white mt-8;
            font-family: var(--font-display);
          }
          main :global(h3) {
            @apply mb-3 text-2xl font-semibold text-gray-100 mt-6;
            font-family: var(--font-display);
          }
          main :global(p) {
            @apply mb-4 text-base leading-relaxed text-gray-300;
            line-height: 1.75;
          }
          main :global(a) {
            @apply text-amber-500 hover:text-amber-400 transition-colors underline;
          }
          main :global(strong) {
            @apply font-semibold text-white;
          }
          main :global(em) {
            @apply italic text-gray-200;
          }
          main :global(ul) {
            @apply mb-4 ml-6 space-y-2;
          }
          main :global(ol) {
            @apply mb-4 ml-6 space-y-2 list-decimal;
          }
          main :global(li) {
            @apply text-gray-300;
          }
          main :global(blockquote) {
            @apply mb-4 border-l-4 border-amber-500 pl-4 py-2 text-gray-300 italic;
          }
          main :global(code) {
            @apply bg-gray-900 text-amber-200 px-2 py-1 rounded font-mono text-sm;
          }
          main :global(pre) {
            @apply mb-4 bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto;
          }
        `}</style>
        {children}
      </main>
    </div>
  );
}
