import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import { api, ApiError } from "@/lib/api";
import type { MoneyAmount, UsageBusinessRow, UsageProfitSummary } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

function formatMoney(amount: number, currency: string, digits = 2) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}

function formatRevenueList(rows: MoneyAmount[] | undefined) {
  if (!rows?.length) return formatMoney(0, "INR");
  return rows.map((r) => formatMoney(r.amount, r.currency)).join(" · ");
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFx, setSavingFx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [fxDraft, setFxDraft] = useState<number | null>(null);

  async function load(selectedDays = days) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUsageSummary(selectedDays);
      setSummary(res.summary);
      setFxDraft(res.summary.fx.usdToInrRate);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when days changes
  }, [days]);

  async function saveFxRate() {
    if (fxDraft == null || fxDraft <= 0) {
      message.error("Enter a valid USD → INR rate");
      return;
    }
    setSavingFx(true);
    try {
      await api.updateAeoSettings({ usdToInrRate: fxDraft });
      message.success("FX rate updated");
      await load(days);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Failed to update FX rate");
    } finally {
      setSavingFx(false);
    }
  }

  const t = summary?.totals;
  const rate = summary?.fx.usdToInrRate;

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Usage & profit
      </Title>
      <Paragraph type="secondary">
        LLM token costs are in USD (provider pricing). Plan invoices are typically in INR.
        Margin converts USD cost → INR using the admin FX rate, then subtracts from INR revenue.
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={days}
          onChange={setDays}
          style={{ width: 140 }}
          options={[
            { value: 7, label: "Last 7 days" },
            { value: 30, label: "Last 30 days" },
            { value: 90, label: "Last 90 days" },
          ]}
        />
        <Text type="secondary">USD → INR</Text>
        <InputNumber
          min={0.01}
          max={1000}
          step={0.1}
          value={fxDraft}
          onChange={(v) => setFxDraft(v)}
          style={{ width: 110 }}
        />
        <Button onClick={saveFxRate} loading={savingFx} disabled={fxDraft === rate}>
          Save FX
        </Button>
        <Button onClick={() => load(days)}>Refresh</Button>
      </Space>

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
            <Text type="secondary">Est. LLM cost (USD)</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t ? formatMoney(t.estimatedCostUsd, "USD", 4) : "—"}
            </Title>
            {t && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ≈ {formatMoney(t.estimatedCostInr, "INR")}
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Invoice revenue</Text>
            <Title level={3} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
              {t ? formatRevenueList(t.revenueByCurrency) : "—"}
            </Title>
            {t && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ≈ {formatMoney(t.revenueInr, "INR")} reporting
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card loading={loading}>
            <Text type="secondary">Margin (INR)</Text>
            <Title
              level={3}
              style={{
                margin: "8px 0 0",
                color: t && t.marginInr < 0 ? "#e57373" : "#EDEAE1",
              }}
            >
              {t ? formatMoney(t.marginInr, "INR") : "—"}
            </Title>
            {rate != null && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                FX {rate} INR / USD
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      <Title level={4} style={{ color: "#EDEAE1" }}>
        By business
      </Title>
      <Table<UsageBusinessRow>
        loading={loading}
        rowKey="businessId"
        pagination={{ pageSize: 20 }}
        style={{ marginBottom: 24 }}
        dataSource={summary?.byBusiness || []}
        columns={[
          {
            title: "Business",
            render: (_: unknown, r) => (
              <div>
                <div>{r.businessName || "—"}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.ownerEmail || r.businessId}
                </Text>
              </div>
            ),
          },
          {
            title: "Plan",
            render: (_: unknown, r) =>
              r.planName
                ? `${r.planName}${
                    r.planPrice != null && r.planCurrency
                      ? ` (${formatMoney(r.planPrice, r.planCurrency, 0)})`
                      : ""
                  }`
                : "—",
          },
          { title: "Calls", dataIndex: "calls", width: 80 },
          {
            title: "Cost (USD)",
            dataIndex: "estimatedCostUsd",
            render: (v: number) => formatMoney(v, "USD", 4),
          },
          {
            title: "Cost (INR)",
            dataIndex: "estimatedCostInr",
            render: (v: number) => formatMoney(v, "INR"),
          },
          {
            title: "Revenue",
            render: (_: unknown, r) => formatRevenueList(r.revenueByCurrency),
          },
          {
            title: "Margin (INR)",
            dataIndex: "marginInr",
            render: (v: number) => (
              <span style={{ color: v < 0 ? "#e57373" : undefined }}>{formatMoney(v, "INR")}</span>
            ),
          },
        ]}
      />

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
            title: "Est. cost (USD)",
            dataIndex: "estimatedCost",
            render: (v: number) => formatMoney(v, "USD", 4),
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
            title: "Est. cost (USD)",
            dataIndex: "estimatedCost",
            render: (v: number) => formatMoney(v, "USD", 4),
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
        ]}
      />
    </div>
  );
}
