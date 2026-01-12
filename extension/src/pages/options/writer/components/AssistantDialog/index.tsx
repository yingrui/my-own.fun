import React, { useEffect, useRef, useState } from "react";
import { type MentionProps, Mentions, Modal, Spin } from "antd";
import getCaretCoordinates from "textarea-caret";
import { delay } from "@src/shared/utils";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import WriterContext from "@pages/options/writer/context/WriterContext";
import "./index.css";
import intl from "react-intl-universal";

interface DialogProps {
  textareaId: string;
  dialogWidth: number;
  agent: DelegateAgent;
  context: WriterContext;
  setValue: (value: string) => void;
}

type PrefixType = "@" | "/";

const AssistantDialog: React.FC<DialogProps> = ({
  dialogWidth,
  textareaId,
  agent,
  context,
  setValue,
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const mentionsId = "writer-editor-mentions";

  // TODO: extract a shared Mentions Component
  const [text, setText] = useState<string>("");
  const [prefix, setPrefix] = useState<PrefixType>("/");
  const [generating, setGenerating] = useState<boolean>();
  const [currentText, setCurrentText] = useState<string>("");
  const inputMethodRef = useRef<boolean>(false);
  const commandRef = useRef<boolean>();
  // End of Mentions Component

  useEffect(() => {
    // Install keydown event listener
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (textarea) {
      textarea.removeEventListener("keydown", handleKeyDown);
      textarea.addEventListener("keydown", handleKeyDown);
    }
  }, []);

  const getCursorPosition = (
    textarea: HTMLTextAreaElement,
    dialogHeight: number = 150,
  ) => {
    const { selectionEnd, scrollTop } = textarea;
    const caret = getCaretCoordinates(textarea, selectionEnd);
    const { left, top } = textarea.getBoundingClientRect();

    const x = left + caret.left;
    const y = top + caret.top + caret.height - scrollTop; // caret.height is the height of each line

    // given popup dialog height, if y is reach to bottom, the dialog might be hide, so set y to above the cursor
    if (y + dialogHeight > window.innerHeight) {
      return { x, y: y - dialogHeight - caret.height };
    }
    return { x, y };
  };

  const handleKeyDown = async (event: KeyboardEvent) => {
    if (!event.ctrlKey && event.altKey && event.key === "Enter") {
      const textarea = event.currentTarget as HTMLTextAreaElement;
      const { x, y } = getCursorPosition(textarea);
      setCursorPosition({ x, y });
      setIsModalVisible(true);
      setTimeout(() => {
        const mentions = document.getElementById(
          mentionsId,
        ) as HTMLTextAreaElement;
        if (mentions) {
          mentions.focus();
        }
      }, 200);
    } else if (event.ctrlKey && event.altKey && event.key === "Enter") {
      await autocomplete();
    }
  };

  async function autocomplete() {
    // Known issue: the generated message cannot be undo in the textarea
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;
    const doc = textarea.value;
    const before = doc.substring(0, selectionStart);
    const after = doc.substring(selectionEnd);
    agent.onMessageChange((msg) => {
      const newDoc = before + msg + after;
      textarea.value = newDoc;
    });
    const thought = await agent.executeCommandWithUserInput("autocomplete");
    const content = await thought.getMessage();
    const newDoc = before + content + after;
    setValue(newDoc);
    setTimeout(() => {
      textarea.setSelectionRange(
        selectionStart,
        selectionStart + content.length,
      );
    }, 100);
  }

  function focusOnEditor() {
    // focus on the textarea after closing the dialog
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  }

  function insertTextAtCursor(content: string) {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;
    const doc = textarea.value;
    const newDoc =
      doc.substring(0, selectionStart) + content + doc.substring(selectionEnd);
    setValue(newDoc);
    setTimeout(() => {
      textarea.setSelectionRange(
        selectionStart,
        selectionStart + content.length,
      );
    }, 100);
  }

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  function updateSelectionRange() {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    const { selectionStart, selectionEnd } = textarea;
    context.setSelectionRange(selectionStart, selectionEnd);
  }

  async function handleSubmit() {
    updateSelectionRange();

    setGenerating(true);
    agent.onMessageChange((msg) => {
      setCurrentText(msg);
    });

    const thought = await agent.chat(
      new ChatMessage({ role: "user", content: text }),
    );
    const content = await thought.getMessage();

    setGenerating(false);
    setText("");
    setCurrentText("");
    setIsModalVisible(false);
    insertTextAtCursor(content);
  }

  // Mentions Component
  const handleSearchChange = async () => {
    commandRef.current = true;
    await delay(200);
    commandRef.current = false;
  };

  const onSearch: MentionProps["onSearch"] = (_, newPrefix) => {
    setPrefix(newPrefix as PrefixType);
  };

  async function onKeyDown(e: any) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inputMethodRef.current = e.keyCode !== 13;
    }
  }

  async function onKeyUp(e: any) {
    if (e.key == "Enter" && e.keyCode == 13 && !e.shiftKey) {
      e.preventDefault();
      if (!commandRef.current && !inputMethodRef.current) {
        await handleSubmit();
      }
    }
  }

  function getCommandOptions() {
    if (prefix === "/") {
      return agent.getCommandOptions();
    }
  }

  return (
    <Modal
      mask={false}
      width={dialogWidth}
      open={isModalVisible}
      onCancel={handleCancel}
      afterClose={focusOnEditor}
      closable={false}
      footer={null}
      style={{
        position: "fixed",
        top: cursorPosition.y,
        left: cursorPosition.x,
      }}
    >
      <Mentions
        id={mentionsId}
        placeholder={intl
          .get("options_app_writer_dialog_placeholder")
          .d("type `/` specify instruction, type `Enter` submit.")}
        prefix={["/", "@"]}
        autoSize={{ minRows: 1, maxRows: 4 }}
        autoFocus={true}
        onSelect={handleSearchChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onSearch={onSearch}
        options={getCommandOptions()}
        value={text}
        disabled={generating}
        readOnly={generating}
        onChange={(value) => {
          setText(value);
        }}
      ></Mentions>
      {generating && (
        <div className={"generating"}>
          {currentText.length <= 0 && <Spin />}
          <div className="wrapp">
            <div className={"generating-status"}>{currentText}</div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AssistantDialog;
export {};
