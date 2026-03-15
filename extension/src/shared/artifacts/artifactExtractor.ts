import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import type { Artifact, ArtifactType } from "./types";

const CODE_BLOCK_RE = /```(\w+)\n([\s\S]*?)```/g;

const RENDERABLE_LANGS: Record<string, ArtifactType> = {
  html: "html",
  htm: "html",
  svg: "svg",
  javascript: "combined",
  js: "combined",
  css: "combined",
};

interface RawBlock {
  lang: string;
  content: string;
  index: number;
}

function parseCodeBlocks(text: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(CODE_BLOCK_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    const content = (m[2] || "").trim();
    if (lang && content) {
      blocks.push({ lang, content, index: blocks.length });
    }
  }
  return blocks;
}

function isWebLang(lang: string): boolean {
  const l = lang.toLowerCase();
  return l === "html" || l === "htm" || l === "css" || l === "javascript" || l === "js";
}

function buildCombinedDoc(html: string, css: string, js: string): string {
  const hasFullDoc = /<html[\s>]|<!DOCTYPE/i.test(html);
  if (hasFullDoc && !css && !js) return html.trim();

  const parts: string[] = [
    "<!DOCTYPE html>",
    "<html><head><meta charset=\"utf-8\">",
  ];
  if (css) parts.push("<style>", css, "</style>");
  parts.push("</head><body>");
  if (html) parts.push(html);
  if (js) parts.push("<script>", js, "</script>");
  parts.push("</body></html>");
  return parts.join("\n");
}

function extractFromMessage(msg: SessionMessage): Artifact[] {
  if (msg.role !== "assistant" || !msg.content?.trim()) return [];

  const blocks = parseCodeBlocks(msg.content);
  const artifacts: Artifact[] = [];
  const used = new Set<number>();

  for (let i = 0; i < blocks.length; i++) {
    if (used.has(i)) continue;

    const b = blocks[i];
    const type = RENDERABLE_LANGS[b.lang];
    if (!type) continue;

    if (type === "svg") {
      const content = b.content.trim();
      if (content.length > 0) {
        artifacts.push({
          id: `a-${msg.id}-${i}`,
          messageId: msg.id,
          type: "svg",
          content: content.startsWith("<") ? content : `<svg>${content}</svg>`,
          createdAt: Date.now(),
        });
        used.add(i);
      }
      continue;
    }

    if (type === "html") {
      const nextIsWeb = i + 1 < blocks.length && isWebLang(blocks[i + 1].lang);
      if (nextIsWeb) {
        const run: RawBlock[] = [];
        let j = i;
        while (j < blocks.length && isWebLang(blocks[j].lang)) {
          run.push(blocks[j]);
          used.add(j);
          j++;
        }
        const html = run.filter((x) => x.lang === "html" || x.lang === "htm").map((x) => x.content).join("\n");
        const css = run.filter((x) => x.lang === "css").map((x) => x.content).join("\n");
        const js = run.filter((x) => x.lang === "javascript" || x.lang === "js").map((x) => x.content).join("\n");
        const content = buildCombinedDoc(html, css, js);
        if (content.length >= 20) {
          artifacts.push({ id: `a-${msg.id}-${i}`, messageId: msg.id, type: "combined", content, createdAt: Date.now() });
        }
        i = j - 1; // for-loop will increment to j
      } else {
        const content = b.content.trim();
        if (content.length >= 10) {
          artifacts.push({
            id: `a-${msg.id}-${i}`,
            messageId: msg.id,
            type: "html",
            content: content.startsWith("<") ? content : `<div>${content}</div>`,
            createdAt: Date.now(),
          });
          used.add(i);
        }
      }
      continue;
    }

    if (type === "combined") {
      const run: RawBlock[] = [];
      let j = i;
      while (j < blocks.length && isWebLang(blocks[j].lang)) {
        run.push(blocks[j]);
        used.add(j);
        j++;
      }
      const html = run.filter((x) => x.lang === "html" || x.lang === "htm").map((x) => x.content).join("\n");
      const css = run.filter((x) => x.lang === "css").map((x) => x.content).join("\n");
      const js = run.filter((x) => x.lang === "javascript" || x.lang === "js").map((x) => x.content).join("\n");
      const content = buildCombinedDoc(html, css, js);
      if (content.length >= 20) {
        artifacts.push({ id: `a-${msg.id}-${i}`, messageId: msg.id, type: "combined", content, createdAt: Date.now() });
      }
      i = j - 1; // for-loop will increment to j
    }
  }

  return artifacts;
}

/**
 * Extract renderable artifacts from assistant messages.
 */
export function extractArtifacts(messages: SessionMessage[]): Artifact[] {
  const result: Artifact[] = [];
  for (const msg of messages) {
    result.push(...extractFromMessage(msg));
  }
  return result;
}

const PARTIAL_LANG_RE = /```(html|htm|svg|css|javascript|js)\n/gi;

/**
 * Extract a partial artifact from the last loading assistant message.
 * Used for live preview during streaming before the code block is complete.
 */
export function extractPartialArtifact(messages: SessionMessage[]): Artifact | null {
  if (!messages.length) return null;
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant" || !last.loading || !last.content?.trim()) return null;

  const text = last.content;
  const re = new RegExp(PARTIAL_LANG_RE.source, "gi");
  let m: RegExpExecArray | null;
  let lastIdx = -1;
  let lastLang = "";

  while ((m = re.exec(text)) !== null) {
    lastIdx = m.index;
    lastLang = (m[1] || "").toLowerCase();
  }

  if (lastIdx < 0 || !lastLang) return null;

  const afterMarker = text.slice(lastIdx + 3 + lastLang.length + 1); // ``` + lang + \n
  if (afterMarker.includes("```")) return null;

  const raw = afterMarker.trim();
  if (raw.length < 3) return null;

  const type: Artifact["type"] = lastLang === "svg" ? "svg" : lastLang === "html" || lastLang === "htm" ? "html" : "combined";

  let content = raw;
  if (lastLang === "svg") {
    content = raw.startsWith("<") ? raw : `<svg>${raw}</svg>`;
  } else if (lastLang === "html" || lastLang === "htm") {
    if (!raw.includes("<")) content = `<div>${raw}</div>`;
    else if (!/<\/?\s*html\b|<!DOCTYPE/i.test(raw)) content = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${raw}</body></html>`;
  } else if (lastLang === "css" || lastLang === "javascript" || lastLang === "js") {
    content = `<!DOCTYPE html><html><head><meta charset="utf-8">${lastLang === "css" ? `<style>${raw}</style>` : ""}</head><body>${lastLang !== "css" ? `<script>${raw}</script>` : ""}</body></html>`;
  }

  return {
    id: `partial-${last.id}`,
    messageId: last.id,
    type,
    content,
    createdAt: Date.now(),
    isPartial: true,
  };
}

const ARTIFACT_PLACEHOLDER = "\n\n*[View interactive preview in Artifacts panel →]*\n\n";

/**
 * Replace artifact code blocks (html, svg, html+css+js) in content with a short placeholder.
 * Use when the message has artifacts so the full code is not duplicated in chat.
 */
export function collapseArtifactCodeBlocks(content: string): string {
  if (!content?.trim()) return content;

  let result = content.replace(
    /```(html|htm|svg|css|javascript|js)\n([\s\S]*?)```/gi,
    (match, lang, code) => {
      const l = (lang || "").toLowerCase();
      const trimmed = (code || "").trim();
      if (!trimmed) return match;
      if (l === "svg" && trimmed.length > 0) return ARTIFACT_PLACEHOLDER;
      if ((l === "html" || l === "htm") && trimmed.length >= 10) return ARTIFACT_PLACEHOLDER;
      if (["css", "javascript", "js"].includes(l) && trimmed.length >= 5) return ARTIFACT_PLACEHOLDER;
      return match;
    },
  );

  result = result.replace(
    new RegExp(`(\\*\\[View interactive preview[^\\]]+\\]\\*\\s*)+`, "g"),
    `\n\n${ARTIFACT_PLACEHOLDER.trim()}\n\n`,
  );
  return result;
}
