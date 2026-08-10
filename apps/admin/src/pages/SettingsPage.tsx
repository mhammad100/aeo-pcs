import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { api, ApiError } from "@/lib/api";
import type {
  AeoSettings,
  LlmProvider,
  TaskModelConfig,
  VisibilityModelConfig,
} from "@aeo-pcs/shared";
import { DEFAULT_USD_TO_INR_RATE } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

const PROVIDERS: { value: LlmProvider; label: string }[] = [
  { value: "google", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "perplexity", label: "Perplexity" },
  { value: "anthropic", label: "Anthropic" },
];

const PROVIDER_META: Record<LlmProvider, { label: string; color: string; bg: string }> = {
  google: { label: "Gemini", color: "#4285F4", bg: "rgba(66, 133, 244, 0.12)" },
  openai: { label: "OpenAI", color: "#10A37F", bg: "rgba(16, 163, 127, 0.12)" },
  perplexity: { label: "Perplexity", color: "#20B2AA", bg: "rgba(32, 178, 170, 0.12)" },
  anthropic: { label: "Anthropic", color: "#E8943A", bg: "rgba(232, 148, 58, 0.15)" },
};

const sectionCardStyle = {
  marginBottom: 16,
  border: "1px solid rgba(61, 90, 128, 0.45)",
  background: "linear-gradient(180deg, #1C2E50 0%, #16233E 100%)",
};

type TaskModelField = "promptGenerationModel" | "actionPlanModel";

function ProviderTag({ provider }: { provider?: LlmProvider }) {
  if (!provider) return <Text type="secondary">-</Text>;
  const meta = PROVIDER_META[provider];
  return (
    <Tag
      style={{
        margin: 0,
        border: `1px solid ${meta.color}55`,
        background: meta.bg,
        color: meta.color,
        fontSize: 11,
        lineHeight: "18px",
        padding: "0 6px",
      }}
    >
      {meta.label}
    </Tag>
  );
}

function emptyVisibilityModel(): VisibilityModelConfig {
  return {
    id: "",
    label: "",
    provider: "openai",
    modelId: "",
    enabled: true,
    inputPer1MTokens: 0,
    outputPer1MTokens: 0,
    currency: "USD",
  };
}

function ModelEditModal({
  open,
  title,
  draft,
  onDraftChange,
  onCancel,
  onSave,
  showIdFields,
}: {
  open: boolean;
  title: string;
  draft: VisibilityModelConfig | TaskModelConfig;
  onDraftChange: (next: VisibilityModelConfig | TaskModelConfig) => void;
  onCancel: () => void;
  onSave: () => void;
  showIdFields?: boolean;
}) {
  const vis = showIdFields ? (draft as VisibilityModelConfig) : null;

  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={onSave} okText="Save" width={480}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        {showIdFields && vis ? (
          <Row gutter={8}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Internal ID
              </Text>
              <Input
                size="small"
                value={vis.id}
                onChange={(e) =>
                  onDraftChange({ ...vis, id: e.target.value } as VisibilityModelConfig)
                }
                style={{ marginTop: 4 }}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Display label
              </Text>
              <Input
                size="small"
                value={vis.label}
                onChange={(e) =>
                  onDraftChange({ ...vis, label: e.target.value } as VisibilityModelConfig)
                }
                style={{ marginTop: 4 }}
              />
            </Col>
          </Row>
        ) : null}
        <Row gutter={8}>
          <Col span={10}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Provider
            </Text>
            <Select
              size="small"
              style={{ width: "100%", marginTop: 4 }}
              options={PROVIDERS}
              value={draft.provider}
              onChange={(v) => onDraftChange({ ...draft, provider: v })}
            />
          </Col>
          <Col span={14}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Model ID
            </Text>
            <Input
              size="small"
              value={draft.modelId}
              onChange={(e) => onDraftChange({ ...draft, modelId: e.target.value })}
              style={{ marginTop: 4 }}
            />
          </Col>
        </Row>
        <Row gutter={8}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Input $/1M
            </Text>
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: "100%", marginTop: 4 }}
              value={draft.inputPer1MTokens}
              onChange={(v) => onDraftChange({ ...draft, inputPer1MTokens: Number(v) || 0 })}
            />
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Output $/1M
            </Text>
            <InputNumber
              size="small"
              min={0}
              step={0.01}
              style={{ width: "100%", marginTop: 4 }}
              value={draft.outputPer1MTokens}
              onChange={(v) => onDraftChange({ ...draft, outputPer1MTokens: Number(v) || 0 })}
            />
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Currency
            </Text>
            <Input
              size="small"
              maxLength={3}
              value={draft.currency}
              onChange={(e) =>
                onDraftChange({ ...draft, currency: e.target.value.toUpperCase() })
              }
              style={{ marginTop: 4 }}
            />
          </Col>
        </Row>
      </Space>
    </Modal>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visibility");
  const [settings, setSettings] = useState<AeoSettings | null>(null);

  const [visModal, setVisModal] = useState<
    { open: false } | { open: true; mode: "add" } | { open: true; mode: "edit"; index: number }
  >({ open: false });
  const [visDraft, setVisDraft] = useState<VisibilityModelConfig>(emptyVisibilityModel());

  const [taskModal, setTaskModal] = useState<{ open: false } | { open: true; field: TaskModelField }>(
    { open: false }
  );
  const [taskDraft, setTaskDraft] = useState<TaskModelConfig>({
    provider: "openai",
    modelId: "",
    enabled: true,
    inputPer1MTokens: 0,
    outputPer1MTokens: 0,
    currency: "USD",
  });

  const visibilityModels = settings?.visibilityModels ?? [];
  const promptsPerRun = settings?.promptsPerRun ?? 5;
  const usdToInrRate = settings?.usdToInrRate ?? DEFAULT_USD_TO_INR_RATE;
  const promptModel = settings?.promptGenerationModel;
  const actionPlanModel = settings?.actionPlanModel;

  const enabledVisibility = useMemo(
    () => visibilityModels.filter((m) => m.enabled !== false).length,
    [visibilityModels]
  );
  const callsPerRun = promptsPerRun * enabledVisibility;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAeoSettings();
      setSettings(res.settings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function persistSettings(next: AeoSettings, successMessage = "Settings saved") {
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateAeoSettings(next);
      setSettings(res.settings);
      message.success(successMessage);
      return res.settings;
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Save failed";
      setError(msg);
      message.error(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(index: number, enabled: boolean) {
    if (!settings) return;
    const list = [...settings.visibilityModels];
    list[index] = { ...list[index], enabled };
    await persistSettings({ ...settings, visibilityModels: list });
  }

  async function removeVisibility(index: number) {
    if (!settings) return;
    if (settings.visibilityModels.length <= 1) {
      message.warning("At least one visibility model is required");
      return;
    }
    const list = [...settings.visibilityModels];
    list.splice(index, 1);
    await persistSettings({ ...settings, visibilityModels: list });
  }

  async function saveVisibilityModal() {
    if (!settings || !visModal.open) return;
    if (!visDraft.id.trim() || !visDraft.label.trim() || !visDraft.modelId.trim()) {
      message.warning("ID, label, and model ID are required");
      return;
    }
    const list = [...settings.visibilityModels];
    if (visModal.mode === "add") {
      if (list.some((m) => m.id === visDraft.id)) {
        message.warning("Internal ID must be unique");
        return;
      }
      list.push(visDraft);
    } else {
      const dup = list.findIndex((m, i) => m.id === visDraft.id && i !== visModal.index);
      if (dup >= 0) {
        message.warning("Internal ID must be unique");
        return;
      }
      list[visModal.index] = visDraft;
    }
    await persistSettings({ ...settings, visibilityModels: list });
    setVisModal({ open: false });
  }

  async function toggleTask(field: TaskModelField, enabled: boolean) {
    if (!settings) return;
    await persistSettings({
      ...settings,
      [field]: { ...settings[field], enabled },
    });
  }

  function openTaskEdit(field: TaskModelField) {
    if (!settings) return;
    setTaskDraft({ ...settings[field] });
    setTaskModal({ open: true, field });
  }

  async function saveTaskModal() {
    if (!settings || !taskModal.open) return;
    if (!taskDraft.modelId.trim()) {
      message.warning("Model ID is required");
      return;
    }
    await persistSettings({
      ...settings,
      [taskModal.field]: taskDraft,
    });
    setTaskModal({ open: false });
  }

  async function updatePromptsPerRun(value: number | null) {
    if (!settings) return;
    await persistSettings({ ...settings, promptsPerRun: Number(value) || 1 });
  }

  async function updateUsdToInrRate(value: number | null) {
    if (!settings) return;
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate < 0.01) {
      message.warning("USD → INR rate must be greater than 0");
      return;
    }
    await persistSettings({ ...settings, usdToInrRate: rate }, "FX rate saved");
  }

  type VisRow = VisibilityModelConfig & { key: number; index: number };
  const visRows: VisRow[] = visibilityModels.map((m, index) => ({ ...m, key: index, index }));

  const visColumns: ColumnsType<VisRow> = [
    {
      title: "Active",
      width: 64,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enabled !== false}
          onChange={(checked) => toggleVisibility(row.index, checked)}
        />
      ),
    },
    { title: "Label", dataIndex: "label", width: 110, ellipsis: true },
    {
      title: "Provider",
      dataIndex: "provider",
      width: 90,
      render: (p: LlmProvider) => <ProviderTag provider={p} />,
    },
    {
      title: "Model ID",
      dataIndex: "modelId",
      ellipsis: true,
      render: (id: string) => (
        <Text code style={{ fontSize: 11, background: "transparent", color: "#b8c4be" }}>
          {id}
        </Text>
      ),
    },
    {
      title: "Pricing",
      width: 100,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          ${row.inputPer1MTokens}/${row.outputPer1MTokens}
        </Text>
      ),
    },
    {
      title: "",
      width: 48,
      align: "right",
      render: (_, row) => (
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setVisDraft({ ...row });
              setVisModal({ open: true, mode: "edit", index: row.index });
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: "",
      width: 36,
      render: (_, row) => (
        <Button
          type="text"
          size="small"
          danger
          disabled={visibilityModels.length <= 1}
          onClick={() => removeVisibility(row.index)}
        >
          ×
        </Button>
      ),
    },
  ];

  type TaskRow = TaskModelConfig & { key: string; name: string; field: TaskModelField };
  const taskColumns: ColumnsType<TaskRow> = [
    {
      title: "Active",
      width: 64,
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.enabled !== false}
          onChange={(checked) => toggleTask(row.field, checked)}
        />
      ),
    },
    { title: "Name", dataIndex: "name", width: 140, ellipsis: true },
    {
      title: "Provider",
      dataIndex: "provider",
      width: 90,
      render: (p: LlmProvider) => <ProviderTag provider={p} />,
    },
    {
      title: "Model ID",
      dataIndex: "modelId",
      ellipsis: true,
      render: (id: string) => (
        <Text code style={{ fontSize: 11, background: "transparent", color: "#b8c4be" }}>
          {id}
        </Text>
      ),
    },
    {
      title: "Pricing",
      width: 100,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 11 }}>
          ${row.inputPer1MTokens}/${row.outputPer1MTokens}
        </Text>
      ),
    },
    {
      title: "",
      width: 48,
      align: "right",
      render: (_, row) => (
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openTaskEdit(row.field)}
          />
        </Tooltip>
      ),
    },
  ];

  const promptRows: TaskRow[] = promptModel
    ? [{ ...promptModel, key: "prompt", name: "Prompt generation", field: "promptGenerationModel" }]
    : [];

  const actionRows: TaskRow[] = actionPlanModel
    ? [{ ...actionPlanModel, key: "plan", name: "Action plan", field: "actionPlanModel" }]
    : [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 72 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Title level={2} style={{ color: "#EDEFF6", marginBottom: 4 }}>
            AEO Settings
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Configure LLM models and pricing for visibility checks, prompt generation, and action
            plans. Pricing is snapshotted onto usage events at call time.
          </Paragraph>
        </div>
        <Space size={8}>
          <Button icon={<ReloadOutlined />} onClick={load} disabled={loading || saving}>
            Reload
          </Button>
        </Space>
      </div>

      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} closable />
      )}

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : settings ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={sectionCardStyle} styles={{ body: { padding: "14px 16px" } }}>
                <Text type="secondary">Prompts per run</Text>
                <Title level={3} style={{ margin: "4px 0 0", color: "#EDEFF6" }}>
                  {promptsPerRun}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Buyer-intent questions per check
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={sectionCardStyle} styles={{ body: { padding: "14px 16px" } }}>
                <Text type="secondary">Enabled visibility models</Text>
                <Title level={3} style={{ margin: "4px 0 0", color: "#EDEFF6" }}>
                  {enabledVisibility}
                  <Text type="secondary" style={{ fontSize: 16, fontWeight: 400 }}>
                    {" "}
                    / {visibilityModels.length}
                  </Text>
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Active providers with web search
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card
                style={{ ...sectionCardStyle, borderColor: "#E8943A55" }}
                styles={{ body: { padding: "14px 16px" } }}
              >
                <Text type="secondary">API calls per check</Text>
                <Title level={3} style={{ margin: "4px 0 0", color: "#E8943A" }}>
                  {callsPerRun || "-"}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {promptsPerRun} prompts × {enabledVisibility} models
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card style={sectionCardStyle} styles={{ body: { padding: "14px 16px" } }}>
                <Text type="secondary">USD → INR (usage FX)</Text>
                <div style={{ marginTop: 8 }}>
                  <InputNumber
                    min={0.01}
                    max={1000}
                    step={0.1}
                    size="small"
                    style={{ width: 110 }}
                    value={usdToInrRate}
                    disabled={saving}
                    onChange={(v) => void updateUsdToInrRate(v)}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Converts LLM cost for profit margin
                </Text>
              </Card>
            </Col>
          </Row>

          <Card style={sectionCardStyle} styles={{ body: { padding: "12px 16px 16px" } }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              items={[
                {
                  key: "visibility",
                  label: "Visibility",
                  children: (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          AI search providers used during visibility checks
                        </Text>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setVisDraft({
                              ...emptyVisibilityModel(),
                              id: `model-${visibilityModels.length + 1}`,
                              label: "New model",
                            });
                            setVisModal({ open: true, mode: "add" });
                          }}
                        >
                          Add model
                        </Button>
                      </div>
                      <Table<VisRow>
                        size="small"
                        pagination={false}
                        columns={visColumns}
                        dataSource={visRows}
                        locale={{ emptyText: "No visibility models configured" }}
                      />
                    </div>
                  ),
                },
                {
                  key: "prompt",
                  label: "Prompt",
                  children: (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Prompts per visibility run
                        </Text>
                        <InputNumber
                          min={1}
                          max={20}
                          size="small"
                          style={{ width: 80 }}
                          value={promptsPerRun}
                          disabled={saving}
                          onChange={(v) => void updatePromptsPerRun(v)}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          LLM generates buyer-intent questions before each check
                        </Text>
                      </div>
                      <Table<TaskRow>
                        size="small"
                        pagination={false}
                        columns={taskColumns}
                        dataSource={promptRows}
                        locale={{ emptyText: "No prompt model configured" }}
                      />
                    </div>
                  ),
                },
                {
                  key: "action-plan",
                  label: "Action plan",
                  children: (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
                        Model for strategic recommendations after visibility results
                      </Text>
                      <Table<TaskRow>
                        size="small"
                        pagination={false}
                        columns={taskColumns}
                        dataSource={actionRows}
                        locale={{ emptyText: "No action plan model configured" }}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : null}

      <ModelEditModal
        open={visModal.open}
        title={
          visModal.open && visModal.mode === "edit" ? "Edit visibility model" : "Add visibility model"
        }
        draft={visDraft}
        onDraftChange={(d) => setVisDraft(d as VisibilityModelConfig)}
        onCancel={() => setVisModal({ open: false })}
        onSave={saveVisibilityModal}
        showIdFields
      />

      <ModelEditModal
        open={taskModal.open}
        title={
          taskModal.open && taskModal.field === "promptGenerationModel"
            ? "Edit prompt model"
            : "Edit action plan model"
        }
        draft={taskDraft}
        onDraftChange={(d) => setTaskDraft(d as TaskModelConfig)}
        onCancel={() => setTaskModal({ open: false })}
        onSave={saveTaskModal}
      />

      {!loading && settings && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 12,
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid rgba(61, 90, 128, 0.45)",
            background: "rgba(21, 36, 32, 0.95)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {enabledVisibility} visibility models active · {callsPerRun} calls per check · changes
            save automatically
          </Text>
          <Button size="small" onClick={load} disabled={saving}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
