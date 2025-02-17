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

interface MarkdownProps {
  loading?: boolean;
  content: string;
}

const MarkdownPreview: React.FC<MarkdownProps> = ({ loading, content }) => {
  return (
    <ReactMarkdown
      components={{
        code: (props) => {
          return <CodeBlock {...props} loading={loading} />;
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
