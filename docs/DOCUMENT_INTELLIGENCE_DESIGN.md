# Document Intelligence — Design

## Overview

Document Intelligence lets users upload local images/PDFs, extract structured content via PaddleOCR-VL, and review the extracted information in the options page. This doc defines the data model, APIs, and UI flow.

---

## 1. Data Model

### 1.1 Document (Extension-Side)

Stored in `chrome.storage.local` for persistence across sessions.

```ts
interface DocumentRecord {
  id: string;              // UUID
  filename: string;        // Original name, e.g. "report.pdf"
  fileHash: string;        // SHA256 of file content (64 hex chars)
  extractedAt: number;     // Timestamp of last extraction
  blockCount: number;      // For quick display in list
  // Optional: first few chars of markdown for preview
  preview?: string;
}
```

- **id**: Generated on first extract (e.g. `crypto.randomUUID()`).
- **fileHash**: Used as cache key on backend; same content ⇒ same hash.
- One record per unique file (by content). Re-extracting the same file updates `extractedAt` and `blockCount`.

### 1.2 Extraction Result (Backend / API)

Already defined by backend; summarized here.

```ts
interface ExtractedData {
  parsing_res_list: ParsingBlock[];
  layout_det_res: Record<string, unknown>;  // May include _images
  markdown: string;
  width?: number;
  height?: number;
  page_count?: number;
  images?: Record<string, string>;  // e.g. { layout_det_res: "hash/file.png" }
}

interface ParsingBlock {
  label: string;           // doc_title, text, paragraph_title, image, table, etc.
  content: string;
  bbox: [number, number, number, number];
  image_path?: string;     // "hash/filename.png" for blocks with images
}
```

- **fileHash**: Implicit in image paths; should be returned explicitly by API (see below).

---

## 2. API Design

### 2.1 Existing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/documents/extract` | Upload file → extract → return full result |
| GET | `/documents/imgs/{file_hash}/{filename}` | Serve cached image |

### 2.2 Proposed Additions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents/{file_hash}` | Return cached extraction result by hash (no re-upload) |
| GET | `/documents/{file_hash}/exists` | Check if cache exists (lightweight) |

**GET `/documents/{file_hash}`**

- Input: `file_hash` (64 hex chars).
- Output: Same as extract: `{ success, data, filename? }`.
- Behavior: Look up `.cache/{file_hash}/result.json`; return if found, else 404.
- Use case: Opening a document from the library without re-uploading.

**GET `/documents/{file_hash}/exists`**

- Returns `{ exists: boolean }`.
- Use case: Validate that cache is still present before showing document in library.

---

## 3. Local File Management

### 3.1 Sources

1. **Upload** — User selects file via `<input type="file">` (current).
2. **Library** — User selects a previously extracted document from the list.

### 3.2 Storage

- **Extension**: `chrome.storage.local` — document list only.
- **Backend**: `.cache/{file_hash}/` — result JSON + images.

### 3.3 Operations

| Operation | Flow |
|-----------|------|
| **Add** | Upload → Extract → Add/update record in storage |
| **Open** | Select from list → GET `/documents/{file_hash}` → Show result |
| **Re-extract** | Select from list → Re-upload same file (or provide hash to backend for re-run) → Update record |
| **Delete** | Remove from extension storage; optionally call backend to clear cache |

- **Add**: After successful extraction, upsert `DocumentRecord` keyed by `fileHash`.
- **Open**: Use cached result from backend if `exists` is true; otherwise show “cache expired” and suggest re-extract.
- **Delete**: Remove from storage; backend cache can be left as-is or cleared later via a separate endpoint.

---

## 4. Extraction Flow

### 4.1 Current

1. User clicks “Select & Extract”.
2. File picker opens.
3. File sent to POST `/documents/extract`.
4. Backend runs OCR (or returns cache) and responds.
5. Result shown in a single card.

### 4.2 Proposed

1. **Upload & extract**
   - Same as current, plus:
   - API returns `fileHash` in response.
   - On success: add/update document record; navigate or auto-select the document in the library.

2. **Open from library**
   - User selects a document.
   - Extension calls GET `/documents/{file_hash}`.
   - If 404: show “Cache expired”, offer “Re-extract” (re-upload).
   - If 200: show result in review UI.

3. **Re-extract**
   - User chooses “Re-extract” for a document in the list.
   - Must re-upload the file; extension cannot reconstruct file from hash.
   - UX: “Re-extract” could open file picker pre-filled with same filename hint (if possible) or ask user to choose the file again.

---

## 5. Review UI Design

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Document Intelligence                                        │
├──────────────────┬──────────────────────────────────────────┤
│  Document List    │  Review Panel                             │
│  ┌──────────────┐ │  ┌─────────────────────────────────────┐│
│  │ + Add file   │ │  │ Tabs: Blocks | Markdown | Layout      ││
│  ├──────────────┤ │  ├─────────────────────────────────────┤│
│  │ doc1.pdf     │ │  │                                     ││
│  │ doc2.png     │ │  │  [Content for selected tab]         ││
│  │ ...          │ │  │                                     ││
│  └──────────────┘ │  └─────────────────────────────────────┘│
└──────────────────┴──────────────────────────────────────────┘
```

### 5.2 Document List (Left Sidebar)

- “Add file” button → file picker → extract → add to list.
- Each item: `filename`, `blockCount`, optional short `preview`.
- Click item → load from cache (GET by hash) → show in review panel.
- Context menu or delete icon: remove from list.

### 5.3 Review Panel — Tabs

#### Tab 1: Blocks

- List of `parsing_res_list` items.
- Each row:
  - **Label** badge (e.g. `doc_title`, `text`, `image`).
  - **Content** (text or placeholder for image).
  - **Image thumbnail** if `image_path` exists (use `getDocumentImageUrl`).
- Order: same as `parsing_res_list`.
- Optional: filter by label.

#### Tab 2: Markdown

- Current view: `<pre>` with full markdown.
- Actions: Copy, Download as `.md`.
- Optional: rendered Markdown.

#### Tab 3: Layout

- Show input image with block boundaries overlay (if layout visualization is available).
- Use `images` or `layout_det_res._images` for the input/layout image.
- Blocks from `parsing_res_list` with bbox for overlay (optional enhancement).

### 5.4 Top Actions

- **Copy Markdown** — Copy full markdown to clipboard.
- **Export** — Download markdown or JSON (future).
- **Re-extract** — Re-upload and re-run extraction (requires file picker).

---

## 6. Implementation Phases

### Phase 1: Core Review (MVP) ✅ Implemented

- [x] Add `fileHash` to extract API response.
- [x] Add GET `/documents/{file_hash}` to fetch cached result.
- [x] Extend Document Intelligence UI:
  - [x] Document list in sidebar (persisted in chrome.storage).
  - [x] Blocks tab: list blocks with label, content, image thumbnail.
  - [x] Markdown tab: existing view + copy.

### Phase 2: Library & Caching

- [ ] Implement full document list: add, open, delete.
- [ ] GET `/documents/{file_hash}/exists` for cache validation.
- [ ] Handle “cache expired”: prompt re-extract when GET returns 404.

### Phase 3: UX Enhancements

- [ ] Layout tab: input image + block overlay.
- [ ] Export: download markdown file.
- [ ] Block filtering by label.
- [ ] Optional: inline correction of block content (edit mode).

---

## 7. Open Questions

1. **Re-extract without re-upload**  
   Backend could support “re-extract by hash” only if the original file is still in `.cache`. We currently don’t store the raw file, only the extraction result. So re-extract must involve re-upload.

2. **Cache eviction**  
   No policy yet. Options: TTL, max size, or manual clear.

3. **Concurrent limits**  
   No limit on number of documents in the list; consider a cap if storage becomes an issue.
