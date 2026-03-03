import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, List, Segmented, Space, Tabs, Tag, Tooltip } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DeleteOutlined,
  FileAddOutlined,
  FileTextOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import {
  extractDocument,
  getCachedDocument,
  getDocumentImageUrl,
  loadDocumentLibrary,
  addDocumentToLibrary,
  removeDocumentFromLibrary,
  checkBackendHealth,
  BACKEND_BASE_URL,
  type DocumentExtractionResult,
  type DocumentRecord,
} from "@src/shared/services/backendApi";
import intl from "react-intl-universal";
import "./index.css";

const DocumentIntelligenceApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [library, setLibrary] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState("blocks");
  const [markdownView, setMarkdownView] = useState<"preview" | "raw">("preview");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibrary = useCallback(async () => {
    const list = await loadDocumentLibrary();
    setLibrary(list);
  }, []);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleCheckBackend = async () => {
    const available = await checkBackendHealth();
    setBackendAvailable(available);
  };

  const addToLibrary = useCallback(
    async (res: DocumentExtractionResult, filename: string) => {
      const fileHash = res.data?.file_hash ?? (res.data as Record<string, unknown>)?.fileHash;
      if (!fileHash) {
        console.warn("Document extraction result missing file_hash, cannot add to library", res);
        return;
      }

      const blockCount = res.data?.parsing_res_list?.length ?? 0;
      const extractedAt = Date.now();
      const id = filename ? `${fileHash}|${filename}` : fileHash;
      const record: DocumentRecord = {
        id,
        filename,
        fileHash,
        extractedAt,
        blockCount,
      };

      const existing = library.find(
        (d) => d.fileHash === fileHash && d.filename === filename
      );
      const next = existing
        ? library.map((d) =>
            d.fileHash === fileHash && d.filename === filename ? record : d
          )
        : [record, ...library];
      setLibrary(next);
      setSelectedId(record.id);

      await addDocumentToLibrary({
        fileHash,
        filename,
        extractedAt,
        blockCount,
      });
    },
    [library]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            addErr instanceof Error ? addErr.message : intl.get("document_intel_add_to_library_failed").d("Extraction succeeded but failed to save to library")
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : intl.get("document_intel_extract_failed").d("Extraction failed")
      );
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleExtractClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectDocument = async (rec: DocumentRecord) => {
    setError(null);
    setLoading(true);
    setSelectedId(rec.id);
    try {
      const res = await getCachedDocument(rec.fileHash);
      setResult(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : intl.get("document_intel_load_failed").d("Failed to load document")
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, rec: DocumentRecord) => {
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
  };

  const handleCopyMarkdown = () => {
    if (result?.data?.markdown) {
      navigator.clipboard.writeText(result.data.markdown);
    }
  };

  const data = result?.data;
  const blocks = data?.parsing_res_list ?? [];

  // Collect all images: input, layout result, block images
  const imageEntries: Array<{ label: string; path: string }> = [];
  if (data) {
    const addFromLayout = (layout: Record<string, unknown>, prefix = "") => {
      if (layout?.input_img && typeof layout.input_img === "string") {
        imageEntries.push({ label: prefix ? `${prefix} - Input image` : "Input image", path: layout.input_img });
      }
      const layoutImages = layout?._images as Record<string, string> | undefined;
      if (layoutImages) {
        Object.entries(layoutImages).forEach(([k, path]) => {
          if (path) imageEntries.push({ label: prefix ? `${prefix} - Layout (${k})` : `Layout detection (${k})`, path });
        });
      }
    };
    const layout = data.layout_det_res;
    if (Array.isArray(layout)) {
      layout.forEach((item, i) => addFromLayout(item as Record<string, unknown>, `Page ${i + 1}`));
    } else if (layout && typeof layout === "object") {
      addFromLayout(layout);
    }
    const topImages = data.images as Record<string, string> | undefined;
    if (topImages) {
      Object.entries(topImages).forEach(([k, path]) => {
        if (path) imageEntries.push({ label: `Result (${k})`, path });
      });
    }
    blocks.forEach((block, idx) => {
      if (block.image_path) {
        imageEntries.push({
          label: `Block ${idx + 1} (${block.label})`,
          path: block.image_path,
        });
      }
    });
  }

  return (
    <div className="document-intelligence-app">
      <Card
        title={
          <Space>
            <FileTextOutlined />
            {intl.get("document_intel_title").d("Document Intelligence")}
          </Space>
        }
        className="document-intelligence-card"
      >
        <p className="document-intelligence-desc">
          {intl
            .get("document_intel_desc")
            .d("Extract text and structure from local images or PDFs. Add a file, then review blocks or markdown.")}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.bmp,.gif,.webp,.pdf"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <div className="document-intelligence-layout">
          {/* Left: Document list */}
          <div className="document-intelligence-sidebar">
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={handleExtractClick}
              loading={loading}
              disabled={backendAvailable === false}
              block
            >
              {intl.get("document_intel_add_file").d("Add file")}
            </Button>
            <List
              size="small"
              dataSource={library}
              renderItem={(rec) => (
                <List.Item
                  className={`document-list-item ${selectedId === rec.id ? "selected" : ""}`}
                  onClick={() => handleSelectDocument(rec)}
                >
                  <div className="document-list-item-content">
                    <FileTextOutlined className="doc-icon" />
                    <span className="doc-filename" title={rec.filename}>
                      {rec.filename}
                    </span>
                    <span className="doc-meta">{rec.blockCount} blocks</span>
                  </div>
                  <Tooltip title={intl.get("document_intel_delete").d("Remove from list")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteDocument(e, rec)}
                    />
                  </Tooltip>
                </List.Item>
              )}
            />
            {library.length === 0 && (
              <p className="document-list-empty">
                {intl.get("document_intel_list_empty").d("No documents yet. Add a file to get started.")}
              </p>
            )}
          </div>

          {/* Right: Review panel */}
          <div className="document-intelligence-main">
            {backendAvailable === false && (
              <Alert
                type="warning"
                message={intl.get("document_intel_backend_warning").d("Backend not available")}
                description={intl
                  .get("document_intel_backend_hint", { url: BACKEND_BASE_URL })
                  .d(`Ensure the backend is running at ${BACKEND_BASE_URL}`)}
                action={
                  <Button size="small" onClick={handleCheckBackend}>
                    {intl.get("document_intel_retry").d("Retry")}
                  </Button>
                }
              />
            )}

            {error && (
              <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />
            )}

            {data ? (
              <>
                <div className="document-review-header">
                  <span className="doc-title">
                    {result?.filename ?? library.find((d) => d.id === selectedId)?.filename ?? "Document"}
                  </span>
                  {data.markdown && (
                    <Button type="link" size="small" onClick={handleCopyMarkdown}>
                      {intl.get("document_intel_copy_md").d("Copy Markdown")}
                    </Button>
                  )}
                </div>

                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                    {
                      key: "blocks",
                      label: (
                        <span>
                          <FileTextOutlined /> {intl.get("document_intel_tab_blocks").d("Blocks")}
                        </span>
                      ),
                      children: (
                        <div className="document-blocks-tab">
                          <List
                            size="small"
                            dataSource={blocks}
                            renderItem={(block, idx) => (
                              <List.Item key={idx} className="block-item">
                                <div className="block-content">
                                  <Tag color="blue">{block.label}</Tag>
                                  {block.content ? (
                                    <span className="block-text">{block.content}</span>
                                  ) : block.image_path ? (
                                    <div className="block-image-wrap">
                                      <img
                                        src={getDocumentImageUrl(block.image_path)}
                                        alt=""
                                        className="block-thumb"
                                      />
                                    </div>
                                  ) : (
                                    <span className="block-empty">(empty)</span>
                                  )}
                                </div>
                              </List.Item>
                            )}
                          />
                        </div>
                      ),
                    },
                    {
                      key: "markdown",
                      label: (
                        <span>
                          <FileTextOutlined /> {intl.get("document_intel_tab_markdown").d("Markdown")}
                        </span>
                      ),
                      children: (
                        <div className="document-markdown-tab">
                          <Segmented
                            value={markdownView}
                            onChange={(v) => setMarkdownView(v as "preview" | "raw")}
                            options={[
                              {
                                label: intl.get("document_intel_md_preview").d("Preview"),
                                value: "preview",
                              },
                              {
                                label: intl.get("document_intel_md_raw").d("Raw"),
                                value: "raw",
                              },
                            ]}
                            style={{ marginBottom: 12 }}
                          />
                          {markdownView === "preview" ? (
                            <div className="document-markdown-preview">
                              {data.markdown ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.markdown}</ReactMarkdown>
                              ) : (
                                <p className="document-list-empty">
                                  {intl.get("document_intel_no_text").d("(No text extracted)")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <pre className="document-intelligence-markdown">
                              {data.markdown || intl.get("document_intel_no_text").d("(No text extracted)")}
                            </pre>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "images",
                      label: (
                        <span>
                          <PictureOutlined /> {intl.get("document_intel_tab_images").d("Images")}
                        </span>
                      ),
                      children: (
                        <div className="document-images-tab">
                          {imageEntries.length > 0 ? (
                            imageEntries.map(({ label, path }, i) => (
                              <Card key={i} size="small" title={label} className="document-image-card">
                                <img src={getDocumentImageUrl(path)} alt={label} />
                              </Card>
                            ))
                          ) : (
                            <p className="document-list-empty">
                              {intl.get("document_intel_no_images").d("No images available.")}
                            </p>
                          )}
                        </div>
                      ),
                    },
                  ]}
                />
              </>
            ) : (
              <div className="document-review-empty">
                {library.length === 0 ? (
                  <p>{intl.get("document_intel_select_or_add").d("Add a file to extract, or select one from the list.")}</p>
                ) : (
                  <p>{intl.get("document_intel_select_doc").d("Select a document from the list to review.")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DocumentIntelligenceApp;
