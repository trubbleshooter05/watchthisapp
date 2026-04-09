import type { ReactNode } from "react";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal text-white">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 [&_h1]:text-5xl [&_h1]:font-bold [&_h1]:font-display [&_h1]:tracking-tight [&_h1]:mb-6 [&_h1]:mt-8 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:font-display [&_h2]:tracking-tight [&_h2]:mb-4 [&_h2]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:font-display [&_h3]:mb-3 [&_h3]:mt-6 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-gray-300 [&_p]:mb-4 [&_a]:text-amber-500 [&_a:hover]:text-amber-400 [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_em]:text-gray-200 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:space-y-2 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:text-gray-300 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:text-gray-300 [&_blockquote]:italic [&_blockquote]:mb-4 [&_code]:bg-gray-900 [&_code]:text-amber-200 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm [&_pre]:bg-gray-900 [&_pre]:text-gray-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4">
        {children}
      </main>
    </div>
  );
}
