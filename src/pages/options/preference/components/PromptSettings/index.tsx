import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Tooltip,
  message,
  Modal,
  Form,
  Input,
} from "antd";
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
}

interface EditTemplateForm {
  name: string;
  agent: string;
  template: string;
  parameters: string;
  signature: string;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ config }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form] = Form.useForm<EditTemplateForm>();
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

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      agent: template.agent,
      template: template.template,
      parameters: JSON.stringify(template.parameters),
      signature: template.signature,
    });
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingTemplate) {
        const updatedTemplate = new Template({
          ...editingTemplate,
          template: values.template,
        });
        await repository.save(updatedTemplate);
        message.success(
          intl.get("template_save_success").d("Template saved successfully"),
        );
        await getTemplates();
      }
      setIsModalOpen(false);
      setEditingTemplate(null);
      form.resetFields();
    } catch (error) {
      message.error(
        intl.get("template_save_error").d("Failed to save template"),
      );
      console.error("Failed to save template:", error);
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
  };

  const columns: TableColumnsType<Template> = [
    {
      title: intl.get("template_name").d("Name"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Tooltip title={`ID: ${record.id}`}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: intl.get("template_agent").d("Agent"),
      dataIndex: "agent",
      key: "agent",
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
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
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

      <Modal
        title={intl.get("template_edit").d("Edit Template")}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={intl.get("template_name").d("Name")}>
            <Input disabled />
          </Form.Item>

          <Form.Item name="agent" label={intl.get("template_agent").d("Agent")}>
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="template"
            label={intl.get("template_content").d("Content")}
            rules={[
              {
                required: true,
                message: intl
                  .get("template_content_required")
                  .d("Please input template content"),
              },
            ]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item
            name="parameters"
            label={intl.get("template_parameters").d("Parameters")}
          >
            <Input.TextArea
              rows={4}
              disabled
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>

          <Form.Item
            name="signature"
            label={intl.get("template_signature").d("Signature")}
          >
            <Input disabled style={{ fontFamily: "monospace" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromptSettings;
