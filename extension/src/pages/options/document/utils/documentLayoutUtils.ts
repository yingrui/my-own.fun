/**
 * Document layout utilities: page entries, bbox, block matching.
 */

import type { ParsingBlock } from "@src/shared/services/backendApi";

export interface LayoutBox {
  coordinate?: number[];
  label?: string;
  block_index?: number;
  [key: string]: unknown;
}

export interface LayoutPageEntry {
  pageIndex: number;
  imagePath: string;
  label: string;
  boxes: LayoutBox[];
  blockStartIndex: number;
  blockEndIndex: number;
}

export interface BoxOnPage {
  blockIndex: number;
  bbox: [number, number, number, number];
  label: string;
}

export function bboxIoU(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const ix1 = Math.max(ax1, bx1);
  const iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

export function getBboxFromLayoutBox(
  box: LayoutBox
): [number, number, number, number] | null {
  const coord = box?.coordinate;
  if (Array.isArray(coord) && coord.length >= 4) {
    return [coord[0], coord[1], coord[2], coord[3]];
  }
  return null;
}

const LABEL_ALIASES: Record<string, string[]> = {
  chart: ["chart"],
  text: ["text"],
  header: ["header"],
  figure_title: ["figure_title"],
  paragraph_title: ["paragraph_title"],
  abstract: ["abstract"],
  table: ["table"],
  image: ["image", "header_image"],
  header_image: ["header_image", "image"],
};

export function labelsMatch(layoutLabel: string, blockLabel: string): boolean {
  if (layoutLabel === blockLabel) return true;
  if (LABEL_ALIASES[layoutLabel]?.includes(blockLabel)) return true;
  return LABEL_ALIASES[blockLabel]?.includes(layoutLabel) ?? false;
}

export function findBestMatchingBlock(
  layoutBox: LayoutBox,
  blocks: ParsingBlock[],
  blockStart: number,
  blockEnd: number
): number | null {
  const layoutBbox = getBboxFromLayoutBox(layoutBox);
  const layoutLabel = (layoutBox.label as string) ?? "";
  if (!layoutBbox || blockStart >= blockEnd) return null;

  let bestIdx: number | null = null;
  let bestScore = 0;

  for (let i = blockStart; i < Math.min(blockEnd, blocks.length); i++) {
    const block = blocks[i];
    const b = block?.bbox;
    if (!b || b.length < 4) continue;
    const blockBbox: [number, number, number, number] = [b[0], b[1], b[2], b[3]];
    const iou = bboxIoU(layoutBbox, blockBbox);
    const labelBonus = labelsMatch(layoutLabel, block?.label ?? "") ? 1.5 : 0.5;
    const score = iou * labelBonus;
    if (score > bestScore && iou > 0.1) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function resolveBlockIndex(
  box: LayoutBox,
  blocks: ParsingBlock[],
  blockStartIndex: number,
  blockEndIndex: number
): number | null {
  if (
    typeof box.block_index === "number" &&
    box.block_index >= 0 &&
    box.block_index < blocks.length
  ) {
    return box.block_index;
  }
  return findBestMatchingBlock(box, blocks, blockStartIndex, blockEndIndex);
}

export function getLayoutPageEntries(
  layoutDetRes: unknown[] | undefined,
  imagesObj: Record<string, string> | undefined,
  totalBlockCount: number
): LayoutPageEntry[] {
  const entries: LayoutPageEntry[] = [];
  const layoutArr = Array.isArray(layoutDetRes) ? layoutDetRes : [];

  let blockStartIndex = 0;
  for (let i = 0; i < layoutArr.length; i++) {
    const page = layoutArr[i] as {
      input_img?: string;
      boxes?: LayoutBox[];
      _images?: { input_img?: string };
    };
    const boxes = Array.isArray(page?.boxes) ? page.boxes : [];
    const blockEndIndex = Math.min(blockStartIndex + boxes.length, totalBlockCount);
    let imagePath =
      page?.input_img ??
      page?._images?.input_img ??
      imagesObj?.[`layout_det_res_${i}`] ??
      imagesObj?.[`layout_det_res_${String(i)}`] ??
      "";
    if (!imagePath && imagesObj) {
      const key = Object.keys(imagesObj).find(
        (k) => k.includes("layout_det") && k.includes(String(i))
      );
      if (key) imagePath = imagesObj[key];
    }
    entries.push({
      pageIndex: i,
      imagePath,
      label: `Page ${i + 1}`,
      boxes,
      blockStartIndex,
      blockEndIndex,
    });
    blockStartIndex = blockEndIndex;
  }

  if (entries.length === 0 && imagesObj) {
    const sorted = Object.entries(imagesObj)
      .filter(([, path]) => !!path)
      .sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D+/g, ""), 10) ?? 0;
        const numB = parseInt(b.replace(/\D+/g, ""), 10) ?? 0;
        return numA - numB;
      });
    sorted.forEach(([key, path], i) => {
      entries.push({
        pageIndex: i,
        imagePath: path,
        label: key,
        boxes: [],
        blockStartIndex: 0,
        blockEndIndex: totalBlockCount,
      });
    });
  }

  return entries;
}

export function getBoxesOnPage(
  entry: LayoutPageEntry,
  blocks: ParsingBlock[]
): BoxOnPage[] {
  return entry.boxes
    .map((box) => {
      const bbox = getBboxFromLayoutBox(box);
      if (!bbox) return null;
      const blockIndex = resolveBlockIndex(
        box,
        blocks,
        entry.blockStartIndex,
        entry.blockEndIndex
      );
      if (blockIndex === null) return null;
      const label = (box as { label?: string }).label ?? `Block ${blockIndex + 1}`;
      return { blockIndex, bbox, label } satisfies BoxOnPage;
    })
    .filter((b): b is BoxOnPage => b != null);
}
