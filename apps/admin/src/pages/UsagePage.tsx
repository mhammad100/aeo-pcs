import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import { api, ApiError } from "@/lib/api";
import type { CostRate, UsageProfitSummary } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateModal, setRateModal] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUsageSummary(30);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRate(values: {
    model: string;
    inputPer1MTokens: number;
    outputPer1MTokens: number;
    currency?: string;
  }) {
    try {
      await api.upsertCostRate(values);
      message.success("Cost rate saved");
      setRateModal(false);
      form.resetFields();
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  const t = summary?.totals;

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Usage & profit
      </Title>
      <Paragraph type="secondary">
        Token usage from Claude calls over the last 30 days, estimated cost vs paid invoice revenue.
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Calls</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t?.calls ?? "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Est. LLM cost</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t ? `$${t.estimatedCost.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Invoice revenue</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t ? `$${t.subscriptionRevenue.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Margin</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t ? `$${t.margin.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={load}>Refresh</Button>
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            form.setFieldsValue({ currency: "USD", inputPer1MTokens: 3, outputPer1MTokens: 15 });
            setRateModal(true);
          }}
        >
          Upsert cost rate
        </Button>
      </Space>

      <Title level={4} style={{ color: "#EDEAE1" }}>
        By feature
      </Title>
      <Table
        loading={loading}
        rowKey="key"
        pagination={false}
        style={{ marginBottom: 24 }}
        dataSource={summary?.byFeature || []}
        columns={[
          { title: "Feature", dataIndex: "key" },
          { title: "Calls", dataIndex: "calls" },
          { title: "Input tokens", dataIndex: "inputTokens" },
          { title: "Output tokens", dataIndex: "outputTokens" },
          {
            title: "Est. cost",
            dataIndex: "estimatedCost",
            render: (v: number) => `$${v.toFixed(4)}`,
          },
        ]}
      />

      <Title level={4} style={{ color: "#EDEAE1" }}>
        By model
      </Title>
      <Table
        loading={loading}
        rowKey="key"
        pagination={false}
        style={{ marginBottom: 24 }}
        dataSource={summary?.byModel || []}
        columns={[
          { title: "Model", dataIndex: "key" },
          { title: "Calls", dataIndex: "calls" },
          { title: "Input tokens", dataIndex: "inputTokens" },
          { title: "Output tokens", dataIndex: "outputTokens" },
          {
            title: "Est. cost",
            dataIndex: "estimatedCost",
            render: (v: number) => `$${v.toFixed(4)}`,
          },
        ]}
      />

      <Title level={4} style={{ color: "#EDEAE1" }}>
        Cost rates
      </Title>
      <Table
        loading={loading}
        rowKey="id"
        pagination={false}
        dataSource={summary?.costRates || []}
        columns={[
          { title: "Model", dataIndex: "model" },
          { title: "Input / 1M", dataIndex: "inputPer1MTokens" },
          { title: "Output / 1M", dataIndex: "outputPer1MTokens" },
          { title: "Currency", dataIndex: "currency" },
          {
            title: "",
            render: (_: unknown, r: CostRate) => (
              <Button
                type="link"
                onClick={() => {
                  form.setFieldsValue(r);
                  setRateModal(true);
                }}
              >
                Edit
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title="Cost rate"
        open={rateModal}
        onCancel={() => setRateModal(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={saveRate}>
          <Form.Item name="model" label="Model" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="inputPer1MTokens" label="Input $ / 1M tokens" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="outputPer1MTokens"
            label="Output $ / 1M tokens"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="currency" label="Currency">
            <Input maxLength={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
