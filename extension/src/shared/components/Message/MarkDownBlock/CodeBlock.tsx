import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coy } from "react-syntax-highlighter/dist/cjs/styles/prism";
import React, { HTMLAttributes, useCallback, useState } from "react";
import { CaretRightOutlined, CheckCircleOutlined, CloseCircleOutlined, CopyOutlined, LoadingOutlined } from "@ant-design/icons";
import style from "./CodeBlock.module.scss";
import { message } from "antd";
import Mermaid from "./MermaidBlock";
import copy from "copy-to-clipboard";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { useCodeExecution, type CodeExecutionResult } from "@src/shared/hooks/useCodeExecution";

const rehypePlugins = [rehypeKatex];
const remarkPlugins = [remarkGfm];

const EXECUTABLE_LANGS = new Set(["python", "py", "bash", "sh", "shell", "zsh"]);
const PYTHON_LANGS = new Set(["python", "py"]);

function CodeBlock(props: HTMLAttributes<HTMLElement> & { loading?: boolean }) {
  const { children, className, loading, ...rest } = props;
  const match = /language-(\w+)/.exec(className || "");
  const text = String(children).replace(/\n$/, "");
  const execution = useCodeExecution();

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CodeExecutionResult | null>(null);

  const lang = match?.[1]?.toLowerCase() ?? "";
  const canExecute = execution && EXECUTABLE_LANGS.has(lang);

  const handleCopy = () => {
    copy(text, {});
    message.success("copy success");
  };

  const handleRun = useCallback(async () => {
    if (!execution || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = PYTHON_LANGS.has(lang)
        ? await execution.executePython(text)
        : await execution.executeShell(text);
      setResult(res);
    } catch (err) {
      setResult({
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exit_code: -1,
        elapsed_ms: 0,
        timed_out: false,
      });
    } finally {
      setRunning(false);
    }
  }, [execution, lang, text, running]);

  const isMermaid = match && match[1] === "mermaid";

  return match ? (
    <div className={style.block}>
      {isMermaid ? (
        <Mermaid chart={children as string} loading={loading} />
      ) : (
        <SyntaxHighlighter
          {...rest}
          PreTag="div"
          language={match[1]}
          style={coy}
          wrapLines={true}
          wrapLongLines={true}
        >
          {text}
        </SyntaxHighlighter>
      )}
      <div className={style.actions}>
        {canExecute && (
          <span
            className={`${style.actionBtn} ${style.run} ${running ? style.running : ""}`}
            onClick={handleRun}
            title={running ? "Running..." : "Run code"}
            role="button"
            tabIndex={0}
          >
            {running ? <LoadingOutlined /> : <CaretRightOutlined />}
          </span>
        )}
        <CopyOutlined className={style.actionBtn} onClick={handleCopy} title="Copy" />
      </div>
      {result && (
        <div className={style.executionResult}>
          <div className={style.executionHeader}>
            {result.exit_code === 0 ? (
              <CheckCircleOutlined className={style.successIcon} />
            ) : (
              <CloseCircleOutlined className={style.errorIcon} />
            )}
            <span>
              exit: {result.exit_code}
              {result.elapsed_ms > 0 && ` · ${result.elapsed_ms}ms`}
              {result.timed_out && " · timed out"}
            </span>
          </div>
          {result.stdout && (
            <pre className={style.executionOutput}>{result.stdout}</pre>
          )}
          {result.stderr && (
            <pre className={`${style.executionOutput} ${style.stderr}`}>{result.stderr}</pre>
          )}
        </div>
      )}
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
