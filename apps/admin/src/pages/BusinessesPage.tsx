import { useEffect, useState } from "react";
import { Alert, Table, Tag, Typography } from "antd";
import { api, type AdminBusinessRow, ApiError } from "@/lib/api";

const { Title } = Typography;

export default function BusinessesPage() {
  const [rows, setRows] = useState<AdminBusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listBusinesses();
        if (!cancelled) setRows(res.businesses);
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

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Businesses
      </Title>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={[
          { title: "Name", dataIndex: "name", render: (v: string) => v || "—" },
          { title: "Owner", dataIndex: "ownerEmail" },
          { title: "Category", dataIndex: "category", render: (v: string) => v || "—" },
          {
            title: "Location",
            render: (_: unknown, r: AdminBusinessRow) =>
              [r.city, r.country].filter(Boolean).join(", ") || "—",
          },
          {
            title: "Website",
            dataIndex: "websiteUrl",
            render: (v: string) => v || "—",
          },
          {
            title: "Profile",
            render: (_: unknown, r: AdminBusinessRow) => (
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
