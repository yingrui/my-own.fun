import React, { useEffect, useState } from "react";
import type { Artifact } from "@src/shared/artifacts/types";
import { sanitizeArtifactHtml } from "@src/shared/artifacts";
import Mermaid from "@src/shared/components/Message/MarkDownBlock/MermaidBlock";
import style from "./index.module.scss";

interface ArtifactPreviewProps {
  artifact: Artifact | null;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact }) => {
  const [displayBlock, setDisplayBlock] = useState(false);

  useEffect(() => {
    if (!artifact || artifact.type === "mermaid") return;
    setDisplayBlock(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDisplayBlock(true));
    });
    return () => cancelAnimationFrame(t);
  }, [artifact?.id, artifact?.content]);
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
        style={{ display: displayBlock ? "block" : "none" }}
        srcDoc={sanitizeArtifactHtml(artifact.content)}
        sandbox="allow-scripts"
        title="Artifact preview"
      />
    </div>
  );
};

export default ArtifactPreview;
