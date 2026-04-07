/**
 * Backend API service for communicating with the FastAPI backend
 */

// Backend API URL - can be configured via environment variable or defaults to localhost
// For production, set this via build-time environment variable
export const BACKEND_API_URL =
  (typeof process !== "undefined" && process.env?.BACKEND_API_URL) ||
  import.meta.env?.VITE_BACKEND_API_URL ||
  "http://localhost:8100/api/v1";

export const BACKEND_BASE_URL = BACKEND_API_URL.replace("/api/v1", "");

export interface BackendApiError {
  detail: string;
}

/**
 * Get Chrome profile ID
 */
async function getProfileId(): Promise<string> {
  // Try to get profile ID from Chrome runtime
  // For now, use a default or generate one based on extension ID
  const extensionId = chrome.runtime.id;
  
  // Try to get from local storage first (cached)
  const cached = await chrome.storage.local.get(["profileId"]);
  if (cached.profileId) {
    return cached.profileId;
  }
  
  // Generate a profile ID based on extension ID
  const profileId = `profile_${extensionId}`;
  await chrome.storage.local.set({ profileId });
  return profileId;
}

/**
 * Create or get profile from backend
 */
export async function ensureProfile(profileName?: string): Promise<void> {
  try {
    const profileId = await getProfileId();
    const response = await fetch(`${BACKEND_API_URL}/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profile_id: profileId,
        profile_name: profileName,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ensure profile: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to ensure profile:", error);
    // Continue anyway - might be offline
  }
}

/**
 * Get all settings from backend
 */
export async function getSettings(): Promise<Record<string, any>> {
  try {
    const profileId = await getProfileId();
    await ensureProfile();
    
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/settings`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {};
      }
      throw new Error(`Failed to get settings: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.settings || {};
  } catch (error) {
    console.error("Failed to get settings from backend:", error);
    // Fallback to empty object
    return {};
  }
}

/**
 * Get a specific setting from backend
 */
export async function getSetting(key: string): Promise<any> {
  try {
    const profileId = await getProfileId();
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/settings/${key}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get setting: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error(`Failed to get setting ${key} from backend:`, error);
    return null;
  }
}

/**
 * Update a setting in backend
 */
export async function updateSetting(
  key: string,
  value: any,
  category: string
): Promise<boolean> {
  try {
    const profileId = await getProfileId();
    await ensureProfile();
    
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/settings/${key}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        category,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update setting: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to update setting ${key} in backend:`, error);
    return false;
  }
}

/**
 * Bulk update settings in backend
 */
export async function bulkUpdateSettings(
  settings: Record<string, any>,
  category: string
): Promise<boolean> {
  try {
    const profileId = await getProfileId();
    await ensureProfile();
    
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settings,
        category,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk update settings: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error("Failed to bulk update settings in backend:", error);
    return false;
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Single block from document extraction
 */
export interface ParsingBlock {
  label: string;
  content: string;
  bbox: number[];
  image_path?: string;
}

/**
 * Document extraction result from PaddleOCR
 */
export interface DocumentExtractionResult {
  success: boolean;
  data: {
    file_hash?: string;
    parsing_res_list: ParsingBlock[];
    layout_det_res: Record<string, unknown>;
    markdown: string;
    width?: number;
    height?: number;
    page_count?: number;
    images?: Record<string, string>;
  };
  filename?: string;
}

/**
 * Document record stored in extension (for library list)
 */
export interface DocumentRecord {
  id: string;
  filename: string;
  fileHash: string;
  extractedAt: number;
  blockCount: number;
}

const DOCUMENTS_BASE = `${BACKEND_API_URL.replace("/api/v1", "")}/api/v1/documents`;

/**
 * Build URL for a cached document image.
 * @param imagePath - Format "{file_hash}/{filename}" e.g. "abc123.../block_0.png"
 */
export function getDocumentImageUrl(imagePath: string): string {
  const [fileHash, filename] = imagePath.split("/");
  if (!fileHash || !filename) return "";
  return `${DOCUMENTS_BASE}/imgs/${fileHash}/${filename}`;
}

/**
 * Build URL for images embedded in markdown (from save_to_markdown).
 * Relative paths like "imgs/xxx.jpg" are resolved from markdown_out/.
 */
export function getDocumentMarkdownImageUrl(fileHash: string, relativeSrc: string): string {
  if (!fileHash || !relativeSrc) return "";
  const trimmed = relativeSrc.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  const filename = trimmed.startsWith("markdown_out/") ? trimmed : `markdown_out/${trimmed}`;
  return `${DOCUMENTS_BASE}/imgs/${fileHash}/${filename}`;
}

/**
 * Extract document content (image/PDF) using PaddleOCR
 */
export async function extractDocument(file: File): Promise<DocumentExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BACKEND_API_URL}/documents/extract`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Extraction failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Load cached extraction result by file hash (no re-upload).
 * Use when opening a document from the library.
 */
export async function getCachedDocument(fileHash: string): Promise<DocumentExtractionResult> {
  const response = await fetch(`${BACKEND_API_URL}/documents/${fileHash}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Cache not found or expired. Re-extract the document.");
    }
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Failed to load: ${response.statusText}`);
  }
  return response.json();
}

/** Load document library from backend (Neo4j) */
export async function loadDocumentLibrary(): Promise<DocumentRecord[]> {
  try {
    const profileId = await getProfileId();
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/documents`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to load library: ${response.statusText}`);
    }
    const data = await response.json();
    return (data.documents ?? []).map((d: Record<string, unknown>) => ({
      id: (d.id ?? d.fileHash) as string,
      filename: (d.filename ?? "") as string,
      fileHash: (d.fileHash ?? d.id) as string,
      extractedAt: (d.extractedAt ?? 0) as number,
      blockCount: (d.blockCount ?? 0) as number,
    }));
  } catch (error) {
    console.error("Failed to load document library:", error);
    return [];
  }
}

/** Add a document to the library (Neo4j) */
export async function addDocumentToLibrary(record: {
  fileHash: string;
  filename: string;
  extractedAt: number;
  blockCount?: number;
}): Promise<void> {
  await ensureProfile();
  const profileId = await getProfileId();
  const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_hash: record.fileHash,
      filename: record.filename,
      extracted_at: record.extractedAt,
      block_count: record.blockCount ?? 0,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add document: ${response.statusText}`);
  }
}

/** Remove a document from the library (Neo4j) */
export async function removeDocumentFromLibrary(
  fileHash: string,
  filename?: string
): Promise<void> {
  const profileId = await getProfileId();
  const url = filename
    ? `${BACKEND_API_URL}/profiles/${profileId}/documents/${fileHash}?filename=${encodeURIComponent(filename)}`
    : `${BACKEND_API_URL}/profiles/${profileId}/documents/${fileHash}`;
  const response = await fetch(url, {
    method: "DELETE",
  });
  if (!response.ok) {
    if (response.status === 404) return; // already removed
    throw new Error(`Failed to remove document: ${response.statusText}`);
  }
}

// ---------------------------------------------------------------------------
// Agent tools — filesystem, terminal, python execution
// ---------------------------------------------------------------------------

const TOOLS_BASE = `${BACKEND_API_URL}/tools`;

/** List directory contents relative to the agent workspace. */
export async function toolsListDirectory(path = "."): Promise<{
  path: string;
  entries: Array<{ name: string; is_dir: boolean; size: number }>;
}> {
  const response = await fetch(
    `${TOOLS_BASE}/filesystem/list?path=${encodeURIComponent(path)}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `List failed: ${response.statusText}`);
  }
  return response.json();
}

/** Read a file from the agent workspace. */
export async function toolsReadFile(path: string): Promise<{
  path: string;
  content: string;
  size: number;
}> {
  const response = await fetch(
    `${TOOLS_BASE}/filesystem/read?path=${encodeURIComponent(path)}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Read failed: ${response.statusText}`);
  }
  return response.json();
}

/** Write a file to the agent workspace. */
export async function toolsWriteFile(
  path: string,
  content: string,
  createDirs = true
): Promise<{ path: string; size: number }> {
  const response = await fetch(`${TOOLS_BASE}/filesystem/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, content, create_dirs: createDirs }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Write failed: ${response.statusText}`);
  }
  return response.json();
}

/** Build a direct URL to serve a workspace file (for images, downloads). */
export function toolsFileServeUrl(path: string): string {
  return `${TOOLS_BASE}/filesystem/serve/${encodeURIComponent(path)}`;
}

/** Delete a file from the agent workspace. */
export async function toolsDeleteFile(path: string): Promise<{ deleted: string }> {
  const response = await fetch(
    `${TOOLS_BASE}/filesystem/delete?path=${encodeURIComponent(path)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Delete failed: ${response.statusText}`);
  }
  return response.json();
}

/** Execute a shell command in the agent workspace. */
export async function toolsExecuteCommand(
  command: string,
  options: { cwd?: string; timeout?: number } = {}
): Promise<{
  stdout: string;
  stderr: string;
  exit_code: number;
  elapsed_ms: number;
  timed_out: boolean;
}> {
  const response = await fetch(`${TOOLS_BASE}/terminal/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, cwd: options.cwd, timeout: options.timeout }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Execute failed: ${response.statusText}`);
  }
  return response.json();
}

/** Run inline Python (temp file) or an existing workspace script (use write_file first to persist). */
export type ToolsExecutePythonInput =
  | { code: string; timeout?: number }
  | { scriptPath: string; timeout?: number };

export async function toolsExecutePython(
  input: ToolsExecutePythonInput
): Promise<{
  stdout: string;
  stderr: string;
  exit_code: number;
  elapsed_ms: number;
  timed_out: boolean;
  script_path: string | null;
}> {
  const body =
    "code" in input
      ? { code: input.code, timeout: input.timeout }
      : { script_path: input.scriptPath, timeout: input.timeout };
  const response = await fetch(`${TOOLS_BASE}/python/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || `Python execution failed: ${response.statusText}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Chat conversations
// ---------------------------------------------------------------------------

export interface ChatConversationRecord {
  chatId: string;
  title: string;
  messages: Array<{
    id: string;
    role: "assistant" | "user" | "system";
    content: string;
    name?: string;
    stepItems?: Array<{ id: string; type: string; content: string; toolName?: string }>;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

/** List all chat conversations for the profile */
export async function listChatConversations(): Promise<ChatConversationRecord[]> {
  try {
    const profileId = await getProfileId();
    await ensureProfile();
    const response = await fetch(`${BACKEND_API_URL}/profiles/${profileId}/chats`);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to list chats: ${response.statusText}`);
    }
    const data = await response.json();
    return (data.chats ?? []).map((c: Record<string, unknown>) => ({
      chatId: c.chat_id ?? c.chatId,
      title: (c.title ?? "New chat") as string,
      messages: (c.messages ?? []) as ChatConversationRecord["messages"],
      createdAt: c.created_at ?? c.createdAt,
      updatedAt: c.updated_at ?? c.updatedAt,
    }));
  } catch (error) {
    console.error("Failed to list chat conversations:", error);
    return [];
  }
}

/** Get a single chat conversation by id */
export async function getChatConversation(
  chatId: string
): Promise<ChatConversationRecord | null> {
  try {
    const profileId = await getProfileId();
    const response = await fetch(
      `${BACKEND_API_URL}/profiles/${profileId}/chats/${encodeURIComponent(chatId)}`
    );
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get chat: ${response.statusText}`);
    }
    const c = await response.json();
    return {
      chatId: c.chat_id ?? c.chatId,
      title: (c.title ?? "New chat") as string,
      messages: (c.messages ?? []) as ChatConversationRecord["messages"],
      createdAt: c.created_at ?? c.createdAt,
      updatedAt: c.updated_at ?? c.updatedAt,
    };
  } catch (error) {
    console.error("Failed to get chat conversation:", error);
    return null;
  }
}

/** Create a new chat conversation */
export async function createChatConversation(
  chatId: string,
  title: string,
  messages: ChatConversationRecord["messages"]
): Promise<{ chatId: string }> {
  await ensureProfile();
  const profileId = await getProfileId();
  const response = await fetch(
    `${BACKEND_API_URL}/profiles/${profileId}/chats`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        title,
        messages,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to create chat: ${response.statusText}`);
  }
  const data = await response.json();
  return { chatId: data.chatId ?? chatId };
}

/** Update an existing chat conversation */
export async function updateChatConversation(
  chatId: string,
  updates: { title?: string; messages?: ChatConversationRecord["messages"] }
): Promise<void> {
  const profileId = await getProfileId();
  const response = await fetch(
    `${BACKEND_API_URL}/profiles/${profileId}/chats/${encodeURIComponent(chatId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updates.title,
        messages: updates.messages,
      }),
    }
  );
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Chat not found");
    }
    throw new Error(`Failed to update chat: ${response.statusText}`);
  }
}

/** Delete a chat conversation */
export async function deleteChatConversation(chatId: string): Promise<void> {
  const profileId = await getProfileId();
  const response = await fetch(
    `${BACKEND_API_URL}/profiles/${profileId}/chats/${encodeURIComponent(chatId)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    if (response.status === 404) return; // already removed
    throw new Error(`Failed to delete chat: ${response.statusText}`);
  }
}

