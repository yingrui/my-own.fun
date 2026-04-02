import React, { useCallback, useEffect, useState } from "react";
import { Breadcrumb, Button, Empty, Spin, Typography } from "antd";
import {
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FolderOutlined,
  HomeOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import {
  toolsListDirectory,
  toolsReadFile,
  toolsFileServeUrl,
} from "@src/shared/services/backendApi";
import style from "./index.module.scss";

interface FileEntry {
  name: string;
  is_dir: boolean;
  size: number;
}

interface PreviewState {
  name: string;
  path: string;
  type: "text" | "image" | "unsupported";
  content?: string;
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"]);
const TEXT_EXTS = new Set([
  ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".csv", ".md", ".txt",
  ".html", ".css", ".xml", ".yaml", ".yml", ".toml", ".sh", ".bash",
  ".sql", ".r", ".java", ".c", ".cpp", ".h", ".go", ".rs", ".rb",
  ".env", ".cfg", ".ini", ".log",
]);

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function getFileIcon(entry: FileEntry) {
  if (entry.is_dir) return <FolderOutlined style={{ color: "#faad14" }} />;
  const ext = getExt(entry.name);
  if (IMAGE_EXTS.has(ext)) return <FileImageOutlined style={{ color: "#1890ff" }} />;
  if (ext === ".pdf") return <FilePdfOutlined style={{ color: "#ff4d4f" }} />;
  if (TEXT_EXTS.has(ext)) return <FileTextOutlined style={{ color: "#52c41a" }} />;
  return <FileOutlined />;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pathSegments(p: string): string[] {
  return p.split("/").filter(Boolean);
}

const WorkspacePanel: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(".");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await toolsListDirectory(path);
      setEntries(result.entries);
      setCurrentPath(path);
      setPreview(null);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(".");
  }, [loadDirectory]);

  const handleEntryClick = useCallback(
    async (entry: FileEntry) => {
      const entryPath = currentPath === "." ? entry.name : `${currentPath}/${entry.name}`;

      if (entry.is_dir) {
        loadDirectory(entryPath);
        return;
      }

      const ext = getExt(entry.name);

      if (IMAGE_EXTS.has(ext)) {
        setPreview({ name: entry.name, path: entryPath, type: "image" });
        return;
      }

      if (TEXT_EXTS.has(ext) || entry.size < 500_000) {
        setPreviewLoading(true);
        try {
          const result = await toolsReadFile(entryPath);
          setPreview({ name: entry.name, path: entryPath, type: "text", content: result.content });
        } catch {
          setPreview({ name: entry.name, path: entryPath, type: "unsupported" });
        } finally {
          setPreviewLoading(false);
        }
        return;
      }

      setPreview({ name: entry.name, path: entryPath, type: "unsupported" });
    },
    [currentPath, loadDirectory],
  );

  const handleNavigateUp = useCallback(() => {
    if (preview) {
      setPreview(null);
      return;
    }
    const segments = pathSegments(currentPath);
    if (segments.length === 0) return;
    segments.pop();
    loadDirectory(segments.length === 0 ? "." : segments.join("/"));
  }, [currentPath, preview, loadDirectory]);

  const breadcrumbItems = [
    {
      title: (
        <span onClick={() => { setPreview(null); loadDirectory("."); }} style={{ cursor: "pointer" }}>
          <HomeOutlined /> workspace
        </span>
      ),
    },
    ...pathSegments(currentPath).map((seg, i, arr) => ({
      title: (
        <span
          onClick={() => {
            setPreview(null);
            loadDirectory(arr.slice(0, i + 1).join("/"));
          }}
          style={{ cursor: "pointer" }}
        >
          {seg}
        </span>
      ),
    })),
    ...(preview ? [{ title: <span>{preview.name}</span> }] : []),
  ];

  if (preview) {
    return (
      <div className={style.panel}>
        <div className={style.header}>
          <div className={style.headerLeft}>
            <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={handleNavigateUp} />
            <Breadcrumb items={breadcrumbItems} className={style.breadcrumb} />
          </div>
        </div>
        <div className={style.previewArea}>
          {previewLoading ? (
            <div className={style.centered}><Spin /></div>
          ) : preview.type === "image" ? (
            <img
              src={toolsFileServeUrl(preview.path)}
              alt={preview.name}
              className={style.imagePreview}
            />
          ) : preview.type === "text" && preview.content != null ? (
            <pre className={style.textPreview}>{preview.content}</pre>
          ) : (
            <div className={style.centered}>
              <Typography.Text type="secondary">
                Cannot preview this file type.
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={style.panel}>
      <div className={style.header}>
        <div className={style.headerLeft}>
          {currentPath !== "." && (
            <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={handleNavigateUp} />
          )}
          <Breadcrumb items={breadcrumbItems} className={style.breadcrumb} />
        </div>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={() => loadDirectory(currentPath)}
          title="Refresh"
        />
      </div>
      <div className={style.fileList}>
        {loading ? (
          <div className={style.centered}><Spin /></div>
        ) : entries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Workspace is empty"
            className={style.empty}
          />
        ) : (
          entries.map((entry) => (
            <div
              key={entry.name}
              className={style.fileRow}
              onClick={() => handleEntryClick(entry)}
            >
              <span className={style.fileIcon}>{getFileIcon(entry)}</span>
              <span className={style.fileName}>{entry.name}</span>
              <span className={style.fileSize}>
                {entry.is_dir ? "" : formatSize(entry.size)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkspacePanel;
