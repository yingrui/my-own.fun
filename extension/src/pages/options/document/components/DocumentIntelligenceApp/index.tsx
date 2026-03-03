import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Layout, List, Segmented, Tooltip } from "antd";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import {
  DeleteOutlined,
  FileAddOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import {
  extractDocument,
  getCachedDocument,
  getDocumentImageUrl,
  getDocumentMarkdownImageUrl,
  loadDocumentLibrary,
  addDocumentToLibrary,
  removeDocumentFromLibrary,
  checkBackendHealth,
  BACKEND_BASE_URL,
  type DocumentExtractionResult,
  type DocumentRecord,
} from "@src/shared/services/backendApi";
import intl from "react-intl-universal";
import "katex/dist/katex.min.css";
import "./index.css";

const { Sider, Header, Content } = Layout;

const DocumentIntelligenceApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [library, setLibrary] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const [markdownView, setMarkdownView] = useState<"preview" | "raw">("preview");
  const [siderCollapsed, setSiderCollapsed] = useState(false);
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

  // Images: only from data.images, in order (layout_det_res_0, layout_det_res_1, ...)
  const imageEntries: Array<{ label: string; path: string }> = [];
  const imagesObj = data?.images as Record<string, string> | undefined;
  if (imagesObj) {
    const entries = Object.entries(imagesObj)
      .filter(([, path]) => !!path)
      .sort(([a], [b]) => {
        const numA = parseInt(a.replace(/\D+/g, ""), 10) ?? 0;
        const numB = parseInt(b.replace(/\D+/g, ""), 10) ?? 0;
        return numA - numB;
      });
    entries.forEach(([key, path]) => {
      imageEntries.push({ label: key, path });
    });
  }

  return (
    <Layout className="document-intelligence-app">
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.bmp,.gif,.webp,.pdf"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* Left Sider: Document list (like WriterSider) */}
      <Sider
        id="document-intel-left-sider"
        width={300}
        collapsedWidth={64}
        style={{ height: "auto" }}
        trigger={null}
        collapsible
        collapsed={siderCollapsed}
      >
        <div className="document-intel-sider-header">
          <Button
            type="text"
            icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSiderCollapsed(!siderCollapsed)}
            style={{ fontSize: "16px", width: 64, height: 64 }}
          />
          {!siderCollapsed && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={handleExtractClick}
              loading={loading}
              disabled={backendAvailable === false}
            >
              {intl.get("document_intel_add_file").d("Add file")}
            </Button>
          )}
        </div>
        <div className="document-intel-sider-body" style={{ display: siderCollapsed ? "none" : "block" }}>
          <List
            size="small"
            dataSource={library}
            locale={{ emptyText: intl.get("document_intel_list_empty").d("No documents yet. Add a file to get started.") }}
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
        </div>
      </Sider>

      {/* Main content: images | markdown split (like WriterEditor) */}
      <Layout className="document-intel-main">
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
          <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ margin: "0 16px 12px" }} />
        )}

        {data ? (
          <>
            <Header className="document-intel-header">
              <span className="doc-title">
                {result?.filename ?? library.find((d) => d.id === selectedId)?.filename ?? "Document"}
              </span>
              {data.markdown && (
                <Button type="link" size="small" onClick={handleCopyMarkdown}>
                  {intl.get("document_intel_copy_md").d("Copy Markdown")}
                </Button>
              )}
            </Header>
            <Content className="document-intel-content">
              <div className="document-review-split">
                <div className="document-review-images">
                  <div className="document-review-images-header">
                    <PictureOutlined />
                    <span>{intl.get("document_intel_tab_images").d("Images")}</span>
                  </div>
                  <div className="document-review-images-list">
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
                </div>
                <div className="document-review-markdown">
                  <div className="document-review-markdown-header">
                    <FileTextOutlined />
                    <span>{intl.get("document_intel_tab_markdown").d("Markdown")}</span>
                    <Segmented
                      value={markdownView}
                      onChange={(v) => setMarkdownView(v as "preview" | "raw")}
                      options={[
                        { label: intl.get("document_intel_md_preview").d("Preview"), value: "preview" },
                        { label: intl.get("document_intel_md_raw").d("Raw"), value: "raw" },
                      ]}
                      size="small"
                      style={{ marginLeft: "auto" }}
                    />
                  </div>
                  <div className="document-markdown-tab">
                    {markdownView === "preview" ? (
                      <div className="document-markdown-preview">
                        {data.markdown ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                            components={{
                              img: ({ src, alt, ...props }) => {
                                const fileHash = data?.file_hash ?? "";
                                const resolvedSrc = fileHash && src
                                  ? getDocumentMarkdownImageUrl(fileHash, src)
                                  : src;
                                return <img src={resolvedSrc} alt={alt ?? ""} {...props} />;
                              },
                            }}
                          >
                            {data.markdown}
                          </ReactMarkdown>
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
                </div>
              </div>
            </Content>
          </>
        ) : (
          <Content className="document-intel-content document-review-empty">
            {library.length === 0 ? (
              <p>{intl.get("document_intel_select_or_add").d("Add a file to extract, or select one from the list.")}</p>
            ) : (
              <p>{intl.get("document_intel_select_doc").d("Select a document from the list to review.")}</p>
            )}
          </Content>
        )}
      </Layout>
    </Layout>
  );
};

export default DocumentIntelligenceApp;
