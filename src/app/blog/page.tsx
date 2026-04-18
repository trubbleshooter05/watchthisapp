import type { Metadata } from "next";
import Link from "next/link";
import { EditorialAttribution } from "@/components/EditorialAttribution";
import { getAllBlogPosts } from "@/lib/blog-utils";
import { getProjectFileMtimeIso } from "@/lib/editorial-meta";
import { getSiteUrl } from "@/lib/site-url";

const blogIndexUpdatedIso = getProjectFileMtimeIso("src/app/blog/page.tsx");

export const metadata: Metadata = {
  title: "Cinematic Essays",
  description: "Deep-dive film theory essays exploring contemporary cinema, technique, and storytelling.",
  alternates: { canonical: `${getSiteUrl()}/blog` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Cinematic Essays",
    description: "Deep-dive film theory essays exploring contemporary cinema, technique, and storytelling.",
    url: `${getSiteUrl()}/blog`,
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      <header className="mb-12 border-b border-white/10 pb-8">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">Cinematic Essays</h1>
        <p className="text-lg text-gray-300">
          Deep-dive film theory explorations of contemporary cinema, technique, and storytelling.
          Written for cinephiles, scholars, and filmmakers seeking rigorous analysis.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">Essays coming soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => {
            const publishDate = new Date(post.frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <article key={post.slug} className="group border-b border-white/10 pb-8 last:border-b-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="block transition-opacity hover:opacity-80"
                >
                  <h2 className="mb-2 text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    {post.frontmatter.title}
                  </h2>
                </Link>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span>{publishDate}</span>
                  <span>•</span>
                  <span>{post.frontmatter.author}</span>
                  <span>•</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-1 text-amber-400 text-xs">
                    {post.frontmatter.category}
                  </span>
                </div>
                <p className="text-gray-300">{post.frontmatter.description}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 inline-block text-amber-500 hover:text-amber-400 transition-colors text-sm"
                >
                  Read essay →
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <section className="mt-16 border-t border-white/10 pt-10">
        <h2 className="text-lg font-semibold text-white mb-3">Movie guides</h2>
        <p className="text-sm text-[#9CA3AF] mb-4 max-w-xl">
          Pair essays with curated recommendations — start from the{" "}
          <Link href="/popular" className="text-amber-500 hover:text-amber-400 transition-colors">
            popular guides hub
          </Link>
          ,{" "}
          <Link
            href="/movies-like/top-gun-maverick"
            className="text-amber-500 hover:text-amber-400 transition-colors"
          >
            companion picks after Top Gun: Maverick
          </Link>
          , or{" "}
          <Link href="/browse" className="text-amber-500 hover:text-amber-400 transition-colors">
            browse every title
          </Link>
          .
        </p>
      </section>

      <EditorialAttribution updatedIso={blogIndexUpdatedIso} />
    </>
  );
}
