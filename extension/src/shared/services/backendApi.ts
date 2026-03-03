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
 * Document extraction result from PaddleOCR
 */
export interface DocumentExtractionResult {
  success: boolean;
  data: {
    parsing_res_list: Array<{
      label: string;
      content: string;
      bbox: number[];
    }>;
    layout_det_res: Record<string, unknown>;
    markdown: string;
    width?: number;
    height?: number;
    page_count?: number;
  };
  filename?: string;
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

