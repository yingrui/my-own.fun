import React from "react";
import { Button, Form, Layout, Select } from "antd";
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

  const onSave = async () => {
    onSaveSettings(await form.validateFields());
  };

  return (
    <Layout className={"system-settings-app"}>
      <div className={"system-settings"}>
        <div className="form-container">
          <Form
            name="system"
            layout="vertical"
            initialValues={config}
            form={form}
            onFinish={onSave}
            autoComplete="off"
          >
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

export default SystemSettings;
