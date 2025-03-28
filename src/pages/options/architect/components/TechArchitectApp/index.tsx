import React, { useEffect, useRef, useState, useContext } from "react";
import {
  Button,
  Col,
  ConfigProvider,
  Divider,
  Input,
  Layout,
  Row,
  Space,
} from "antd";
import { css } from "@emotion/css";
import "./index.css";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import UserJourneyContext from "@pages/options/architect/context/UserJourneyContext";
import intl from "react-intl-universal";
import {
  AntDesignOutlined,
  EditOutlined,
  ExportOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";
import MarkdownPreview from "@root/src/shared/components/Message/MarkdownPreview";

interface TechArchitectProps {
  config: GluonConfigure;
}
const { TextArea } = Input;

const TechArchitectApp: React.FC<TechArchitectProps> = ({ config }) => {
  const [loading, setLoading] = useState(true);
  const contextRef = useRef(new UserJourneyContext(config));

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

  useEffect(() => {
    // Load the context of this app from local storage
    // Once loaded, this component will rerender.
    // That's why we need to set the context in the state
    contextRef.current.load().then(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  function getSampleContent(): string {
    return `\`\`\`mermaid
    sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`;
  }

  return (
    <Layout className="app-container">
      <Layout className="left-container">
        <Row>
          <Col span={12} style={{ paddingLeft: "16px" }}>
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
          placeholder={intl
            .get("tect_architecture_context_placeholder")
            .d("Please enter system architecture context information")}
        ></TextArea>
      </Layout>
      <Layout className="right-container">
        <Space
          style={{ width: "100%", padding: "16px", justifyContent: "flex-end" }}
        >
          <Space>
            <Button icon={<EditOutlined />}>
              {intl.get("tect_architecture_btn_edit").d("Edit")}
            </Button>
            <Button icon={<FullscreenOutlined />}>
              {intl.get("tect_architecture_btn_full_screen").d("Full Screen")}
            </Button>
            <Button icon={<ExportOutlined />}>
              {intl.get("tect_architecture_btn_export").d("Export")}
            </Button>
          </Space>
        </Space>
        <Divider style={{ margin: "10px 0" }} />
        <div className="graph-preview">
          <MarkdownPreview loading={loading} content={getSampleContent()} />
        </div>
      </Layout>
    </Layout>
  );
};

export default TechArchitectApp;
