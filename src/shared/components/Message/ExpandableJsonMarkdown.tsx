import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "antd";
import CodeBlock, {
  rehypePlugins,
  remarkPlugins,
} from "./MarkDownBlock/CodeBlock";

interface ExpandableJsonMarkdownProps {
  content: string;
  maxLength?: number;
  maxLines?: number;
  defaultExpanded?: boolean;
}

const ExpandableJsonMarkdown: React.FC<ExpandableJsonMarkdownProps> = ({
  content,
  maxLength = 500,
  maxLines = 5,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const shouldTruncate = () => {
    if (content.length > maxLength) return true;
    const lines = content.split("\n");
    return lines.length > maxLines;
  };

  const truncateContent = () => {
    if (content.length <= maxLength) {
      const lines = content.split("\n");
      if (lines.length <= maxLines) return content;
      return lines.slice(0, maxLines).join("\n") + "\n...";
    }
    return content.slice(0, maxLength) + "...";
  };

  const renderMarkdown = (text: string) => (
    <ReactMarkdown
      components={{
        code: (props) => {
          return <CodeBlock {...props} loading={false} />;
        },
      }}
      rehypePlugins={rehypePlugins as any}
      remarkPlugins={remarkPlugins as any}
    >
      {`\`\`\`json\n${text}\n\`\`\``}
    </ReactMarkdown>
  );

  if (!shouldTruncate()) {
    return renderMarkdown(content);
  }

  return (
    <div>
      {renderMarkdown(expanded ? content : truncateContent())}
      <Button
        type="link"
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 0, marginTop: 8 }}
      >
        {expanded ? "Collapse" : "Expand"}
      </Button>
    </div>
  );
};

export default ExpandableJsonMarkdown;
