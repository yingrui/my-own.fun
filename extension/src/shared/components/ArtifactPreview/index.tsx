import React from "react";
import type { Artifact } from "@src/shared/artifacts/types";
import style from "./index.module.scss";

interface ArtifactPreviewProps {
  artifact: Artifact | null;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact }) => {
  if (!artifact) {
    return (
      <div className={style.empty}>
        <span>Artifacts from code blocks will appear here.</span>
        <span className={style.hint}>Ask for HTML, SVG, or web content.</span>
      </div>
    );
  }

  return (
    <div className={style.preview}>
      <iframe
        className={style.iframe}
        srcDoc={artifact.content}
        sandbox="allow-scripts"
        title="Artifact preview"
      />
    </div>
  );
};

export default ArtifactPreview;
