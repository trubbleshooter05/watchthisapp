import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog-utils";
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

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: postUrl,
      type: "article",
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
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

interface BlogFrontmatter {
  title: string;
  slug: string;
  date: string;
  author: string;
  category: string;
  description: string;
}

interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string;
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug) as BlogPost | null;

  if (!post) {
    notFound();
  }

  const publishDate = new Date(post.frontmatter.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span>{publishDate}</span>
            <span>•</span>
            <span>By {post.frontmatter.author}</span>
            <span>•</span>
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

      <footer className="mt-16 border-t border-white/10 pt-8">
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
