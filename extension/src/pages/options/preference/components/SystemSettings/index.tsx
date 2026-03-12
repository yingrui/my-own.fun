import React from "react";
import { Button, Form, InputNumber, Layout, Select } from "antd";
import "./index.css";
import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

interface SystemSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({
  config,
  onSaveSettings,
}) => {
  const [form] = Form.useForm();
  const locale = config.language === "en" || config.language === "English" ? "en" : "zh";

  const onSave = async () => {
    onSaveSettings(await form.validateFields());
  };

  return (
    <Layout className={"system-settings-app"}>
      <div className={"system-settings"}>
        <div className="form-container">
          <h3 className="system-settings-title">{intl.get("system").d("System")}</h3>
          <Form
            name="system"
            layout="vertical"
            initialValues={{ ...config, language: locale }}
            form={form}
            onFinish={onSave}
            autoComplete="off"
          >
            <Form.Item
              name="language"
              label={intl.get("language").d("Language")}
            >
              <Select
                options={[
                  { value: "zh", label: intl.get("zh").d("Chinese") },
                  { value: "en", label: intl.get("en").d("English") },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="contextLength"
              label={intl.get("contextLength").d("Context Length")}
            >
              <InputNumber min={0} max={20} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="logLevel"
              label={intl.get("logLevel").d("Log Level")}
            >
              <Select
                options={[
                  { value: "debug", label: "Debug" },
                  { value: "info", label: "Info" },
                  { value: "warn", label: "Warning" },
                  { value: "error", label: "Error" },
                ]}
              />
            </Form.Item>
            <Form.Item label={null} className="system-settings-actions">
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

export default SystemSettings;
