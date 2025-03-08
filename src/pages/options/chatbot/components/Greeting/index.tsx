import React, { useEffect, useRef, useState } from "react";
import { type MentionProps, Mentions } from "antd";
import "./index.css";
import intl from "react-intl-universal";
import { delay } from "@src/shared/utils";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import type { MentionsRef } from "antd/lib/mentions";

interface GreetingProps {
  onQuestionChange: (query: string) => void;
  agent: DelegateAgent;
  enableClearCommand?: boolean;
}

type PrefixType = "@" | "/";

const Greeting: React.FC<GreetingProps> = ({
  onQuestionChange,
  agent,
  enableClearCommand,
}) => {
  const [text, setText] = useState<string>("");
  const [prefix, setPrefix] = useState<PrefixType>("@");
  const commandRef = useRef<boolean>();
  const inputMethodRef = useRef<boolean>(false);
  const mentionRef = useRef<MentionsRef>();

  useEffect(() => {}, []);

  const handleSearchChange = async () => {
    commandRef.current = true;
    await delay(200);
    commandRef.current = false;
  };

  async function onKeyDown(e: any) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // if keyCode is not 13, then it's input method enter
      inputMethodRef.current = e.keyCode !== 13;
    }
  }

  const onKeyUp = (e: any) => {
    if (e.key == "Enter" && e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      if (!commandRef.current && !inputMethodRef.current) {
        const queryString = text.trim();
        onQuestionChange(queryString);
      }
    }
  };

  const onSearch: MentionProps["onSearch"] = (_, newPrefix) => {
    setPrefix(newPrefix as PrefixType);
  };

  function getCommandOptions() {
    if (prefix === "@") {
      return agent.getAgentOptions();
    }

    if (prefix === "/") {
      const options = agent.getCommandOptions();
      if (enableClearCommand) {
        options.push({ value: "clear", label: "/clear" }); // add clear command
      }
      return options;
    }
  }

  return (
    <>
      <div className={"chatbot-icon-area"}>
        <div className={"chatbot-logo"}>
          <img src={"/icons/logo.svg"} />
          <h6>{intl.get("options_chatbot_ask_assistant").d("Ask myFun")}</h6>
        </div>
      </div>
      <div className={"chatbot-input-first-page"}>
        <div className={"chatbot-input-area"}>
          <Mentions
            className={"chatbot-input"}
            ref={mentionRef}
            onSelect={handleSearchChange}
            onSearch={onSearch}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            prefix={["/", "@"]}
            value={text}
            options={getCommandOptions()}
            placeholder={intl
              .get("placeholder_side_panel_input")
              .d(
                "`/` specify instruction, `@` find agent, type `Enter` ask question.",
              )}
            onChange={(value) => setText(value)}
            autoSize={{ minRows: 3, maxRows: 5 }}
            allowClear
          />
        </div>
      </div>
    </>
  );
};

export default Greeting;
