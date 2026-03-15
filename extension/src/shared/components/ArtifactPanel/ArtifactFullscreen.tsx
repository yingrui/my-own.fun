import React, { useEffect } from "react";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import type { Artifact } from "@src/shared/artifacts/types";
import { sanitizeArtifactHtml } from "@src/shared/artifacts";
import style from "./ArtifactFullscreen.module.scss";

interface ArtifactFullscreenProps {
  artifact: Artifact;
  onClose: () => void;
}

const ArtifactFullscreen: React.FC<ArtifactFullscreenProps> = ({ artifact, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={style.overlay}>
      <Button
        className={style.closeBtn}
        type="default"
        icon={<CloseOutlined />}
        onClick={onClose}
        size="large"
      >
        Close
      </Button>
      <iframe
        className={style.iframe}
        srcDoc={sanitizeArtifactHtml(artifact.content)}
        sandbox="allow-scripts"
        title="Artifact fullscreen"
      />
    </div>
  );
};

export default ArtifactFullscreen;
