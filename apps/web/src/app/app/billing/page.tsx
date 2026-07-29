"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Empty, Spin, Table, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import type { InvoiceRecord } from "@aeo-pcs/shared";

const { Title, Paragraph } = Typography;

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getMyInvoices();
        if (!cancelled) setInvoices(res.invoices);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load billing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Billing
      </Title>
      <Paragraph type="secondary">
        Invoice history
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Card>
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : invoices.length === 0 ? (
          <Empty description="No billing records yet" />
        ) : (
          <Table
            rowKey="id"
            pagination={false}
            dataSource={invoices}
            columns={[
              {
                title: "Date",
                dataIndex: "createdAt",
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
              { title: "Period", dataIndex: "periodLabel" },
              {
                title: "Amount",
                render: (_, r) => `${r.currency} ${r.amount.toFixed(2)}`,
              },
              { title: "Status", dataIndex: "status" },
              { title: "Note", dataIndex: "note" },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
