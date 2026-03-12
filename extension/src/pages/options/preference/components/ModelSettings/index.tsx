import React, { useState, useEffect, useMemo } from "react";
import { Button, Checkbox, Input, Modal, Radio, Typography } from "antd";
import { PlusOutlined, RobotOutlined, DeleteOutlined, SearchOutlined, EditOutlined, ApiOutlined } from "@ant-design/icons";
import "./index.css";
import type { GluonConfigure, ModelEntry, ProviderEntry } from "@src/shared/storages/gluonConfig";
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

function newProviderEntry(overrides?: Partial<ProviderEntry>): ProviderEntry {
  return {
    id: overrides?.id ?? `provider-${crypto.randomUUID?.()?.slice(0, 8) ?? Date.now()}`,
    name: overrides?.name ?? "",
    baseURL: overrides?.baseURL ?? "",
    apiKey: overrides?.apiKey ?? "",
    organization: overrides?.organization ?? "",
  };
}

function newModelEntry(providerId: string, overrides?: Partial<ModelEntry>): ModelEntry {
  return {
    id: overrides?.id ?? `model-${crypto.randomUUID?.()?.slice(0, 8) ?? Date.now()}`,
    name: overrides?.name ?? "",
    providerId: overrides?.providerId ?? providerId,
    capabilities: overrides?.capabilities ?? { ...DEFAULT_CAPABILITIES },
    isDefault: overrides?.isDefault ?? false,
  };
}

interface ModelSettingsProps {
  config: GluonConfigure;
  onSaveSettings: (values: any) => void;
}

const ModelSettings: React.FC<ModelSettingsProps> = ({ config, onSaveSettings }) => {
  const [providers, setProviders] = useState<ProviderEntry[]>(() =>
    config.providers?.length ? config.providers : [newProviderEntry({ id: "default", name: "Default" })]
  );
  const [models, setModels] = useState<ModelEntry[]>(() =>
    config.models?.length ? config.models : [newModelEntry("default", { id: "glm-4-plus", name: "GLM-4 Plus", capabilities: { chat: true, tools: true, thinking: false, vision: false, embedding: false }, isDefault: true })]
  );
  const [defaultModelId, setDefaultModelId] = useState<string>(
    () =>
      config.defaultModel ||
      config.models?.find((m) => m.isDefault)?.id ||
      config.models?.[0]?.id ||
      ""
  );
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(config.providers?.[0]?.id ?? null);
  const [providerSearch, setProviderSearch] = useState("");
  const [editingProviderDraft, setEditingProviderDraft] = useState<ProviderEntry | null>(null);

  const selectedProviderIndex = providers.findIndex((p) => p.id === selectedProviderId);
  const selectedProvider = selectedProviderIndex >= 0 ? providers[selectedProviderIndex] : null;

  const filteredProviders = useMemo(
    () =>
      providerSearch.trim()
        ? providers.filter((p) => (p.name || p.id).toLowerCase().includes(providerSearch.trim().toLowerCase()))
        : providers,
    [providers, providerSearch]
  );

  const providerModels = useMemo(
    () => (selectedProviderId ? models.filter((m) => m.providerId === selectedProviderId) : []),
    [models, selectedProviderId]
  );

  useEffect(() => {
    if (selectedProviderId == null && providers.length > 0) {
      setSelectedProviderId(providers[0].id);
    }
  }, [selectedProviderId, providers.length]);

  const updateProvider = (index: number, patch: Partial<ProviderEntry>) => {
    setProviders((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addProvider = () => {
    const entry = newProviderEntry();
    setProviders((prev) => [...prev, entry]);
    setSelectedProviderId(entry.id);
  };

  const removeProvider = (index: number) => {
    const provider = providers[index];
    if (providers.length <= 1) return;
    setProviders((prev) => prev.filter((_, i) => i !== index));
    setModels((prev) => prev.filter((m) => m.providerId !== provider.id));
    if (selectedProviderId === provider.id) {
      const nextIdx = index === 0 ? 1 : index - 1;
      setSelectedProviderId(providers[nextIdx]?.id ?? null);
    }
    if (editingProviderDraft?.id === provider.id) setEditingProviderDraft(null);
  };

  const openEditProviderModal = (provider: ProviderEntry) => {
    setEditingProviderDraft({ ...provider });
  };

  const closeEditProviderModal = () => setEditingProviderDraft(null);

  const applyEditProvider = () => {
    if (!editingProviderDraft) return;
    const index = providers.findIndex((p) => p.id === editingProviderDraft.id);
    if (index >= 0) updateProvider(index, editingProviderDraft);
    setEditingProviderDraft(null);
  };

  const addModel = () => {
    if (!selectedProviderId) return;
    setModels((prev) => [...prev, newModelEntry(selectedProviderId)]);
  };

  const updateModel = (localIndex: number, patch: Partial<ModelEntry>) => {
    const model = providerModels[localIndex];
    if (!model) return;
    setModels((prev) =>
      prev.map((m) => (m.id === model.id && m.providerId === selectedProviderId ? { ...m, ...patch } : m))
    );
  };

  const removeModel = (modelId: string) => {
    setModels((prev) => prev.filter((m) => !(m.id === modelId && m.providerId === selectedProviderId)));
  };

  const onSave = () => {
    const modelsNorm = models.map((m, i) => ({
      ...m,
      providerId: m.providerId || providers[0]?.id,
      isDefault: m.id === defaultModelId || (defaultModelId == null && i === 0),
    }));
    const firstProvider = providers[0];
    onSaveSettings({
      ...config,
      providers,
      models: modelsNorm,
      defaultModel: defaultModelId || config.defaultModel || "",
      apiKey: firstProvider?.apiKey ?? "",
      baseURL: firstProvider?.baseURL ?? "",
      organization: firstProvider?.organization ?? "",
    });
  };

  return (
    <div className="models-page">
      <div className="models-page-body">
        {/* Left: Provider list */}
        <section className="models-panel models-panel-providers">
          <div className="provider-list-header">
            <span className="provider-list-header-title">{intl.get("model_settings_providers").d("Service providers")}</span>
            <Input
              prefix={<SearchOutlined />}
              placeholder={intl.get("model_settings_search_providers").d("Search providers...")}
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
              allowClear
              size="small"
              className="provider-search"
            />
          </div>
          <div className="provider-list">
            {filteredProviders.map((provider, idx) => {
              const actualIndex = providers.findIndex((p) => p.id === provider.id);
              const isSelected = provider.id === selectedProviderId;
              return (
                <div
                  key={provider.id}
                  role="button"
                  tabIndex={0}
                  className={`provider-list-item ${isSelected ? "provider-list-item--selected" : ""}`}
                  onClick={() => setSelectedProviderId(provider.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedProviderId(provider.id)}
                >
                  <span className="provider-list-item-name">
                    {provider.name || provider.id || intl.get("model_settings_unnamed").d("Unnamed")}
                  </span>
                  <div className="provider-list-item-actions">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      className="provider-list-item-edit"
                      title={intl.get("model_settings_edit_provider").d("Edit provider")}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditProviderModal(provider);
                      }}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      className="provider-list-item-remove"
                      title={intl.get("model_settings_remove_provider").d("Remove provider")}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeProvider(actualIndex);
                      }}
                      disabled={providers.length <= 1}
                    />
                  </div>
                </div>
              );
            })}
            <div className="provider-list-footer">
              <Button type="dashed" onClick={addProvider} block icon={<PlusOutlined />} className="provider-add-btn">
                {intl.get("model_settings_add_provider").d("Add provider")}
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Selected provider settings + models */}
        <section className="models-panel models-panel-models">
          {selectedProviderId && selectedProvider && selectedProviderIndex >= 0 ? (
            <>
              <div className="models-panel-header">
                <Typography.Title level={5} className="models-panel-title">
                  {selectedProvider.name || selectedProvider.id || intl.get("model_settings_unnamed").d("Unnamed")}
                </Typography.Title>
                <span className="models-panel-desc">
                  {intl.get("model_settings_providers_hint").d("Configure API and manage models for this provider.")}
                </span>
                <Button type="primary" size="small" onClick={onSave} className="models-panel-save-btn">
                  {intl.get("save").d("Save")}
                </Button>
              </div>

              <div className="model-section-header">
                <RobotOutlined /> {intl.get("models").d("Models")}
                {providerModels.length > 0 && ` (${providerModels.length})`}
              </div>

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
                    {providerModels.map((model, localIndex) => (
                        <tr key={model.id}>
                          <td className="col-name">
                            <Input
                              size="small"
                              value={model.name}
                              onChange={(e) => updateModel(localIndex, { name: e.target.value })}
                              placeholder={intl.get("model_name_placeholder").d("Display name")}
                            />
                          </td>
                          <td className="col-id">
                            <Input
                              size="small"
                              value={model.id}
                              onChange={(e) => updateModel(localIndex, { id: e.target.value })}
                              placeholder="e.g. glm-4-plus"
                            />
                          </td>
                          {CAPABILITY_KEYS.map((cap) => (
                            <td key={cap} className="col-caps">
                              <Checkbox
                                checked={model.capabilities[cap]}
                                onChange={(e) =>
                                  updateModel(localIndex, {
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
                            <Button type="text" size="small" danger onClick={() => removeModel(model.id)}>
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
            </>
          ) : (
            <div className="models-panel-empty">
              <ApiOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              <Typography.Text type="secondary">
                {intl.get("model_settings_select_provider").d("Select a provider on the left to configure its models.")}
              </Typography.Text>
            </div>
          )}
        </section>
      </div>

      <Modal
        title={intl.get("model_settings_edit_provider").d("Edit provider")}
        open={editingProviderDraft !== null}
        onCancel={closeEditProviderModal}
        onOk={applyEditProvider}
        okText={intl.get("save").d("Save")}
        cancelText={intl.get("cancel").d("Cancel")}
        destroyOnClose
        width={480}
        className="provider-edit-modal"
      >
        {editingProviderDraft && (
          <div className="provider-detail-fields">
            <label className="provider-field-label">{intl.get("provider_name").d("Name")}</label>
            <Input
              value={editingProviderDraft.name}
              onChange={(e) => setEditingProviderDraft((p) => (p ? { ...p, name: e.target.value } : null))}
              placeholder={intl.get("provider_name_placeholder").d("e.g. OpenAI")}
              className="provider-field-input"
              style={{ marginBottom: 12 }}
            />
            <label className="provider-field-label">{intl.get("baseURL").d("Base URL")}</label>
            <Input
              value={editingProviderDraft.baseURL}
              onChange={(e) => setEditingProviderDraft((p) => (p ? { ...p, baseURL: e.target.value } : null))}
              placeholder="https://api.openai.com/v1"
              className="provider-field-input"
              style={{ marginBottom: 12 }}
            />
            <label className="provider-field-label">{intl.get("apiKey").d("API Key")}</label>
            <Input.Password
              value={editingProviderDraft.apiKey}
              onChange={(e) => setEditingProviderDraft((p) => (p ? { ...p, apiKey: e.target.value } : null))}
              placeholder="••••••••"
              className="provider-field-input"
              style={{ marginBottom: 12 }}
            />
            <label className="provider-field-label">{intl.get("organization").d("Organization")}</label>
            <Input
              value={editingProviderDraft.organization ?? ""}
              onChange={(e) => setEditingProviderDraft((p) => (p ? { ...p, organization: e.target.value } : null))}
              placeholder={intl.get("organization").d("Organization")}
              className="provider-field-input"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ModelSettings;
