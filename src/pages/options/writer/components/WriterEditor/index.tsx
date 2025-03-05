import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Input, Layout, theme } from "antd";
import PropTypes from "prop-types";
import MDEditor from "@uiw/react-md-editor";
import { getCodeString } from "rehype-rewrite";
import mermaid from "mermaid";
import "./index.css";
import WriterContext from "@pages/options/writer/context/WriterContext";
import AssistantDialog from "@pages/options/writer/components/AssistantDialog";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import intl from "react-intl-universal";
import toolbarCommands from "@pages/options/writer/components/CustomToolbar";

const { Header, Content } = Layout;

const randomId = () => parseInt(String(Math.random() * 1e15), 10).toString(36);
const Code = ({ children, className, node }) => {
  children = children ?? [];
  const demoId = useRef(`dome${randomId()}`);
  const [container, setContainer] = useState(null);
  const isMermaid =
    className && /^language-mermaid/.test(className.toLocaleLowerCase());

  const code = children ? getCodeString(node.children) : children[0] || "";

  useEffect(() => {
    if (container && isMermaid && demoId.current && code) {
      mermaid.initialize({ startOnLoad: true, theme: "neutral" });
      mermaid
        .render(demoId.current, code)
        .then(({ svg, bindFunctions }) => {
          container.innerHTML = svg;
          if (bindFunctions) {
            bindFunctions(container);
          }
        })
        .catch((error) => {
          console.error("error:", error);
        });
    }
  }, [container, isMermaid, code, demoId]);

  const refElement = useCallback((element: any) => {
    if (element !== null) {
      setContainer(element);
    }
  }, []);

  if (isMermaid) {
    return (
      <Fragment>
        <code id={demoId.current} style={{ display: "none" }} />
        <code className={className} ref={refElement} data-name="mermaid" />
      </Fragment>
    );
  }
  return <code className={className}>{children}</code>;
};

Code.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any),
  className: PropTypes.string,
  node: PropTypes.any,
};

interface WriterEditorProps {
  context: WriterContext;
  agent: DelegateAgent;
}

const WriterEditor: React.FC<WriterEditorProps> = ({ context, agent }) => {
  // TODO: Support image paste and drag&drop, https://github.com/uiwjs/react-md-editor/issues/83
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const [value, setValue] = useState(context.getContent());
  const [title, setTitle] = useState(context.getTitle());
  const [editorLoaded, setEditorLoaded] = useState(false);
  const textareaId = "writer-editor-textarea";

  useEffect(() => {
    function checkTextarea() {
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        setEditorLoaded(true);
      } else {
        setTimeout(checkTextarea, 100);
      }
    }
    checkTextarea();
  }, []);

  const handleMouseClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    // console.log("Mouse click event:", event);
  };

  const updateContent = (newValue: string = "") => {
    context.setContent(newValue);
    setValue(newValue);
  };

  const updateTitle = (newTitle: string = "") => {
    context.setTitle(newTitle);
    setTitle(newTitle);
  };

  return (
    <Layout style={{ paddingRight: 36 }}>
      <Header style={{ padding: 0, background: colorBgContainer }}>
        <Input
          id="writer-title-input"
          placeholder="Untitled"
          autoComplete="off"
          variant="borderless"
          value={title}
          onChange={(e) => updateTitle(e.target.value)}
        />
      </Header>
      <Content
        style={{
          padding: 0,
          margin: 0,
          minHeight: 600,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        <MDEditor
          onChange={updateContent}
          textareaProps={{
            id: textareaId,
            placeholder: intl
              .get("options_app_writer_content_placeholder")
              .d(
                "Please enter Markdown text, type Alt+Enter to ask AI assistant",
              ),
            onClick: handleMouseClick,
          }}
          highlightEnable={false}
          height={"100%"}
          value={value}
          previewOptions={{
            components: {
              code: Code,
            },
          }}
          commands={toolbarCommands(context)}
        />
        {editorLoaded && (
          <AssistantDialog
            dialogWidth={500}
            textareaId={textareaId}
            agent={agent}
            context={context}
            setValue={updateContent}
          />
        )}
      </Content>
    </Layout>
  );
};

export default WriterEditor;
