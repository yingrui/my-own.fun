import React from "react";

// TODO: Choose one of the following import statements
// When your developing feature is not using Mermaid, use the following import statement:
// When ready for release, use the following import statement:
import CodeBlock, {
  rehypePlugins,
  remarkPlugins,
} from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
// import CodeBlock, {rehypePlugins, remarkPlugins} from "@src/shared/components/Message/MarkDownBlock/CodeBlockWithoutMermaid";
import ReactMarkdown from "react-markdown";
import { ARTIFACT_LINK_PREFIX } from "@src/shared/artifacts";

interface MarkdownProps {
  loading?: boolean;
  content: string;
  onArtifactClick?: (artifactId: string) => void;
}

const MarkdownPreview: React.FC<MarkdownProps> = ({ loading, content, onArtifactClick }) => {
  return (
    <ReactMarkdown
      components={{
        code: (props) => {
          return <CodeBlock {...props} loading={loading} />;
        },
        a: (props) => {
          const href = props.href ?? "";
          if (onArtifactClick && href.startsWith(ARTIFACT_LINK_PREFIX)) {
            const artifactId = href.slice(ARTIFACT_LINK_PREFIX.length);
            return (
              <a
                {...props}
                href={href}
                className={`${props.className ?? ""} markdown-artifact-link`.trim()}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  onArtifactClick(artifactId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onArtifactClick(artifactId);
                  }
                }}
              />
            );
          }
          return <a {...props} />;
        },
      }}
      rehypePlugins={rehypePlugins as any}
      remarkPlugins={remarkPlugins as any}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownPreview;
