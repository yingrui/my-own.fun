import React, { HTMLAttributes } from "react";
import { CopyOutlined } from "@ant-design/icons";
import style from "./CodeBlock.module.scss";
import { message } from "antd";
import copy from "copy-to-clipboard";

const rehypePlugins = [];
const remarkPlugins = [];

function CodeBlock(props: HTMLAttributes<HTMLElement> & { loading?: boolean }) {
  const { children, className, loading, ...rest } = props;
  const match = /language-(\w+)/.exec(className || "");
  const text = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    copy(text, {});
    message.success("copy success");
  };

  return match ? (
    <div className={style.block}>
      {text}
      <CopyOutlined className={style.copy} onClick={handleCopy} />
    </div>
  ) : (
    <code {...rest} className={className}>
      {children}
    </code>
  );
}

CodeBlock.defaultProps = {
  language: null,
};

export default CodeBlock;
export { rehypePlugins, remarkPlugins };
