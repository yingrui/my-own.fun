import React, { useEffect, useMemo } from "react";
import { Alert, Button, Layout } from "antd";
import intl from "react-intl-universal";
import { BACKEND_BASE_URL } from "@src/shared/services/backendApi";
import type { ParsingBlock } from "@src/shared/services/backendApi";
import { useDocumentIntelligence } from "../../hooks";
import { getLayoutPageEntries } from "../../utils";
import DocumentReviewContent from "./DocumentReviewContent";
import DocumentSider from "./DocumentSider";
import "katex/dist/katex.min.css";
import "./index.css";

const { Content } = Layout;

const DocumentIntelligenceApp: React.FC = () => {
  const {
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
  } = useDocumentIntelligence();

  const data = result?.data;
  const blocks = (data?.parsing_res_list as ParsingBlock[] | undefined) ?? [];
  const layoutDetResRaw = data?.layout_det_res;
  const layoutDetRes = Array.isArray(layoutDetResRaw) ? layoutDetResRaw : undefined;
  const imagesObj = data?.images as Record<string, string> | undefined;

  const layoutPageEntries = useMemo(
    () => getLayoutPageEntries(layoutDetRes, imagesObj, blocks.length),
    [layoutDetRes, imagesObj, blocks.length]
  );

  const imgWidth = (data?.width as number | undefined) ?? 1088;
  const imgHeight = (data?.height as number | undefined) ?? 1486;

  const documentTitle =
    result?.filename ??
    library.find((d) => d.id === selectedId)?.filename ??
    "Document";

  const displayContent = useMemo(() => {
    if (selectedBlockIndex !== null && blocks[selectedBlockIndex]) {
      return blocks[selectedBlockIndex].content || "";
    }
    return data?.markdown ?? "";
  }, [selectedBlockIndex, blocks, data?.markdown]);

  const selectedBlockImagePath =
    selectedBlockIndex !== null && blocks[selectedBlockIndex]?.image_path
      ? blocks[selectedBlockIndex].image_path!
      : null;

  const handleCopyMarkdown = () => {
    const toCopy =
      selectedBlockIndex !== null && blocks[selectedBlockIndex]
        ? blocks[selectedBlockIndex].content
        : result?.data?.markdown;
    if (toCopy) {
      navigator.clipboard.writeText(toCopy);
    }
  };

  useEffect(() => {
    setSelectedBlockIndex(null);
  }, [selectedId, setSelectedBlockIndex]);

  return (
    <Layout className="document-intelligence-app">
      <DocumentSider
        library={library}
        selectedId={selectedId}
        siderCollapsed={siderCollapsed}
        loading={loading}
        backendAvailable={backendAvailable}
        fileInputRef={fileInputRef}
        onSiderToggle={() => setSiderCollapsed(!siderCollapsed)}
        onExtractClick={handleExtractClick}
        onFileSelect={handleFileSelect}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
      />

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
          <Alert
            type="error"
            message={error}
            closable
            onClose={() => setError(null)}
            style={{ margin: "0 16px 12px" }}
          />
        )}

        {data ? (
          <DocumentReviewContent
            documentTitle={documentTitle}
            data={data}
            blocks={blocks}
            layoutPageEntries={layoutPageEntries}
            imgWidth={imgWidth}
            imgHeight={imgHeight}
            selectedBlockIndex={selectedBlockIndex}
            markdownView={markdownView}
            selectedBlockImagePath={selectedBlockImagePath}
            displayContent={displayContent}
            onCopyMarkdown={handleCopyMarkdown}
            onSelectBlock={setSelectedBlockIndex}
            onMarkdownViewChange={setMarkdownView}
          />
        ) : (
          <Content className="document-intel-content document-review-empty">
            {library.length === 0 ? (
              <p>
                {intl
                  .get("document_intel_select_or_add")
                  .d("Add a file to extract, or select one from the list.")}
              </p>
            ) : (
              <p>
                {intl
                  .get("document_intel_select_doc")
                  .d("Select a document from the list to review.")}
              </p>
            )}
          </Content>
        )}
      </Layout>
    </Layout>
  );
};

export default DocumentIntelligenceApp;
