import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Input, Layout, message } from "antd";
import "./index.css";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import UserJourneyContext from "@pages/options/architect/context/UserJourneyContext";
import intl from "react-intl-universal";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import CodeBlock from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
import MarkdownTextArea from "@src/shared/components/MarkdownTextArea";

interface UserJourneyProps {
  config: GluonConfigure;
}

const { Footer } = Layout;
const { TextArea } = Input;
const rehypePlugins = [rehypeKatex];
const remarkPlugins = [remarkGfm];

const UserJourneyApp: React.FC<UserJourneyProps> = ({ config }) => {
  const [loading, setLoading] = useState(true);
  const contextRef = useRef(new UserJourneyContext(config));
  const [mode, setMode] = useState<"editing" | "viewing">("editing");
  const [userJourney, setUserJourney] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [boardUrl, setBoardUrl] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [generatedText, setGeneratedText] = useState<string>("");

  useEffect(() => {
    // Load the context of this app from local storage
    // Once loaded, this component will rerender.
    // That's why we need to set the context in the state
    contextRef.current.load().then((record) => {
      setLoading(false);
      setDetails(record.details ?? "");
      setUserJourney(record.userJourney ?? "");
      setBoardUrl(record.boardUrl ?? "");
      setFeedback(record.feedback ?? "");
      setGeneratedText(record.generatedText ?? "");
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const extractUserJourney = (text: string) => {
    // use regex to extract mermaid code block from the Markdown text
    // and return the code block
    const matchedUserJourney = text.match(/```mermaid([\s\S]*?)```/g);
    if (matchedUserJourney.length > 0) {
      return matchedUserJourney[0];
    } else {
      return "";
    }
  };

  const handleSave = async () => {
    await contextRef.current
      .save({
        id: "userJourney", // Not necessary to set this, context will handle it
        details: details,
        boardUrl: boardUrl,
        feedback: feedback,
        generatedText: generatedText,
        userJourney: userJourney,
      })
      .then(() => {
        message.success(
          intl
            .get("user_journey_save_success")
            .d("User journey saved successfully!"),
        );
      });
  };

  const handleSubmit = async () => {
    if (!details) {
      message.error(
        intl
          .get("user_journey_err_details_are_empty")
          .d("Details cannot be empty!"),
      );
      return;
    }

    const userInput = "please generate user journey.";
    const props = {
      details: details,
      boardUrl,
      feedback: feedback,
      userInput: userInput,
      userJourney: userJourney,
    };
    // Add logic to handle the submitted pitch
    setGenerating(true);
    const agent = contextRef.current.getAgent();
    const result = await agent.userJourney(props);
    const msg = await result.getMessage((msg) => {
      setGeneratedText(msg);
    });
    setGeneratedText(msg);
    setUserJourney(extractUserJourney(msg));
    setGenerating(false);
  };

  const updateGeneratedText = (text: string) => {
    setGeneratedText(text);
    setUserJourney(extractUserJourney(text));
  };

  return (
    <Layout style={{ padding: "24px" }} className={"user-journey-app"}>
      <Layout
        className={"user-journey-form"}
        style={{ display: mode === "editing" ? "flex" : "none" }}
      >
        <h2>
          {intl.get("user_journey_form_title").d("Provide details for AI")}
        </h2>

        <Form layout={"vertical"}>
          <Form.Item label={intl.get("user_journey_form_details").d("Details")}>
            <TextArea
              rows={12}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={intl
                .get("user_journey_form_details_placeholder")
                .d("product and user journey details")}
            />
          </Form.Item>
          <Form.Item
            label={intl.get("user_journey_form_board_url").d("Board URL")}
            tooltip={"Not implemented"}
          >
            <TextArea
              rows={1}
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={boardUrl}
              onChange={(e) => setBoardUrl(e.target.value)}
              placeholder={intl
                .get("user_journey_form_board_url_placeholder")
                .d("provide board url")}
            />
          </Form.Item>
          <Form.Item
            label={intl.get("user_journey_form_feedback").d("Instruct")}
          >
            <TextArea
              rows={1}
              autoSize={{ minRows: 1, maxRows: 2 }}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={intl
                .get("user_journey_form_feedback_placeholder")
                .d("provide instruction, feedback or suggestion")}
            />
          </Form.Item>
        </Form>
        <div className={"form-submit-buttons"}>
          <Button type="primary" onClick={handleSubmit}>
            {intl.get("user_journey_form_submit").d("Submit")}
          </Button>
          <Button type="default" onClick={handleSave}>
            {intl.get("user_journey_form_save").d("Save")}
          </Button>
          <Button type="default" onClick={() => setMode("viewing")}>
            {intl.get("user_journey_view_mode").d("View Mode")}
          </Button>
        </div>
        <MarkdownTextArea
          disabled={generating}
          text={generatedText}
          textChanged={updateGeneratedText}
        />
      </Layout>
      <Layout className={"user-journey-preview"}>
        <div style={{ height: "100%" }}>
          <ReactMarkdown
            components={{
              code: (props) => {
                return <CodeBlock {...props} loading={generating} />;
              },
            }}
            rehypePlugins={rehypePlugins as any}
            remarkPlugins={remarkPlugins as any}
          >
            {userJourney}
          </ReactMarkdown>
        </div>
        {mode === "viewing" && (
          <Footer className="user-journey-preview-footer">
            <Button
              type="default"
              style={{ width: 100 }}
              onClick={() => setMode("editing")}
            >
              {intl.get("user_journey_edit_mode").d("Edit Mode")}
            </Button>
          </Footer>
        )}
      </Layout>
    </Layout>
  );
};

export default UserJourneyApp;
