import React, { useEffect, useState } from "react";
import { Input, Layout, theme } from "antd";

import MDEditor from "@uiw/react-md-editor";
import "./index.css";
import WriterContext from "@pages/options/writer/context/WriterContext";
import AssistantDialog from "@pages/options/writer/components/AssistantDialog";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";
import intl from "react-intl-universal";
import toolbarCommands from "@pages/options/writer/components/CustomToolbar";
import configureStorage from "@src/shared/storages/gluonConfig";
import useStorage from "@src/shared/hooks/useStorage";

const { Header, Content } = Layout;

interface WriterEditorWithoutMermaidProps {
  context: WriterContext;
  agent: ChatSession;
}

const WriterEditor: React.FC<WriterEditorWithoutMermaidProps> = ({
  context,
  agent,
}) => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const config = useStorage(configureStorage);
  const themeMode = config.themeMode ?? "auto";
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [value, setValue] = useState(context.getContent());
  const [title, setTitle] = useState(context.getTitle());
  const [editorLoaded, setEditorLoaded] = useState(false);
  const textareaId = "writer-editor-textarea";

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setIsDark(event.matches);

    setIsDark(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

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

  const editorColorMode =
    themeMode === "dark" ? "dark" : themeMode === "light" ? "light" : isDark ? "dark" : "light";

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
        <div data-color-mode={editorColorMode}>
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
        </div>
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
