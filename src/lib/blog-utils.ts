import fs from "fs";
import path from "path";

export interface BlogFrontmatter {
  title: string;
  slug: string;
  date: string;
  /** Optional explicit last-updated date (ISO YYYY-MM-DD). */
  updated?: string;
  author: string;
  category: string;
  description: string;
  [key: string]: unknown;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string;
  /** Source file mtime (ISO) for “updated” display when `updated` frontmatter is absent. */
  fileModifiedIso: string;
}

/**
 * Simple YAML frontmatter parser for .mdx/.md files
 */
function parseFrontmatter(fileContent: string): { data: Record<string, unknown>; content: string } {
  const lines = fileContent.split("\n");

  if (lines[0] !== "---") {
    return { data: {}, content: fileContent };
  }

  let endIndex = 1;
  while (endIndex < lines.length && lines[endIndex] !== "---") {
    endIndex++;
  }

  if (endIndex === lines.length) {
    return { data: {}, content: fileContent };
  }

  const yamlContent = lines.slice(1, endIndex).join("\n");
  const content = lines.slice(endIndex + 1).join("\n");

  // Simple YAML parser for basic key: value pairs
  const data: Record<string, unknown> = {};
  const yamlLines = yamlContent.split("\n");

  for (const line of yamlLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      data[key] = value;
    }
  }

  return { data, content };
}

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src/content/blog");

/**
 * Ensure the blog content directory exists
 */
function ensureBlogDir() {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) {
    fs.mkdirSync(BLOG_CONTENT_DIR, { recursive: true });
  }
}

/**
 * Get all blog post slugs
 */
export function getAllBlogSlugs(): string[] {
  ensureBlogDir();

  const files = fs.readdirSync(BLOG_CONTENT_DIR);
  return files
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.(mdx|md)$/, ""));
}

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string): BlogPost | null {
  ensureBlogDir();

  const mdxPath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_CONTENT_DIR, `${slug}.md`);

  let filePath: string | null = null;
  if (fs.existsSync(mdxPath)) {
    filePath = mdxPath;
  } else if (fs.existsSync(mdPath)) {
    filePath = mdPath;
  } else {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = parseFrontmatter(fileContent);
  const fileModifiedIso = fs.statSync(filePath).mtime.toISOString();

  return {
    slug,
    frontmatter: data as BlogFrontmatter,
    content,
    fileModifiedIso,
  };
}

/**
 * Get all blog posts with metadata
 */
export function getAllBlogPosts(): BlogPost[] {
  const slugs = getAllBlogSlugs();
  const posts = slugs.map((slug) => getBlogPost(slug)).filter(Boolean) as BlogPost[];

  // Sort by date (newest first)
  return posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date).getTime();
    const dateB = new Date(b.frontmatter.date).getTime();
    return dateB - dateA;
  });
}

/**
 * Get blog posts by category
 */
export function getBlogPostsByCategory(category: string): BlogPost[] {
  return getAllBlogPosts().filter(
    (post) => post.frontmatter.category.toLowerCase() === category.toLowerCase()
  );
}
