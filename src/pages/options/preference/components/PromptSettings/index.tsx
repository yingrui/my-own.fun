import React, { useState, useEffect } from "react";
import { Card, Table, Space, Tag, Button, Tooltip, message } from "antd";
import type { TableColumnsType } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import Template, { Parameter } from "@src/shared/agents/services/Template";
import "./index.css";
import intl from "react-intl-universal";

interface PromptSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({
  config,
  onSaveSettings,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const repository = new TemplateRepository(chrome.storage.local);

  const getTemplates = async () => {
    try {
      setLoading(true);
      const templateRecords = await repository.findAll();
      setTemplates(templateRecords);
    } catch (error) {
      message.error(
        intl.get("template_load_error").d("Failed to load templates"),
      );
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTemplates();
  }, []);

  const deleteTemplate = async (template: Template) => {
    try {
      await repository.delete(template.id);
      message.success(
        intl.get("template_delete_success").d("Template deleted successfully"),
      );
      await getTemplates();
    } catch (error) {
      message.error(
        intl.get("template_delete_error").d("Failed to delete template"),
      );
      console.error("Failed to delete template:", error);
    }
  };

  const columns: TableColumnsType<Template> = [
    {
      title: intl.get("template_name").d("Name"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: intl.get("template_agent").d("Agent"),
      dataIndex: "agent",
      key: "agent",
      filters: [
        { text: "CodeReviewer", value: "CodeReviewer" },
        { text: "BugAnalyzer", value: "BugAnalyzer" },
        { text: "Documentation", value: "Documentation" },
      ],
      onFilter: (value, record) => record.agent === value,
    },
    {
      title: intl.get("template_parameters").d("Parameters"),
      key: "parameters",
      dataIndex: "parameters",
      render: (_, { parameters }) => (
        <>
          {parameters?.map((param: Parameter) => (
            <Tooltip
              key={param.name}
              title={`${param.type}${param.defaultValue ? ` (default: ${param.defaultValue})` : ""}`}
            >
              <Tag color="blue" icon={<CodeOutlined />}>
                {param.name}
              </Tag>
            </Tooltip>
          ))}
        </>
      ),
    },
    {
      title: intl.get("template_content").d("Content"),
      dataIndex: "template",
      key: "template",
      render: (text) => (
        <Tooltip title={text}>
          <span
            style={{
              display: "block",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: intl.get("template_actions").d("Actions"),
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteTemplate(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="prompt-settings">
      <Card
        title={intl.get("template_management").d("Template Management")}
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            {intl.get("template_add").d("Add Template")}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default PromptSettings;
