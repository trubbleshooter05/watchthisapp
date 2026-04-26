import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog-utils";
import { buildBlogPostingJsonLd } from "@/lib/schema-org";
import { getSiteUrl } from "@/lib/site-url";
import { markdownToHtml } from "@/lib/markdown-to-html";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getBlogPost(params.slug);

  if (!post) {
    return {
      title: "Essay Not Found",
    };
  }

  const baseUrl = getSiteUrl();
  const postUrl = `${baseUrl}/blog/${params.slug}`;
  const modifiedIso = new Date(post.frontmatter.updated || post.fileModifiedIso).toISOString();

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    robots: { index: true, follow: true },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: postUrl,
      type: "article",
      publishedTime: new Date(post.frontmatter.date).toISOString(),
      modifiedTime: modifiedIso,
      authors: ["MoviesLike Editorial Team"],
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);

  if (!post) {
    notFound();
  }

  const baseUrl = getSiteUrl();
  const publishDate = new Date(post.frontmatter.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedIso = new Date(post.frontmatter.updated || post.fileModifiedIso).toISOString();
  const updatedPretty = new Date(updatedIso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const blogJsonLd = buildBlogPostingJsonLd({
    baseUrl,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: new Date(post.frontmatter.date).toISOString(),
    dateModified: updatedIso,
    urlPath: `/blog/${post.slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <article>
        <header className="mb-12 border-b border-white/10 pb-8">
          <Link
            href="/blog"
            className="mb-4 inline-block text-sm text-amber-500 hover:text-amber-400 transition-colors"
          >
            ← Back to Essays
          </Link>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
            {post.frontmatter.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
            <span>
              Published <time dateTime={new Date(post.frontmatter.date).toISOString()}>{publishDate}</time>
            </span>
            <span aria-hidden>•</span>
            <span>
              Updated <time dateTime={updatedIso}>{updatedPretty}</time>
            </span>
            <span aria-hidden>•</span>
            <span className="text-[#D1D5DB]">MoviesLike Editorial Team</span>
            <span aria-hidden>•</span>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-400">
              {post.frontmatter.category}
            </span>
          </div>
        </header>

        <div
          className="space-y-6 [&_h1]:text-5xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-6 [&_h1]:mt-8 [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mb-4 [&_h2]:mt-8 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-gray-300 [&_p]:mb-4 [&_a]:text-amber-500 [&_a]:hover:text-amber-400 [&_a]:transition-colors [&_a]:underline [&_strong]:font-semibold [&_strong]:text-white [&_em]:italic [&_em]:text-gray-200 [&_ul]:ml-6 [&_ul]:space-y-2 [&_ol]:ml-6 [&_ol]:space-y-2 [&_li]:text-gray-300 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:text-gray-300 [&_blockquote]:italic [&_blockquote]:mb-4 [&_code]:bg-gray-900 [&_code]:text-amber-200 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm [&_pre]:bg-gray-900 [&_pre]:text-gray-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
        />
      </article>

      <footer className="mt-12 border-t border-white/10 pt-8 space-y-4">
        <p className="text-sm text-[#6B7280]">
          More from MoviesLike:{" "}
          <Link href="/popular" className="text-amber-500 hover:text-amber-400">
            Popular movie guides
          </Link>
          {" · "}
          <Link href="/browse" className="text-amber-500 hover:text-amber-400">
            Browse all movies
          </Link>
        </p>
        <Link
          href="/blog"
          className="inline-block text-amber-500 hover:text-amber-400 transition-colors"
        >
          ← Back to Essays
        </Link>
      </footer>
    </>
  );
}
