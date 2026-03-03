import React, { useRef, useState } from "react";
import { Alert, Button, Card, Space } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import {
  extractDocument,
  checkBackendHealth,
  BACKEND_BASE_URL,
  type DocumentExtractionResult,
} from "@src/shared/services/backendApi";
import intl from "react-intl-universal";
import "./index.css";

const DocumentIntelligenceApp: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExtractionResult | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCheckBackend = async () => {
    const available = await checkBackendHealth();
    setBackendAvailable(available);
  };

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
    setResult(null);
    setLoading(true);

    try {
      const data = await extractDocument(file);
      setResult(data);
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

  const handleCopyMarkdown = () => {
    if (result?.data?.markdown) {
      navigator.clipboard.writeText(result.data.markdown);
    }
  };

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
            .d("Extract text and structure from local images or PDFs using PaddleOCR. Select a file to get started.")}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.bmp,.gif,.webp,.pdf"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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

          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={handleExtractClick}
            loading={loading}
            disabled={backendAvailable === false}
          >
            {loading
              ? intl.get("document_intel_extracting").d("Extracting…")
              : intl.get("document_intel_select_extract").d("Select & Extract")}
          </Button>

          {error && (
            <Alert type="error" message={error} closable onClose={() => setError(null)} />
          )}

          {result?.data && (
            <Card
              size="small"
              title={
                <Space>
                  <span>
                    {result.filename} — {result.data.parsing_res_list?.length ?? 0}{" "}
                    {intl.get("document_intel_blocks").d("blocks")}
                  </span>
                  {result.data.markdown && (
                    <Button type="link" size="small" onClick={handleCopyMarkdown}>
                      {intl.get("document_intel_copy_md").d("Copy Markdown")}
                    </Button>
                  )}
                </Space>
              }
            >
              <pre className="document-intelligence-markdown">
                {result.data.markdown || intl.get("document_intel_no_text").d("(No text extracted)")}
              </pre>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default DocumentIntelligenceApp;
