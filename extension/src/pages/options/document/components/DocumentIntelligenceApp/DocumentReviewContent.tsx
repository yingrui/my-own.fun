import React from "react";
import { Button, Card, Layout, Segmented } from "antd";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { FileTextOutlined, PictureOutlined } from "@ant-design/icons";
import intl from "react-intl-universal";
import {
  getDocumentImageUrl,
  getDocumentMarkdownImageUrl,
} from "@src/shared/services/backendApi";
import type { ParsingBlock } from "@src/shared/services/backendApi";
import { getBoxesOnPage, type LayoutPageEntry } from "../../utils";
import ImageWithBoxes from "./ImageWithBoxes";
import type { KatexOptions } from "katex";

const { Header, Content } = Layout;

/** Output HTML only so LaTeX source is not shown alongside rendered formula */
const katexOptions: KatexOptions = { output: "html" };

export interface DocumentReviewContentProps {
  documentTitle: string;
  data: {
    file_hash?: string;
    markdown?: string;
    [key: string]: unknown;
  };
  blocks: ParsingBlock[];
  layoutPageEntries: LayoutPageEntry[];
  imgWidth: number;
  imgHeight: number;
  selectedBlockIndex: number | null;
  markdownView: "preview" | "raw";
  selectedBlockImagePath: string | null;
  displayContent: string;
  onCopyMarkdown: () => void;
  onSelectBlock: (index: number | null) => void;
  onMarkdownViewChange: (view: "preview" | "raw") => void;
}

const DocumentReviewContent: React.FC<DocumentReviewContentProps> = ({
  documentTitle,
  data,
  blocks,
  layoutPageEntries,
  imgWidth,
  imgHeight,
  selectedBlockIndex,
  markdownView,
  selectedBlockImagePath,
  displayContent,
  onCopyMarkdown,
  onSelectBlock,
  onMarkdownViewChange,
}) => {
  const fileHash = data?.file_hash ?? "";

  const markdownImgComponent = {
    img: ({ src, alt, ...props }: React.ComponentProps<"img">) => {
      const resolvedSrc =
        fileHash && src ? getDocumentMarkdownImageUrl(fileHash, src) : src;
      return <img src={resolvedSrc} alt={alt ?? ""} {...props} />;
    },
  };

  return (
    <>
      <Header className="document-intel-header">
        <span className="doc-title">{documentTitle}</span>
        {data.markdown && (
          <Button type="link" size="small" onClick={onCopyMarkdown}>
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
              {layoutPageEntries.length > 0 ? (
                layoutPageEntries.map((entry) => {
                  const boxesOnPage = getBoxesOnPage(entry, blocks);
                  const imagePath = entry.imagePath;
                  if (!imagePath) return null;
                  return (
                    <Card
                      key={entry.pageIndex}
                      size="small"
                      title={entry.label}
                      className="document-image-card"
                    >
                      <ImageWithBoxes
                        src={getDocumentImageUrl(imagePath)}
                        alt={entry.label}
                        imgWidth={imgWidth}
                        imgHeight={imgHeight}
                        boxesOnPage={boxesOnPage}
                        selectedBlockIndex={selectedBlockIndex}
                        onBlockClick={onSelectBlock}
                      />
                    </Card>
                  );
                })
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
              {selectedBlockIndex !== null && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => onSelectBlock(null)}
                  style={{ marginLeft: 8 }}
                >
                  {intl.get("document_intel_show_full").d("Show full document")}
                </Button>
              )}
              <Segmented
                value={markdownView}
                onChange={(v) => onMarkdownViewChange(v as "preview" | "raw")}
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
                size="small"
                style={{ marginLeft: "auto" }}
              />
            </div>
            <div className="document-markdown-tab">
              {markdownView === "preview" ? (
                <div className="document-markdown-preview">
                  {selectedBlockImagePath ? (
                    <div className="document-selected-block-image">
                      <img
                        src={getDocumentImageUrl(selectedBlockImagePath)}
                        alt={
                          blocks[selectedBlockIndex!]?.label ??
                          intl.get("document_intel_block_image").d("Block image")
                        }
                        className="document-block-image-preview"
                      />
                      {displayContent ? (
                        <div className="document-block-image-caption">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
                            components={markdownImgComponent}
                          >
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                      ) : null}
                    </div>
                  ) : displayContent ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkMath, remarkGfm]}
                      rehypePlugins={[rehypeRaw, [rehypeKatex, katexOptions]]}
                      components={markdownImgComponent}
                    >
                      {displayContent}
                    </ReactMarkdown>
                  ) : (
                    <p className="document-list-empty">
                      {intl.get("document_intel_no_text").d("(No text extracted)")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {selectedBlockImagePath && (
                    <div className="document-selected-block-image document-raw-image">
                      <img
                        src={getDocumentImageUrl(selectedBlockImagePath)}
                        alt={
                          blocks[selectedBlockIndex!]?.label ??
                          intl.get("document_intel_block_image").d("Block image")
                        }
                        className="document-block-image-preview"
                      />
                    </div>
                  )}
                  {(displayContent || !selectedBlockImagePath) && (
                    <pre className="document-intelligence-markdown">
                      {displayContent ||
                        intl.get("document_intel_no_text").d("(No text extracted)")}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Content>
    </>
  );
};

export default DocumentReviewContent;
