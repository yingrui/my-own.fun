import React, { useEffect, useRef, useState } from "react";
import { Input, Modal, Spin } from "antd";
import getCaretCoordinates from "textarea-caret";
import type { ChatSession, SessionState } from "@src/shared/langgraph/runtime/types";
import WriterContext from "@pages/options/writer/context/WriterContext";
import "./index.css";
import intl from "react-intl-universal";

interface DialogProps {
  textareaId: string;
  dialogWidth: number;
  agent: ChatSession;
  context: WriterContext;
  setValue: (value: string) => void;
}

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

  const [text, setText] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>();
  const [currentText, setCurrentText] = useState<string>("");
  const inputMethodRef = useRef<boolean>(false);

  function getLatestAssistantText(state: SessionState, onlyLoading = false): string {
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      const msg = state.messages[i];
      if (msg.role === "assistant" && (!onlyLoading || msg.loading)) {
        return msg.content ?? "";
      }
    }
    return "";
  }

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
        const el = document.getElementById(mentionsId);
        if (el) (el as HTMLTextAreaElement).focus();
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
    const unsubscribe = agent.onStateChange((state) => {
      const msg = getLatestAssistantText(state, true);
      if (msg) {
        const newDoc = before + msg + after;
        textarea.value = newDoc;
      }
    });
    const content = await agent.executeCommandWithUserInput?.("autocomplete");
    unsubscribe();
    if (!content) {
      return;
    }
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
    const unsubscribe = agent.onStateChange((state) => {
      setGenerating(state.generating);
      setCurrentText(getLatestAssistantText(state, true));
    });

    const content = await agent.chat(text);
    unsubscribe();

    setGenerating(false);
    setText("");
    setCurrentText("");
    setIsModalVisible(false);
    insertTextAtCursor(content);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inputMethodRef.current = e.keyCode !== 13;
    }
  }

  function onKeyUp(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      if (!inputMethodRef.current) handleSubmit();
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
      <Input.TextArea
        id={mentionsId}
        placeholder={intl
          .get("options_app_writer_dialog_placeholder")
          .d("Type your message, press Enter to submit.")}
        autoSize={{ minRows: 1, maxRows: 4 }}
        autoFocus
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        value={text}
        disabled={generating}
        readOnly={generating}
        onChange={(e) => setText(e.target.value)}
      />
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
