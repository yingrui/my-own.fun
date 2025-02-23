import { Button, Spin } from "antd";
import { type GluonConfigure } from "@root/src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import React, { useEffect, useState } from "react";
import BrowserCopilot from "@pages/popup/agents/BrowserCopilot";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

const rehypePlugins = [rehypeKatex];
const remarkPlugins = [remarkGfm];

interface PopupProps {
  config: GluonConfigure;
  copilot: BrowserCopilot;
}

const Popup: React.FC<PopupProps> = ({ config, copilot }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<string>("");

  function open_side_panel() {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
      chrome.sidePanel.open({ tabId: tabs[0].id });
    });
  }

  async function open_options_page() {
    chrome.runtime.openOptionsPage();
  }

  useEffect(() => {
    // TODO: Try to understand what user is trying to do here
    chrome.history.search(
      { text: "", maxResults: 10 },
      async (historyItems) => {
        const history = historyItems
          .map((i) => `title: ${i.title}, url: ${i.url}`)
          .join("\n");

        const thought = await copilot.recommend({ history });
        const result = await thought.getMessage((msg) => {
          setIsLoading(false);
          setSuggestion(msg);
        });
        setSuggestion(result);
      },
    );
  }, []);

  return (
    <div className="container">
      <div className="popup-content">
        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Spin size="large"></Spin>
          </div>
        )}
        {!isLoading && (
          <ReactMarkdown
            rehypePlugins={rehypePlugins as any}
            remarkPlugins={remarkPlugins as any}
          >
            {suggestion}
          </ReactMarkdown>
        )}
      </div>
      <div className="popup-footer">
        <Button
          key="open_side_panel"
          htmlType="button"
          onClick={open_side_panel}
          data-toggle="tooltip"
          data-placement="top"
          title={intl
            .get("tooltip_side_panel")
            .d("Type Alt + Enter can also open side panel")}
        >
          {intl.get("open_side_panel").d("Side Panel")}
        </Button>
        <Button key="options" htmlType="button" onClick={open_options_page}>
          {intl.get("open_more_tools").d("More Tools")}
        </Button>
      </div>
      <p style={{ textAlign: "center" }}>
        <a href="https://github.com/yingrui/gru.ai">
          {intl.get("assistant_name").d("Gru")}
        </a>{" "}
        {intl
          .get("tooltip_assistant_shortcut")
          .d(
            "is glad to help you, type `Alt + Enter` can also open side panel.",
          )}
      </p>
    </div>
  );
};

export default Popup;
