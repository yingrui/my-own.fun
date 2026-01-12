import React from "react";
import ReactMarkdown from "react-markdown";
// import CodeBlock from "@src/shared/components/MessageWithoutMermaid/MarkDownBlockWithoutMermaid/CodeBlock";
import CodeBlock from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import "./index.css";

interface SearchSummaryProps {
  content: string;
  loading?: boolean;
}

const rehypePlugins = [rehypeKatex];
const remarkPlugins = [remarkGfm];

const SearchSummary: React.FC<SearchSummaryProps> = ({ content, loading }) => {
  return (
    <div className={"react-markdown"}>
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
    </div>
  );
};

export default SearchSummary;
