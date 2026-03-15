import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, message as antdMessage, Select, Typography } from "antd";
import { CopyOutlined, ExpandOutlined, LinkOutlined } from "@ant-design/icons";
import copy from "copy-to-clipboard";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import type { Artifact } from "@src/shared/artifacts/types";
import { extractArtifacts, extractPartialArtifact } from "@src/shared/artifacts";
import ArtifactPreview from "@src/shared/components/ArtifactPreview";
import ArtifactFullscreen from "@src/shared/components/ArtifactPanel/ArtifactFullscreen";
import style from "./index.module.scss";

interface ArtifactPanelProps {
  messages: SessionMessage[];
  /** When set, select the artifact with this id. Used when user clicks placeholder in chat. */
  selectedArtifactId?: string | null;
}

function openInNewTab(artifact: Artifact): void {
  const blob = new Blob([artifact.content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ messages, selectedArtifactId }) => {
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const partialArtifact = useMemo(() => extractPartialArtifact(messages), [messages]);
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

  useEffect(() => {
    if (selectedArtifactId && artifacts.length > 0) {
      const idx = artifacts.findIndex((a) => a.id === selectedArtifactId);
      if (idx >= 0) setSelectedIndex(idx);
    }
  }, [selectedArtifactId, artifacts]);

  const selectedArtifact = artifacts.length > 0 ? artifacts[selectedIndex] ?? artifacts[artifacts.length - 1] : null;
  const displayArtifact = partialArtifact ?? selectedArtifact;

  const handleCopy = () => {
    if (displayArtifact && !partialArtifact) {
      copy(displayArtifact.content, {});
      antdMessage.success("Copied to clipboard");
    }
  };

  const handleOpenInNewTab = () => {
    if (displayArtifact && !partialArtifact) {
      openInNewTab(displayArtifact);
    }
  };

  const handleFullscreen = () => {
    if (displayArtifact && !partialArtifact) {
      setFullscreenArtifact(displayArtifact);
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
          ) : artifacts.length > 0 && !partialArtifact ? (
            <Typography.Text type="secondary" className={style.count}>
              1 found
            </Typography.Text>
          ) : null}
        </div>
        {displayArtifact && (
          <div className={style.actions}>
            {partialArtifact && (
              <Typography.Text type="secondary" className={style.generating}>
                Generating...
              </Typography.Text>
            )}
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              title="Copy"
              disabled={!!partialArtifact}
            />
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={handleOpenInNewTab}
              title="Open in new tab"
              disabled={!!partialArtifact}
            />
            <Button
              type="text"
              size="small"
              icon={<ExpandOutlined />}
              onClick={handleFullscreen}
              title="Full screen"
              disabled={!!partialArtifact}
            />
          </div>
        )}
      </div>
      <div className={style.content}>
        <ArtifactPreview artifact={displayArtifact} />
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
