import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import type { Artifact, ArtifactType } from "./types";

// ─── Constants ─────────────────────────────────────────────────────────────

const CODE_BLOCK_RE = /```(\w+)\n([\s\S]*?)```/g;
const COLLAPSE_BLOCK_RE = /```(html|htm|svg|css|javascript|js|mermaid)\n([\s\S]*?)```/gi;
const PARTIAL_LANG_RE = /```(html|htm|svg|css|javascript|js|mermaid)\n/gi;

const RENDERABLE_LANGS: Record<string, ArtifactType> = {
  html: "html",
  htm: "html",
  svg: "svg",
  javascript: "combined",
  js: "combined",
  css: "combined",
  mermaid: "mermaid",
};

const MIN_LENGTH = { mermaid: 5, html: 10, css: 5, js: 5 } as const;

// ─── Types & Parsing ───────────────────────────────────────────────────────

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

/** Group consecutive html/css/js blocks. html/htm starts a new group; css/js extends. */
function groupCombinedBlocks(blocks: RawBlock[]): RawBlock[][] {
  const groups: RawBlock[][] = [];
  let current: RawBlock[] = [];

  for (const b of blocks) {
    const type = RENDERABLE_LANGS[b.lang];
    if (!type) continue;

    if (type === "svg" || type === "mermaid") {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      groups.push([b]);
      continue;
    }

    const starting = b.lang === "html" || b.lang === "htm";
    if (starting && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(b);
  }
  if (current.length) groups.push(current);
  return groups;
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

function createArtifact(
  id: string,
  messageId: string,
  type: Artifact["type"],
  content: string,
  isPartial?: boolean,
): Artifact {
  return { id, messageId, type, content, createdAt: Date.now(), ...(isPartial && { isPartial }) };
}

function blocksToCombinedContent(blocks: RawBlock[]): string {
  let html = "";
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  for (const b of blocks) {
    const raw = b.content.trim();
    if (!raw) continue;
    const l = b.lang.toLowerCase();
    if (l === "html" || l === "htm") html = raw;
    else if (l === "css") cssParts.push(raw);
    else if (l === "javascript" || l === "js") jsParts.push(raw);
  }

  const css = cssParts.join("\n");
  const js = jsParts.join("\n");
  return buildCombinedDoc(html, css, js);
}

function blockToArtifact(b: RawBlock, msgId: string, i: number): Artifact | null {
  const type = RENDERABLE_LANGS[b.lang];
  if (!type) return null;

  if (type === "svg") {
    const content = b.content.trim();
    if (content.length === 0) return null;
    return createArtifact(
      `a-${msgId}-${i}`,
      msgId,
      "svg",
      content.startsWith("<") ? content : `<svg>${content}</svg>`,
    );
  }

  if (type === "mermaid") {
    const content = b.content.trim();
    if (content.length < MIN_LENGTH.mermaid) return null;
    return createArtifact(`a-${msgId}-${i}`, msgId, "mermaid", content);
  }

  return null;
}

function toMessageText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textPart = content.find((c) => c && typeof c === "object" && (c as { type?: string }).type === "text");
    return typeof (textPart as { text?: string })?.text === "string" ? (textPart as { text: string }).text : "";
  }
  if (typeof content === "object" && content !== null && "text" in content) {
    return typeof (content as { text: unknown }).text === "string" ? (content as { text: string }).text : "";
  }
  return "";
}

function extractFromMessage(msg: SessionMessage): Artifact[] {
  const text = toMessageText(msg.content);
  if (msg.role !== "assistant" || !text.trim()) return [];

  const blocks = parseCodeBlocks(text);
  const groups = groupCombinedBlocks(blocks);
  const artifacts: Artifact[] = [];

  for (const group of groups) {
    const first = group[0];
    const type = RENDERABLE_LANGS[first.lang];
    const artifactIndex = artifacts.length;

    if (type === "svg") {
      const a = blockToArtifact(first, msg.id, artifactIndex);
      if (a) artifacts.push(a);
      continue;
    }

    if (type === "mermaid") {
      const a = blockToArtifact(first, msg.id, artifactIndex);
      if (a) artifacts.push(a);
      continue;
    }

    const content = blocksToCombinedContent(group);
    if (content.length < 20) continue;
    artifacts.push(createArtifact(`a-${msg.id}-${artifacts.length}`, msg.id, "combined", content));
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

// ─── Partial / Streaming Extraction ───────────────────────────────────────

/**
 * Extract a partial artifact from the last loading assistant message.
 * Used for live preview during streaming before the code block is complete.
 * Merges any complete html/css/js blocks with the streaming partial when applicable.
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

  const afterMarker = text.slice(lastIdx + 3 + lastLang.length + 1);
  if (afterMarker.includes("```")) return null;

  const raw = afterMarker.trim();
  if (raw.length < 3) return null;

  if (lastLang === "svg") {
    const content = raw.startsWith("<") ? raw : `<svg>${raw}</svg>`;
    return createArtifact(`partial-${last.id}`, last.id, "svg", content, true);
  }

  if (lastLang === "mermaid") {
    return createArtifact(`partial-${last.id}`, last.id, "mermaid", raw, true);
  }

  const completeBlocks = parseCodeBlocks(text.slice(0, lastIdx));
  const partialBlock: RawBlock = { lang: lastLang, content: raw, index: completeBlocks.length };
  const allBlocks = [...completeBlocks, partialBlock];
  const groups = groupCombinedBlocks(allBlocks);
  const lastGroup = groups[groups.length - 1];
  if (lastGroup && lastGroup.includes(partialBlock)) {
    const content = blocksToCombinedContent(lastGroup);
    if (content.length >= 20) {
      return createArtifact(`partial-${last.id}`, last.id, "combined", content, true);
    }
  }

  let content: string;
  if (lastLang === "html" || lastLang === "htm") {
    if (!raw.includes("<")) content = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div>${raw}</div></body></html>`;
    else if (!/<\/?\s*html\b|<!DOCTYPE/i.test(raw)) content = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${raw}</body></html>`;
    else content = raw;
  } else {
    content = buildCombinedDoc("", lastLang === "css" ? raw : "", lastLang !== "css" ? raw : "");
  }

  return createArtifact(`partial-${last.id}`, last.id, "combined", content, true);
}

// ─── Collapse & Placeholders ───────────────────────────────────────────────

/** Prefix for artifact links; href="#artifact-{id}" */
export const ARTIFACT_LINK_PREFIX = "#artifact-";

function artifactPlaceholder(artifactId: string): string {
  return `\n\n*[View interactive preview in Artifacts panel →](${ARTIFACT_LINK_PREFIX}${artifactId})*\n\n`;
}

function emitCheck(lang: string, trimmed: string): boolean {
  const l = (lang || "").toLowerCase();
  return (
    (l === "svg" && trimmed.length > 0) ||
    (l === "mermaid" && trimmed.length >= MIN_LENGTH.mermaid) ||
    ((l === "html" || l === "htm") && trimmed.length >= MIN_LENGTH.html) ||
    (["css", "javascript", "js"].includes(l) && trimmed.length >= MIN_LENGTH.css)
  );
}

/**
 * Replace artifact code blocks with clickable placeholders. Consecutive html/css/js blocks share one placeholder.
 * @param content - Message content
 * @param messageId - Message id for generating artifact ids (a-{messageId}-{artifactIndex})
 */
export function collapseArtifactCodeBlocks(content: string, messageId: string): string {
  if (!content?.trim()) return content;

  const matches: { lang: string; code: string; full: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(COLLAPSE_BLOCK_RE.source, "gi");
  while ((m = re.exec(content)) !== null) {
    const lang = (m[1] || "").toLowerCase();
    const code = (m[2] || "").trim();
    if (lang && code && emitCheck(lang, code)) {
      matches.push({ lang, code, full: m[0] });
    }
  }

  if (!matches.length) return content;

  const blocks: RawBlock[] = matches.map((x, i) => ({ lang: x.lang, content: x.code, index: i }));
  const groups = groupCombinedBlocks(blocks);

  const matchToGroup = new Map<number, { groupIndex: number; isFirst: boolean }>();
  let g = 0;
  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      matchToGroup.set(group[i].index, { groupIndex: g, isFirst: i === 0 });
    }
    g++;
  }

  let matchIndex = 0;
  const replaceRe = new RegExp(COLLAPSE_BLOCK_RE.source, "gi");
  return content.replace(replaceRe, (fullMatch, lang, code) => {
    const langLower = (lang || "").toLowerCase();
    const trimmed = (code || "").trim();
    if (!emitCheck(langLower, trimmed)) return fullMatch;

    const idx = matchIndex++;
    const info = matchToGroup.get(idx);
    if (!info) return fullMatch;
    if (!info.isFirst) return "";

    return artifactPlaceholder(`a-${messageId}-${info.groupIndex}`);
  });
}
