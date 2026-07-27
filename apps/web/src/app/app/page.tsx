"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Empty, Row, Spin, Table, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import type { BusinessInsights } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function AppDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const biz = user?.business;
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getInsights();
        if (!cancelled) setInsights(res.insights);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load insights");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = insights?.latestScore?.visibilityPct;
  const current = insights?.currentMonthScore?.visibilityPct;
  const previous = insights?.previousMonthScore?.visibilityPct;
  const delta = insights?.scoreDelta;
  const checklist = insights?.checklist;

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Dashboard
      </Title>
      <Paragraph type="secondary">
        Welcome{user?.email ? `, ${user.email}` : ""}. Track visibility and checklist progress for{" "}
        {biz?.name || "your business"}.
      </Paragraph>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={8}>
              <Card>
                <Text type="secondary">Latest visibility</Text>
                <Title level={2} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
                  {typeof latest === "number" ? `${latest}%` : "—"}
                </Title>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Text type="secondary">Month over month</Text>
                <Title level={2} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
                  {typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta} pts` : "—"}
                </Title>
                <Text type="secondary">
                  This month {typeof current === "number" ? `${current}%` : "—"} · Last month{" "}
                  {typeof previous === "number" ? `${previous}%` : "—"}
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Text type="secondary">Checklist progress</Text>
                <Title level={2} style={{ margin: "8px 0 0", color: "#EDEAE1" }}>
                  {checklist ? `${checklist.percent}%` : "—"}
                </Title>
                <Text type="secondary">
                  {checklist ? `${checklist.done} of ${checklist.total} done` : "No items yet"}
                </Text>
              </Card>
            </Col>
          </Row>

          <Card
            title="Recent visibility runs"
            extra={
              <Link href="/app/visibility">
                <Button type="primary">New check</Button>
              </Link>
            }
            style={{ marginBottom: 16 }}
          >
            {!insights?.recentJobs?.length ? (
              <Empty description="No completed runs yet" />
            ) : (
              <Table
                rowKey="id"
                pagination={false}
                dataSource={insights.recentJobs}
                columns={[
                  {
                    title: "Date",
                    dataIndex: "createdAt",
                    render: (v: string) => new Date(v).toLocaleString(),
                  },
                  {
                    title: "Score",
                    dataIndex: ["score", "visibilityPct"],
                    render: (v: number | undefined) => (typeof v === "number" ? `${v}%` : "—"),
                  },
                  {
                    title: "Plan",
                    dataIndex: "hasPlan",
                    render: (v: boolean) => (v ? "Yes" : "No"),
                  },
                ]}
              />
            )}
          </Card>

          <Card title="Business profile" extra={<Link href="/app/settings">Edit</Link>}>
            {biz ? (
              <>
                <Paragraph style={{ marginBottom: 4 }}>
                  <Text strong>{biz.name}</Text>
                  {biz.category ? ` · ${biz.category}` : ""}
                </Paragraph>
                <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                  {[biz.city, biz.country].filter(Boolean).join(", ")}
                </Paragraph>
                {biz.websiteUrl && (
                  <Paragraph style={{ marginBottom: 0 }}>
                    <a href={biz.websiteUrl} target="_blank" rel="noreferrer">
                      {biz.websiteUrl}
                    </a>
                  </Paragraph>
                )}
              </>
            ) : (
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                No profile loaded
              </Paragraph>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
