import React from "react";
import { Button, Layout, List, Tooltip } from "antd";
import {
  DeleteOutlined,
  FileAddOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import intl from "react-intl-universal";
import type { DocumentRecord } from "@src/shared/services/backendApi";

const { Sider } = Layout;

export interface DocumentSiderProps {
  library: DocumentRecord[];
  selectedId: string | null;
  siderCollapsed: boolean;
  loading: boolean;
  backendAvailable: boolean | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSiderToggle: () => void;
  onExtractClick: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectDocument: (rec: DocumentRecord) => void;
  onDeleteDocument: (e: React.MouseEvent, rec: DocumentRecord) => void;
}

const DocumentSider: React.FC<DocumentSiderProps> = ({
  library,
  selectedId,
  siderCollapsed,
  loading,
  backendAvailable,
  fileInputRef,
  onSiderToggle,
  onExtractClick,
  onFileSelect,
  onSelectDocument,
  onDeleteDocument,
}) => (
  <Sider
    id="document-intel-left-sider"
    width={300}
    collapsedWidth={64}
    style={{ height: "auto" }}
    trigger={null}
    collapsible
    collapsed={siderCollapsed}
  >
    <input
      ref={fileInputRef}
      type="file"
      accept=".png,.jpg,.jpeg,.bmp,.gif,.webp,.pdf,.pptx,.ppt"
      onChange={onFileSelect}
      style={{ display: "none" }}
    />
    <div className="document-intel-sider-header">
      <Button
        type="text"
        icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onSiderToggle}
        style={{ fontSize: "16px", width: 64, height: 64 }}
      />
      {!siderCollapsed && (
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          onClick={onExtractClick}
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
        locale={{
          emptyText: intl.get("document_intel_list_empty").d("No documents yet. Add a file to get started."),
        }}
        renderItem={(rec) => (
          <List.Item
            className={`document-list-item ${selectedId === rec.id ? "selected" : ""}`}
            onClick={() => onSelectDocument(rec)}
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
                onClick={(e) => onDeleteDocument(e, rec)}
              />
            </Tooltip>
          </List.Item>
        )}
      />
    </div>
  </Sider>
);

export default DocumentSider;
