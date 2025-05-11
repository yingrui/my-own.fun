import React from "react";
import { Button, Form, Input, Layout, Select, InputNumber } from "antd";
import "./index.css";
import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

interface BasicSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const BasicSettings: React.FC<BasicSettingsProps> = ({
  config,
  onSaveSettings,
}) => {
  const [form] = Form.useForm();
  const locale = config.language === "en" ? "en" : "zh";

  const onSave = async () => {
    onSaveSettings(await form.validateFields());
  };

  return (
    <Layout className={"basic-settings-app"}>
      <div className={"basic-settings"}>
        <div className="form-container">
          <Form
            name="basic"
            layout="vertical"
            initialValues={config}
            form={form}
            onFinish={onSave}
            autoComplete="off"
          >
            <Form.Item
              name="apiKey"
              label={intl.get("apiKey").d("API Key")}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input type="password" />
            </Form.Item>
            <Form.Item
              name="baseURL"
              label={intl.get("baseURL").d("Base URL")}
              rules={[
                {
                  required: true,
                },
                { type: "url" },
              ]}
            >
              <Input placeholder="https://api.openai.com/v1" />
            </Form.Item>
            <Form.Item
              name="organization"
              label={intl.get("organization").d("Organization")}
            >
              <Input placeholder="your team or your personal information" />
            </Form.Item>
            <Form.Item
              name="defaultModel"
              label={intl.get("defaultModel").d("GPT Model")}
            >
              <Input placeholder="glm-4-plus" />
            </Form.Item>
            <Form.Item
              name="reasoningModel"
              label={intl.get("reasoningModel").d("Reasoning Model")}
            >
              <Input placeholder="deepseek-r1" />
            </Form.Item>
            <Form.Item
              name="toolsCallModel"
              label={intl.get("toolsCallModel").d("Tools Call Model")}
            >
              <Input placeholder="glm-4-plus" />
            </Form.Item>
            <Form.Item
              name="multimodalModel"
              label={intl.get("multimodalModel").d("Multimodal Model")}
            >
              <Input placeholder="glm-4v-plus" />
            </Form.Item>
            <Form.Item
              name="contextLength"
              label={intl.get("contextLength").d("Context Length")}
              initialValue={5}
            >
              <InputNumber min={0} max={20} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="language"
              label={intl.get("language").d("Language")}
            >
              <Select
                defaultValue={locale}
                options={[
                  { value: "zh", label: intl.get("zh").d("Chinese") },
                  { value: "en", label: intl.get("en").d("English") },
                ]}
              />
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

export default BasicSettings;
