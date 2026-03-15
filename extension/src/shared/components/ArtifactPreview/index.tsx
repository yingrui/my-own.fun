import React from "react";
import type { Artifact } from "@src/shared/artifacts/types";
import { sanitizeArtifactHtml } from "@src/shared/artifacts";
import Mermaid from "@src/shared/components/Message/MarkDownBlock/MermaidBlock";
import style from "./index.module.scss";

interface ArtifactPreviewProps {
  artifact: Artifact | null;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact }) => {
  if (!artifact) {
    return (
      <div className={style.empty}>
        <span>Artifacts from code blocks will appear here.</span>
        <span className={style.hint}>Ask for HTML, SVG, Mermaid, or web content.</span>
      </div>
    );
  }

  if (artifact.type === "mermaid") {
    return (
      <div className={style.preview}>
        <div className={style.mermaidWrap}>
          <Mermaid chart={artifact.content} loading={artifact.isPartial} />
        </div>
      </div>
    );
  }

  return (
    <div className={style.preview}>
      <iframe
        className={style.iframe}
        srcDoc={sanitizeArtifactHtml(artifact.content)}
        sandbox="allow-scripts"
        title="Artifact preview"
      />
    </div>
  );
};

export default ArtifactPreview;
