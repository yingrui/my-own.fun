import { useCallback, useEffect, useRef, useState } from "react";
import intl from "react-intl-universal";
import {
  addDocumentToLibrary,
  checkBackendHealth,
  extractDocument,
  getCachedDocument,
  loadDocumentLibrary,
  removeDocumentFromLibrary,
  type DocumentExtractionResult,
  type DocumentRecord,
} from "@src/shared/services/backendApi";
import { BACKEND_BASE_URL } from "@src/shared/services/backendApi";

export function useDocumentIntelligence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [library, setLibrary] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [markdownView, setMarkdownView] = useState<"preview" | "raw">("preview");
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    const list = await loadDocumentLibrary();
    setLibrary(list);
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleCheckBackend = useCallback(async () => {
    const available = await checkBackendHealth();
    setBackendAvailable(available);
  }, []);

  const addToLibrary = useCallback(
    async (res: DocumentExtractionResult, filename: string) => {
      const fileHash =
        res.data?.file_hash ?? (res.data as Record<string, unknown>)?.fileHash;
      if (!fileHash) return;

      const blockCount = res.data?.parsing_res_list?.length ?? 0;
      const extractedAt = Date.now();
      const hash = String(fileHash);
      const id = filename ? `${hash}|${filename}` : hash;
      const record: DocumentRecord = {
        id,
        filename,
        fileHash: hash,
        extractedAt,
        blockCount,
      };

      const existing = library.find(
        (d) => d.fileHash === hash && d.filename === filename
      );
      const next = existing
        ? library.map((d) =>
            d.fileHash === hash && d.filename === filename ? record : d
          )
        : [record, ...library];
      setLibrary(next);
      setSelectedId(record.id);

      await addDocumentToLibrary({
        fileHash: hash,
        filename,
        extractedAt,
        blockCount,
      });
    },
    [library]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (backendAvailable === null) {
        const available = await checkBackendHealth();
        setBackendAvailable(available);
        if (!available) {
          setError(
            intl
              .get("document_intel_backend_unavailable", { url: BACKEND_BASE_URL })
              .d(`Backend not available. Start the backend at ${BACKEND_BASE_URL}`)
          );
          return;
        }
      }

      setError(null);
      setLoading(true);

      try {
        const res = await extractDocument(file);
        if (res.success && res.data) {
          setResult(res);
          try {
            await addToLibrary(res, file.name);
          } catch (addErr) {
            console.error("Failed to add document to library:", addErr);
            setError(
              addErr instanceof Error
                ? addErr.message
                : intl.get("document_intel_add_to_library_failed").d("Extraction succeeded but failed to save to library")
            );
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : intl.get("document_intel_extract_failed").d("Extraction failed")
        );
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    },
    [backendAvailable, addToLibrary]
  );

  const handleExtractClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSelectDocument = useCallback(async (rec: DocumentRecord) => {
    setError(null);
    setLoading(true);
    setSelectedId(rec.id);
    try {
      const res = await getCachedDocument(rec.fileHash);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : intl.get("document_intel_load_failed").d("Failed to load document")
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteDocument = useCallback(
    async (e: React.MouseEvent, rec: DocumentRecord) => {
      e.stopPropagation();
      try {
        await removeDocumentFromLibrary(rec.fileHash, rec.filename);
        const next = library.filter((d) => d.id !== rec.id);
        setLibrary(next);
        if (selectedId === rec.id) {
          setSelectedId(null);
          setResult(null);
        }
      } catch (err) {
        console.error("Failed to remove document:", err);
      }
    },
    [library, selectedId]
  );

  return {
    loading,
    error,
    setError,
    result,
    library,
    selectedId,
    backendAvailable,
    markdownView,
    setMarkdownView,
    siderCollapsed,
    setSiderCollapsed,
    selectedBlockIndex,
    setSelectedBlockIndex,
    fileInputRef,
    handleCheckBackend,
    handleFileSelect,
    handleExtractClick,
    handleSelectDocument,
    handleDeleteDocument,
  };
}
