import React, { useEffect, useRef } from "react";
import type { Artifact } from "@src/shared/artifacts/types";
import { sanitizeArtifactHtml } from "@src/shared/artifacts";
import Mermaid from "@src/shared/components/Message/MarkDownBlock/MermaidBlock";
import style from "./index.module.scss";

/** Imperatively toggle display to work around iframe render bug, done synchronously to avoid blink */
function triggerIframeReflow(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  iframe.style.display = "none";
  void iframe.offsetHeight; // force reflow
  iframe.style.display = "block";
}

interface ArtifactPreviewProps {
  artifact: Artifact | null;
}

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({ artifact }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!artifact || artifact.type === "mermaid") return;
    const el = iframeRef.current;
    if (!el) return;
    const t = requestAnimationFrame(() => {
      triggerIframeReflow(el);
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
        key={artifact.id}
        ref={iframeRef}
        className={style.iframe}
        srcDoc={sanitizeArtifactHtml(artifact.content)}
        sandbox="allow-scripts"
        title="Artifact preview"
      />
    </div>
  );
};

export default ArtifactPreview;
