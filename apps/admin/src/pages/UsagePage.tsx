import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Space,
  Table,
  Typography,
} from "antd";
import { api, ApiError } from "@/lib/api";
import type { UsageProfitSummary } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const t = summary?.totals;

  return (
    <div>
      <Title level={2} style={{ color: "#EDEFF6" }}>
        Usage & profit
      </Title>
      <Paragraph type="secondary">
        Token usage from LLM calls over the last 30 days, estimated cost vs paid invoice revenue.
        Model pricing is managed under Settings and snapshotted onto each usage event.
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Calls</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEFF6" }}>
              {t?.calls ?? "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Est. LLM cost</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEFF6" }}>
              {t ? `$${t.estimatedCost.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Invoice revenue</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEFF6" }}>
              {t ? `$${t.subscriptionRevenue.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Margin</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEFF6" }}>
              {t ? `$${t.margin.toFixed(2)}` : "—"}
            </Title>
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={load}>Refresh</Button>
      </Space>

      <Title level={4} style={{ color: "#EDEFF6" }}>
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

      <Title level={4} style={{ color: "#EDEFF6" }}>
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

      <Title level={4} style={{ color: "#EDEFF6" }}>
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
        ]}
      />
    </div>
  );
}
