/**
 * Simple markdown to HTML converter without external dependencies
 */

export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Code blocks (triple backticks)
  html = html.replace(/```(.*?)\n([\s\S]*?)```/gm, "<pre><code>$2</code></pre>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquotes
  html = html.replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^\* (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/(?:^|\n)(<li>.*?<\/li>)/gm, (match) => {
    if (!match.includes("<ul>")) {
      return `<ul>\n${match}\n</ul>`;
    }
    return match;
  });

  // Paragraphs (wrap non-tagged lines)
  const lines = html.split("\n");
  html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("<") ||
        trimmed.startsWith(">") ||
        trimmed.startsWith("---")
      ) {
        return line;
      }
      return `<p>${line}</p>`;
    })
    .join("\n");

  // Remove double-wrapped paragraphs
  html = html.replace(/<p>(<h[1-6].*?<\/h[1-6]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>.*?<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>.*?<\/blockquote>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>.*?<\/pre>)<\/p>/g, "$1");

  return html;
}
