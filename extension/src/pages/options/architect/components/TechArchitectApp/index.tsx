import React, { useRef, useState, useContext } from "react";
import {
  Button,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Input,
  Layout,
  Row,
  Space,
  Spin,
  Typography,
} from "antd";
import { css } from "@emotion/css";
import "./index.css";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  AntDesignOutlined,
  EditOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import MarkdownPreview from "@root/src/shared/components/Message/MarkdownPreview";
import TechArchitectContext from "../../context/TechArchitectContext";

interface TechArchitectProps {
  config: GluonConfigure;
}
const { TextArea } = Input;

const TechArchitectApp: React.FC<TechArchitectProps> = ({ config }) => {
  const [generating, setGenerating] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [context, setContext] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [contentSnapshot, setContentSnapshot] = useState<string>("");
  const contextRef = useRef(new TechArchitectContext(config));

  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefixCls = getPrefixCls();
  const linearGradientButton = css`
    &.${prefixCls}-btn-primary:not([disabled]):not(
        .${prefixCls}-btn-dangerous
      ) {
      > span {
        position: relative;
      }
      &::before {
        content: "";
        background: linear-gradient(135deg, #6253e1, #04befe);
        position: absolute;
        inset: -1px;
        opacity: 1;
        transition: all 0.3s;
        border-radius: inherit;
      }
      &:hover::before {
        opacity: 0;
      }
      &:focus {
        outline: none;
        border-width: 2px;
        box-shadow: 0 0 0 3px rgba(98, 83, 225, 0.2);
      }
    }
  `;

  const handleGenerate = async () => {
    setGenerating(true);
    const agent = contextRef.current.getAgent();
    const result = await agent.drawTechArchitecture(context);
    const msg = await result.getMessage();
    console.log(msg);
    setContent(extractMermaidText(msg));
    setGenerating(false);
  };

  const extractMermaidText = (text: string) => {
    // use regex to extract mermaid code block from the Markdown text
    // and return the code block
    const matchedUserJourney = text.match(/```mermaid([\s\S]*?)```/g);
    if (matchedUserJourney.length > 0) {
      return matchedUserJourney[0];
    } else {
      return text;
    }
  };

  const handleEditClick = async () => {
    setEditing(true);
    setContentSnapshot(content);
  };

  const handleEditConfirm = async () => {
    setEditing(false);
    setContent(contentSnapshot);
  };

  return (
    <Layout className="app-container">
      <Layout className="left-container">
        <Row>
          <Col
            span={12}
            style={{
              paddingLeft: "16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <h2>
              {intl
                .get("tect_architecture_title")
                .d("Architectural Design Assistant")}
            </h2>
          </Col>
          <Col span={12}>
            <Space
              style={{
                width: "100%",
                justifyContent: "flex-end",
                padding: "16px",
              }}
            >
              <Button
                className={linearGradientButton}
                type="primary"
                size="large"
                icon={<AntDesignOutlined />}
                disabled={context === ""}
                onClick={handleGenerate}
              >
                {intl
                  .get("tect_architecture_gen_button")
                  .d("Generative Architecture")}
              </Button>
            </Space>
          </Col>
        </Row>

        <TextArea
          className="context-textarea"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={intl
            .get("tect_architecture_context_placeholder")
            .d("Please enter system architecture context information")}
        ></TextArea>
      </Layout>
      <Layout className="right-container">
        {content === "" && !generating && (
          <Empty
            style={{ marginTop: "400px" }}
            description={
              <Typography.Text>
                {intl.get("tect_architecture_tips_no_data").d("No data")}
              </Typography.Text>
            }
          />
        )}
        {generating && (
          <Spin
            style={{ marginTop: "400px" }}
            indicator={<LoadingOutlined spin />}
            size="large"
          />
        )}
        {content !== "" && !editing && (
          <>
            <Space
              style={{
                width: "100%",
                padding: "20px",
                justifyContent: "flex-end",
              }}
            >
              <Space>
                <Button icon={<EditOutlined />} onClick={handleEditClick}>
                  {intl.get("tect_architecture_btn_edit").d("Edit")}
                </Button>
              </Space>
            </Space>
            <Divider style={{ margin: "0" }} />
            <div className="graph-preview">
              <MarkdownPreview loading={generating} content={content} />
            </div>
          </>
        )}
        {editing && (
          <>
            <Space
              style={{
                width: "100%",
                padding: "20px",
                justifyContent: "flex-end",
              }}
            >
              <Space>
                <Button type="primary" onClick={handleEditConfirm}>
                  {intl.get("tect_architecture_btn_ok").d("Ok")}
                </Button>
                <Button type="default" onClick={() => setEditing(false)}>
                  {intl.get("tect_architecture_btn_cancel").d("Cancel")}
                </Button>
              </Space>
            </Space>
            <TextArea
              value={contentSnapshot}
              onChange={(e) => setContentSnapshot(e.target.value)}
              className="content-textarea"
            />
          </>
        )}
      </Layout>
    </Layout>
  );
};

export default TechArchitectApp;
