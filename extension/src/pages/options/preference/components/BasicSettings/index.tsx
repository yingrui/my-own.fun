import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button, Card, Checkbox, Divider, Input, Select, InputNumber, Radio } from "antd";
import { PlusOutlined, ApiOutlined, RobotOutlined, SettingOutlined } from "@ant-design/icons";
import "./index.css";
import type { GluonConfigure, ModelEntry } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

const CAPABILITY_KEYS: (keyof ModelEntry["capabilities"])[] = [
  "chat",
  "tools",
  "thinking",
  "vision",
  "embedding",
];

const DEFAULT_CAPABILITIES: ModelEntry["capabilities"] = {
  chat: true,
  tools: false,
  thinking: false,
  vision: false,
  embedding: false,
};

function newModelEntry(overrides?: Partial<ModelEntry>): ModelEntry {
  return {
    id: overrides?.id ?? `model-${crypto.randomUUID?.()?.slice(0, 8) ?? Date.now()}`,
    name: overrides?.name ?? "",
    providerId: overrides?.providerId ?? "",
    capabilities: overrides?.capabilities ?? { ...DEFAULT_CAPABILITIES },
    isDefault: overrides?.isDefault ?? false,
  };
}

interface BasicSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const defaultModelsFallback: ModelEntry[] = [
  newModelEntry({ id: "glm-4-plus", name: "GLM-4 Plus", capabilities: { chat: true, tools: true, thinking: false, vision: false, embedding: false }, isDefault: true }),
  newModelEntry({ id: "glm-4v-plus", name: "GLM-4V Plus", capabilities: { chat: true, tools: false, thinking: false, vision: true, embedding: false } }),
];

const BasicSettings: React.FC<BasicSettingsProps> = ({ config, onSaveSettings }) => {
  const [apiKey, setApiKey] = useState(config.apiKey ?? "");
  const [baseURL, setBaseURL] = useState(config.baseURL ?? "");
  const [organization, setOrganization] = useState(config.organization ?? "");
  const [models, setModels] = useState<ModelEntry[]>(
    () => (config.models?.length ? config.models : defaultModelsFallback)
  );
  const [defaultModelId, setDefaultModelId] = useState(
    () =>
      config.models?.find((m) => m.isDefault)?.id ??
      config.models?.[0]?.id ??
      defaultModelsFallback.find((m) => m.isDefault)?.id ??
      defaultModelsFallback[0]?.id ??
      ""
  );
  const [defaultModel, setDefaultModel] = useState(config.defaultModel ?? "");
  const [reasoningModel, setReasoningModel] = useState(config.reasoningModel ?? "");
  const [toolsCallModel, setToolsCallModel] = useState(config.toolsCallModel ?? "");
  const [multimodalModel, setMultimodalModel] = useState(config.multimodalModel ?? "");
  const [contextLength, setContextLength] = useState(config.contextLength ?? 5);
  const [language, setLanguage] = useState(config.language === "en" || config.language === "zh" ? config.language : "en");

  const modelsByCapability = useMemo(
    () => (cap: keyof ModelEntry["capabilities"]) =>
      models.filter((m) => m.capabilities?.[cap]).map((m) => ({ value: m.id, label: m.name || m.id })),
    [models]
  );

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const modelsNorm = models.map((m, i) => ({
      ...m,
      isDefault: m.id === defaultModelId || (defaultModelId == null && i === 0),
    }));
    onSaveSettings({
      ...config,
      apiKey,
      baseURL,
      organization,
      models: modelsNorm,
      defaultModel: defaultModel || "",
      reasoningModel: reasoningModel ?? "",
      toolsCallModel: toolsCallModel ?? "",
      multimodalModel: multimodalModel ?? "",
      contextLength,
      language,
    });
  }, [
    apiKey,
    baseURL,
    organization,
    models,
    defaultModelId,
    defaultModel,
    reasoningModel,
    toolsCallModel,
    multimodalModel,
    contextLength,
    language,
  ]);

  const updateModel = (index: number, patch: Partial<ModelEntry>) => {
    setModels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addModel = () => {
    setModels((prev) => [...prev, newModelEntry()]);
  };

  const removeModel = (index: number) => {
    setModels((prev) => prev.filter((_, i) => i !== index));
    const removedId = models[index]?.id;
    if (removedId === defaultModelId && models.length > 1) {
      const nextIdx = index === 0 ? 1 : index - 1;
      setDefaultModelId(models[nextIdx]?.id ?? "");
    }
  };

  return (
    <div className="basic-settings-app">
      <div className="basic-settings">
        <div className="form-container">
          <div className="basic-settings-form">
            <div className="basic-settings-grid">
              {/* API configuration - left column */}
              <Card size="small" className="basic-settings-section basic-settings-section-api" title={<><ApiOutlined /> {intl.get("basic").d("Basic")}</>}>
                <div className="basic-settings-field-wrap">
                  <label className="basic-settings-label">{intl.get("apiKey").d("API Key")}</label>
                  <Input.Password
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="basic-settings-field-wrap">
                  <label className="basic-settings-label">{intl.get("baseURL").d("Base URL")}</label>
                  <Input
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="basic-settings-field-wrap">
                  <label className="basic-settings-label">{intl.get("organization").d("Organization")}</label>
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="your team or your personal information"
                  />
                </div>
              </Card>

              {/* Model registry - right column */}
              <Card size="small" className="basic-settings-section basic-settings-section-models" title={<><RobotOutlined /> {intl.get("models").d("Models")}</>}>
                <div className="model-list-section">
                  <div className="model-table-wrapper">
                    <table className="model-table">
                      <thead>
                        <tr>
                          <th className="col-name">{intl.get("model_name").d("Name")}</th>
                          <th className="col-id">{intl.get("model_id").d("ID")}</th>
                          <th className="col-caps">{intl.get("model_cap_chat").d("Chat")}</th>
                          <th className="col-caps">{intl.get("model_cap_tools").d("Tools")}</th>
                          <th className="col-caps">{intl.get("model_cap_thinking").d("Thinking")}</th>
                          <th className="col-caps">{intl.get("model_cap_vision").d("Vision")}</th>
                          <th className="col-caps">{intl.get("model_cap_embedding").d("Embedding")}</th>
                          <th className="col-default">{intl.get("model_default").d("Default")}</th>
                          <th className="col-actions">{intl.get("template_actions").d("Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((model, index) => (
                          <tr key={model.id}>
                            <td className="col-name">
                              <Input
                                size="small"
                                value={model.name}
                                onChange={(e) => updateModel(index, { name: e.target.value })}
                                placeholder={intl.get("model_name_placeholder").d("Display name")}
                              />
                            </td>
                            <td className="col-id">
                              <Input
                                size="small"
                                value={model.id}
                                onChange={(e) => updateModel(index, { id: e.target.value })}
                                placeholder="e.g. glm-4-plus"
                              />
                            </td>
                            {CAPABILITY_KEYS.map((cap) => (
                              <td key={cap} className="col-caps">
                                <Checkbox
                                  checked={model.capabilities[cap]}
                                  onChange={(e) =>
                                    updateModel(index, {
                                      capabilities: { ...model.capabilities, [cap]: e.target.checked },
                                    })
                                  }
                                />
                              </td>
                            ))}
                            <td className="col-default">
                              <Radio
                                checked={defaultModelId === model.id}
                                onChange={() => setDefaultModelId(model.id)}
                              />
                            </td>
                            <td className="col-actions">
                              <Button type="text" size="small" danger onClick={() => removeModel(index)}>
                                {intl.get("model_remove").d("Remove")}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button type="dashed" onClick={addModel} block icon={<PlusOutlined />} className="model-add-btn">
                    {intl.get("model_add").d("Add model")}
                  </Button>
                </div>

                <Divider orientation="left" plain className="model-overrides-divider">
                  {intl.get("defaultModel").d("GPT Model")} / {intl.get("reasoningModel").d("Reasoning")} / {intl.get("toolsCallModel").d("Tools")} / {intl.get("multimodalModel").d("Vision")}
                </Divider>
                <div className="model-overrides-grid">
                  <div className="basic-settings-field-wrap">
                    <label className="basic-settings-label">{intl.get("defaultModel").d("Chat model")}</label>
                    <Select
                      size="small"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={intl.get("defaultModel_placeholder").d("Default chat model")}
                      options={modelsByCapability("chat")}
                      value={defaultModel || undefined}
                      onChange={(v) => setDefaultModel(v ?? "")}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="basic-settings-field-wrap">
                    <label className="basic-settings-label">{intl.get("reasoningModel").d("Reasoning")}</label>
                    <Select
                      size="small"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={intl.get("reasoningModel_placeholder").d("Reasoning / thinking model")}
                      options={modelsByCapability("thinking")}
                      value={reasoningModel || undefined}
                      onChange={(v) => setReasoningModel(v ?? "")}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="basic-settings-field-wrap">
                    <label className="basic-settings-label">{intl.get("toolsCallModel").d("Tools")}</label>
                    <Select
                      size="small"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={intl.get("toolsCallModel_placeholder").d("Tool-calling model")}
                      options={modelsByCapability("tools")}
                      value={toolsCallModel || undefined}
                      onChange={(v) => setToolsCallModel(v ?? "")}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="basic-settings-field-wrap">
                    <label className="basic-settings-label">{intl.get("multimodalModel").d("Vision")}</label>
                    <Select
                      size="small"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder={intl.get("multimodalModel_placeholder").d("Vision / multimodal model")}
                      options={modelsByCapability("vision")}
                      value={multimodalModel || undefined}
                      onChange={(v) => setMultimodalModel(v ?? "")}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Other settings - full width */}
            <Card size="small" className="basic-settings-section basic-settings-section-other" title={<><SettingOutlined /> {intl.get("contextLength").d("Context Length")} & {intl.get("language").d("Language")}</>}>
              <div className="other-settings-row">
                <div className="other-settings-field basic-settings-field-wrap">
                  <label className="basic-settings-label">{intl.get("contextLength").d("Context Length")}</label>
                  <InputNumber
                    min={0}
                    max={20}
                    value={contextLength}
                    onChange={(v) => setContextLength(v ?? 5)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div className="other-settings-field basic-settings-field-wrap">
                  <label className="basic-settings-label">{intl.get("language").d("Language")}</label>
                  <Select
                    value={language}
                    onChange={(v) => setLanguage(v ?? "en")}
                    options={[
                      { value: "zh", label: intl.get("zh").d("Chinese") },
                      { value: "en", label: intl.get("en").d("English") },
                    ]}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicSettings;
