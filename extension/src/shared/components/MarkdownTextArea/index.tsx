import { Input } from "antd";
import { CheckOutlined, EditOutlined } from "@ant-design/icons";
import "./index.css";
import React, { useState } from "react";
import {
  rehypePlugins,
  remarkPlugins,
} from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
import ReactMarkdown from "react-markdown";

interface MarkdownTextArea {
  disabled: boolean;
  text?: string;
  textChanged?: (text: string) => void;
}

const { TextArea } = Input;

const MarkdownTextArea: React.FC<MarkdownTextArea> = React.memo(
  ({ disabled, text, textChanged }: MarkdownTextArea) => {
    const [editResult, setEditResult] = useState<boolean>(false);

    return (
      <div className={"markdown-textarea"}>
        <div className={"float-action-icon"}>
          {editResult && <CheckOutlined onClick={() => setEditResult(false)} />}
          {!editResult && <EditOutlined onClick={() => setEditResult(true)} />}
        </div>
        {editResult && (
          <TextArea
            className={"textarea"}
            disabled={disabled}
            value={text}
            style={{ height: "100%" }}
            onChange={(e) => textChanged(e.target.value)}
          />
        )}
        {!editResult && (
          <ReactMarkdown
            className={"markdown-preview"}
            rehypePlugins={rehypePlugins as any}
            remarkPlugins={remarkPlugins as any}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    );
  },
);

MarkdownTextArea.displayName = "MarkdownTextArea";

export default MarkdownTextArea;
