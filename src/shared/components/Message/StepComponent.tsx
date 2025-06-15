import React from "react";
import ReactMarkdown from "react-markdown";
import CodeBlock, {
  rehypePlugins,
  remarkPlugins,
} from "@src/shared/components/Message/MarkDownBlock/CodeBlock";
import Interaction, { Step } from "@src/shared/agents/core/Interaction";
import { Typography, Space, Divider, Collapse } from "antd";
import { ToolOutlined } from "@ant-design/icons";
import ExpandableJsonMarkdown from "./ExpandableJsonMarkdown";

const { Text, Paragraph } = Typography;

interface StepComponentProps {
  step: Step;
  interaction: Interaction;
}

const StepComponent: React.FC<StepComponentProps> = ({ step, interaction }) => {
  const renderMarkdown = (content: string) => (
    <ReactMarkdown
      components={{
        code: (props) => {
          return <CodeBlock {...props} loading={false} />;
        },
      }}
      rehypePlugins={rehypePlugins as any}
      remarkPlugins={remarkPlugins as any}
    >
      {content.replaceAll(/<[/]?think>/g, "")}
    </ReactMarkdown>
  );

  const renderActionContent = (step: Step) => {
    return (
      <>
        {step.type === "execute" && step.action && (
          <>
            {renderMarkdown(
              `\`${step.action}\`${step.arguments ? ` with arguments: \n\`\`\`json\n${JSON.stringify(step.arguments, null, 2)}\n\`\`\`` : ""}`,
            )}
          </>
        )}

        {step.actionResult && Object.keys(step.actionResult).length > 0 && (
          <>
            <Divider style={{ margin: "8px 0" }} />
            <ExpandableJsonMarkdown
              content={step.actionResult}
              maxLength={500}
              maxLines={5}
              defaultExpanded={false}
            />
          </>
        )}
      </>
    );
  };

  const hasActionContent = () => {
    return (
      (step.type === "execute" && step.action) ||
      (step.actionResult && Object.keys(step.actionResult).length > 0)
    );
  };

  const items = hasActionContent()
    ? [
        {
          key: "action",
          label: "More details",
          children: renderActionContent(step),
        },
      ]
    : [];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {step.reasoning && renderMarkdown(step.reasoning)}

      {step.content && (
        <>
          <Divider style={{ margin: "8px 0" }} />
          {renderMarkdown(step.content)}
        </>
      )}

      {step.error && (
        <>
          <Divider style={{ margin: "8px 0" }} />
          <Text strong type="danger">
            Error:
          </Text>
          <Paragraph type="danger">{step.error.message}</Paragraph>
        </>
      )}

      {hasActionContent() && (
        <Collapse
          items={items}
          ghost={true}
          expandIcon={() => <ToolOutlined />}
        />
      )}
    </Space>
  );
};

export default StepComponent;
