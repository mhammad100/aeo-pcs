import { useEffect, useMemo, useState } from "react";
import { Alert, Table, Tag, Typography } from "antd";
import { api, type AdminBusinessRow, ApiError } from "@/lib/api";
import type { UsageBusinessRow } from "@aeo-pcs/shared";

const { Title, Text } = Typography;

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

type BusinessUsageView = AdminBusinessRow & {
  usage?: UsageBusinessRow;
};

export default function BusinessesPage() {
  const [rows, setRows] = useState<AdminBusinessRow[]>([]);
  const [usageById, setUsageById] = useState<Map<string, UsageBusinessRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bizRes, usageRes] = await Promise.all([
          api.listBusinesses(),
          api.getUsageSummary(30).catch(() => null),
        ]);
        if (cancelled) return;
        setRows(bizRes.businesses);
        const map = new Map<string, UsageBusinessRow>();
        for (const row of usageRes?.summary.byBusiness || []) {
          map.set(row.businessId, row);
        }
        setUsageById(map);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load businesses");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data: BusinessUsageView[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        usage: usageById.get(r.id),
      })),
    [rows, usageById]
  );

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Businesses
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Plan and 30-day usage/revenue. LLM cost is USD; revenue and margin report in INR via FX.
      </Text>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Table<BusinessUsageView>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name", render: (v: string) => v || "—" },
          { title: "Owner", dataIndex: "ownerEmail" },
          {
            title: "Plan",
            render: (_: unknown, r) => {
              const u = r.usage;
              if (!u?.planName) return "—";
              return u.planPrice != null && u.planCurrency
                ? `${u.planName} (${formatMoney(u.planPrice, u.planCurrency, 0)})`
                : u.planName;
            },
          },
          {
            title: "Location",
            render: (_: unknown, r) =>
              [r.city, r.country].filter(Boolean).join(", ") || "—",
          },
          {
            title: "Calls (30d)",
            render: (_: unknown, r) => r.usage?.calls ?? 0,
            width: 100,
          },
          {
            title: "Cost USD (30d)",
            render: (_: unknown, r) =>
              r.usage ? formatMoney(r.usage.estimatedCostUsd, "USD", 4) : "—",
          },
          {
            title: "Revenue INR (30d)",
            render: (_: unknown, r) =>
              r.usage ? formatMoney(r.usage.revenueInr, "INR") : "—",
          },
          {
            title: "Margin INR (30d)",
            render: (_: unknown, r) => {
              if (!r.usage) return "—";
              const v = r.usage.marginInr;
              return (
                <span style={{ color: v < 0 ? "#e57373" : undefined }}>
                  {formatMoney(v, "INR")}
                </span>
              );
            },
          },
          {
            title: "Profile",
            render: (_: unknown, r) => (
              <Tag color={r.profileCompletedAt ? "green" : "orange"}>
                {r.profileCompletedAt ? "Complete" : "Incomplete"}
              </Tag>
            ),
          },
        ]}
      />
    </div>
  );
}
