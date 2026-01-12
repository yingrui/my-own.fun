import React from "react";
import { Button, Form, Input, Layout, Select } from "antd";
import "./index.css";
import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

interface BACopilotSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const BACopilotSettings: React.FC<BACopilotSettingsProps> = ({
  config,
  onSaveSettings,
}) => {
  const [form] = Form.useForm();

  const onSave = async () => {
    onSaveSettings(await form.validateFields());
  };

  return (
    <Layout className={"ba-copilot-app"}>
      <div className={"ba-copilot"}>
        <div className="form-container">
          <Form
            name="ba-copilot"
            layout="vertical"
            initialValues={config}
            form={form}
            onFinish={onSave}
            autoComplete="off"
          >
            <Form.Item
              name="baCopilotKnowledgeApi"
              label={intl.get("baCopilotKnowledgeApi").d("Knowledge API")}
              rules={[{ type: "url" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="baCopilotApi"
              label={intl.get("baCopilotApi").d("Copilot API")}
              rules={[{ type: "url" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="baCopilotTechDescription"
              label={intl
                .get("baCopilotTechDescription")
                .d("Technical Description")}
            >
              <Input.TextArea style={{ height: 120 }} />
            </Form.Item>
            <Form.Item label={null}>
              <Button key="create" type="primary" htmlType="submit">
                {intl.get("save").d("Save")}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default BACopilotSettings;
