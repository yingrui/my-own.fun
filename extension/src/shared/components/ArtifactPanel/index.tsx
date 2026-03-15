import React, { useMemo } from "react";
import { Typography } from "antd";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import { extractArtifacts } from "@src/shared/artifacts";
import ArtifactPreview from "@src/shared/components/ArtifactPreview";
import style from "./index.module.scss";

interface ArtifactPanelProps {
  messages: SessionMessage[];
}

const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ messages }) => {
  const artifacts = useMemo(() => extractArtifacts(messages), [messages]);
  const selectedArtifact = artifacts.length > 0 ? artifacts[artifacts.length - 1] : null;

  return (
    <div className={style.panel}>
      <div className={style.header}>
        <Typography.Text strong>Artifacts</Typography.Text>
        {artifacts.length > 0 && (
          <Typography.Text type="secondary" className={style.count}>
            {artifacts.length} found
          </Typography.Text>
        )}
      </div>
      <div className={style.content}>
        <ArtifactPreview artifact={selectedArtifact} />
      </div>
    </div>
  );
};

export default ArtifactPanel;
