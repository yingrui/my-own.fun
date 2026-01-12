import React, { useEffect, useState } from "react";
import { Input, Layout, theme } from "antd";

import MDEditor from "@uiw/react-md-editor";
import "./index.css";
import WriterContext from "@pages/options/writer/context/WriterContext";
import AssistantDialog from "@pages/options/writer/components/AssistantDialog";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import intl from "react-intl-universal";
import toolbarCommands from "@pages/options/writer/components/CustomToolbar";

const { Header, Content } = Layout;

interface WriterEditorWithoutMermaidProps {
  context: WriterContext;
  agent: DelegateAgent;
}

const WriterEditor: React.FC<WriterEditorWithoutMermaidProps> = ({
  context,
  agent,
}) => {
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
          placeholder={intl
            .get("options_app_writer_title_placeholder")
            .d("Untitled")}
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
          }}
          highlightEnable={false}
          height={"100%"}
          value={value}
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
