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

