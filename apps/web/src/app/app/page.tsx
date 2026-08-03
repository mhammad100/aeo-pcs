"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Progress, Row, Spin, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { ModelBreakdownChart, VisibilityTrendChart } from "@/components/DashboardCharts";
import PromptScoreList from "@/components/PromptScoreList";
import RecentRunsList, { RecentRunsEmpty } from "@/components/RecentRunsList";
import StatCard from "@/components/StatCard";
import { api, ApiError } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { formatCategoryLabel, type BusinessInsights } from "@aeo-pcs/shared";

const { Paragraph, Text } = Typography;

function deltaClass(delta: number | null | undefined): string {
  if (delta == null) return "";
  if (delta > 0) return "is-positive";
  if (delta < 0) return "is-negative";
  return "";
}

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
  const runInsights = insights?.latestRunInsights;
  const brandPct = insights?.latestScore?.brandVisibilityPct ?? latest;
  const sourcePct = insights?.latestScore?.sourceVisibilityPct;

  return (
    <AppShell>
      <div className="dash-page">
        <header className="dash-page-header">
          <Paragraph className="dash-page-subtitle">
            Track visibility and checklist progress for {biz?.name || "your business"}.
          </Paragraph>
        </header>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <div className="dash-loading">
            <Spin />
          </div>
        ) : (
          <>
            <div className="dash-kpi-grid">
              <StatCard
                label="Latest visibility"
                value={typeof latest === "number" ? `${latest}%` : "—"}
                footer={
                  typeof brandPct === "number" && typeof sourcePct === "number"
                    ? `Brand ${brandPct}% · Source cited ${sourcePct}%`
                    : "Run a check to see brand vs source"
                }
              />
              <StatCard
                label="Month over month"
                value={
                  typeof delta === "number" ? (
                    <span className={deltaClass(delta)}>
                      {delta > 0 ? "+" : ""}
                      {delta} pts
                    </span>
                  ) : (
                    "—"
                  )
                }
                footer={`This month ${typeof current === "number" ? `${current}%` : "—"} · Last month ${typeof previous === "number" ? `${previous}%` : "—"}`}
              />
              <StatCard
                label="Checklist progress"
                value={checklist ? `${checklist.percent}%` : "—"}
                footer={
                  checklist ? (
                    <>
                      <Progress
                        percent={checklist.percent}
                        showInfo={false}
                        strokeColor="var(--ma-accent-soft)"
                        className="dash-stat-progress"
                      />
                      <span>
                        {checklist.done} of {checklist.total} done
                      </span>
                    </>
                  ) : (
                    "No items yet"
                  )
                }
              />
            </div>

            <Row gutter={[16, 16]} className="dash-chart-row" style={{ marginBottom: 24 }}>
              <Col xs={24} lg={14} className="dash-stretch-col">
                <Card title="Visibility trend" className="dash-panel-card">
                  <VisibilityTrendChart data={insights?.scoreHistory || []} />
                </Card>
              </Col>
              <Col xs={24} lg={10} className="dash-stretch-col">
                <Card title="By AI assistant" className="dash-panel-card">
                  <ModelBreakdownChart data={runInsights?.modelBreakdown || []} />
                </Card>
              </Col>
            </Row>

            {runInsights && (
              <Row gutter={[16, 16]} className="dash-chart-row" style={{ marginBottom: 24 }}>
                {runInsights.topCompetitors.length > 0 && (
                  <Col xs={24} md={12} className="dash-stretch-col">
                    <Card title="Competitors AI mentioned" className="dash-panel-card">
                      <div className="dash-tag-list">
                        {runInsights.topCompetitors.map((c) => (
                          <span key={c.name} className="dash-tag">
                            {c.name}
                            <span className="dash-tag-count">{c.count}</span>
                          </span>
                        ))}
                      </div>
                    </Card>
                  </Col>
                )}
                {runInsights.weakPrompts.length > 0 && (
                  <Col xs={24} md={12} className="dash-stretch-col">
                    <Card title="Where you're missing visibility" className="dash-panel-card">
                      <PromptScoreList items={runInsights.weakPrompts} variant="weak" />
                    </Card>
                  </Col>
                )}
              </Row>
            )}

            <Card
              title="Recent visibility runs"
              className="dash-panel-card recent-runs-card"
              extra={
                <div className="dash-card-actions">
                  {(insights?.recentJobs?.length ?? 0) > 0 && (
                    <Link href="/app/visibility/history">
                      <Button>View all</Button>
                    </Link>
                  )}
                  <Link href="/app/visibility">
                    <Button type="primary">New check</Button>
                  </Link>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              {!insights?.recentJobs?.length ? (
                <RecentRunsEmpty />
              ) : (
                <RecentRunsList jobs={insights.recentJobs.slice(0, 5)} />
              )}
            </Card>

            <Card
              title="Business profile"
              className="dash-panel-card"
              extra={<Link href="/app/settings#identity">Edit</Link>}
            >
              {biz ? (
                <>
                  <Paragraph style={{ marginBottom: 4 }}>
                    <Text strong>{biz.name}</Text>
                    {biz.category
                      ? ` · ${formatCategoryLabel(biz.category, biz.customCategory)}`
                      : ""}
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
      </div>
    </AppShell>
  );
}
