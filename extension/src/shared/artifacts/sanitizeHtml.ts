/**
 * Remove <link rel="stylesheet" href="..."> tags where href is a relative path.
 * In iframe srcdoc, relative URLs resolve against the parent (options page),
 * causing 404s for files like style1.css that don't exist.
 */
export function sanitizeArtifactHtml(html: string): string {
  return html.replace(/<link\s[^>]*>/gi, (tag) => {
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']*)["']/i);
    const relMatch = tag.match(/rel\s*=\s*["']([^"']*)["']/i);
    const href = (hrefMatch?.[1] ?? "").trim();
    const isStylesheet = /\bstylesheet\b/i.test(relMatch?.[1] ?? "");
    if (isStylesheet && href && !/^(https?:|\/\/|data:|blob:)/i.test(href)) {
      return "";
    }
    return tag;
  });
}
