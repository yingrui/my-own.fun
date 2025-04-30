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
import PromptTemplate, {
  Parameter,
} from "@src/shared/agents/services/PromptTemplate";
import "./index.css";
import intl from "react-intl-universal";
import _ from "lodash";

interface PromptSettingsProps {
  config: GluonConfigure;
}

interface EditTemplateForm {
  name: string;
  class: string;
  template: string;
  parameters: string;
  signature: string;
}

const PromptSettings: React.FC<PromptSettingsProps> = ({ config }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null,
  );
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

  const deleteTemplate = async (template: PromptTemplate) => {
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

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      class: template.class,
      template: _.isEmpty(template.modifiedTemplate)
        ? template.template
        : template.modifiedTemplate,
      parameters: JSON.stringify(template.parameters),
      signature: template.signature,
    });
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingTemplate) {
        const updatedTemplate = new PromptTemplate({
          ...editingTemplate,
          modifiedTemplate: values.template,
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

  const getTemplateContent = (template: PromptTemplate) => {
    if (template.allowEmptyTemplate) {
      return template.modifiedTemplate;
    }
    return _.isEmpty(template.modifiedTemplate)
      ? template.template
      : template.modifiedTemplate;
  };

  const columns: TableColumnsType<PromptTemplate> = [
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
      title: intl.get("template_class_name").d("Class Name"),
      dataIndex: "class",
      key: "class",
    },
    {
      title: intl.get("template_parameters").d("Parameters"),
      key: "parameters",
      dataIndex: "parameters",
      render: (_, { parameters }) => (
        <>
          {parameters?.map((param: Parameter) => (
            <Tooltip key={param.name} title={JSON.stringify(param, null, 2)}>
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
      render: (text, record) => (
        <Tooltip
          title={
            _.isEmpty(record.modifiedTemplate) ? text : record.modifiedTemplate
          }
        >
          <span
            style={{
              display: "block",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getTemplateContent(record)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: intl.get("template_allow_empty").d("Allow Empty"),
      dataIndex: "allowEmptyTemplate",
      key: "allowEmptyTemplate",
      render: (allowEmpty: boolean) => (
        <Tag color={allowEmpty ? "green" : "red"}>
          {allowEmpty ? intl.get("yes").d("Yes") : intl.get("no").d("No")}
        </Tag>
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

          <Form.Item
            name="class"
            label={intl.get("template_class_name").d("Class Name")}
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="template"
            label={`${intl.get("template_content").d("Content")} ${_.isEmpty(editingTemplate?.modifiedTemplate) ? intl.get("original_template_content").d("(Original Template)") : ""}`}
            rules={[
              {
                validator: (_, value) => {
                  if (editingTemplate?.allowEmptyTemplate) {
                    return Promise.resolve();
                  }
                  if (!value || value.trim() === "") {
                    return Promise.reject(
                      intl
                        .get("template_content_required")
                        .d("Please input template content"),
                    );
                  }
                  return Promise.resolve();
                },
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
