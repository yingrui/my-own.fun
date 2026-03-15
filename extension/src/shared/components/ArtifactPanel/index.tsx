import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, message as antdMessage, Select, Typography } from "antd";
import { CopyOutlined, ExpandOutlined, LinkOutlined } from "@ant-design/icons";
import copy from "copy-to-clipboard";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import type { Artifact } from "@src/shared/artifacts/types";
import { extractArtifacts } from "@src/shared/artifacts";
import ArtifactPreview from "@src/shared/components/ArtifactPreview";
import ArtifactFullscreen from "@src/shared/components/ArtifactPanel/ArtifactFullscreen";
import style from "./index.module.scss";

interface ArtifactPanelProps {
  messages: SessionMessage[];
}

function openInNewTab(artifact: Artifact): void {
  const blob = new Blob([artifact.content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ messages }) => {
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreenArtifact, setFullscreenArtifact] = useState<Artifact | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (artifacts.length > 0) {
      const prevLen = prevLengthRef.current;
      prevLengthRef.current = artifacts.length;
      setSelectedIndex((i) => {
        if (artifacts.length > prevLen) return artifacts.length - 1;
        if (i >= artifacts.length) return artifacts.length - 1;
        return i;
      });
    }
  }, [artifacts]);

  const selectedArtifact = artifacts.length > 0 ? artifacts[selectedIndex] ?? artifacts[artifacts.length - 1] : null;

  const handleCopy = () => {
    if (selectedArtifact) {
      copy(selectedArtifact.content, {});
      antdMessage.success("Copied to clipboard");
    }
  };

  const handleOpenInNewTab = () => {
    if (selectedArtifact) {
      openInNewTab(selectedArtifact);
    }
  };

  const handleFullscreen = () => {
    if (selectedArtifact) {
      setFullscreenArtifact(selectedArtifact);
    }
  };

  return (
    <div className={style.panel}>
      <div className={style.header}>
        <div className={style.headerLeft}>
          <Typography.Text strong>Artifacts</Typography.Text>
          {artifacts.length > 1 ? (
            <Select
              size="small"
              value={selectedIndex}
              onChange={setSelectedIndex}
              options={artifacts.map((a, i) => ({
                value: i,
                label: `Artifact ${i + 1}`,
              }))}
              className={style.selector}
            />
          ) : artifacts.length > 0 ? (
            <Typography.Text type="secondary" className={style.count}>
              1 found
            </Typography.Text>
          ) : null}
        </div>
        {selectedArtifact && (
          <div className={style.actions}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              title="Copy"
            />
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={handleOpenInNewTab}
              title="Open in new tab"
            />
            <Button
              type="text"
              size="small"
              icon={<ExpandOutlined />}
              onClick={handleFullscreen}
              title="Full screen"
            />
          </div>
        )}
      </div>
      <div className={style.content}>
        <ArtifactPreview artifact={selectedArtifact} />
      </div>
      {fullscreenArtifact && (
        <ArtifactFullscreen
          artifact={fullscreenArtifact}
          onClose={() => setFullscreenArtifact(null)}
        />
      )}
    </div>
  );
};

export default ArtifactPanel;
