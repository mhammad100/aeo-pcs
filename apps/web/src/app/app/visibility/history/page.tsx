"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Spin, Typography } from "antd";
import AppShell from "@/components/AppShell";
import RecentRunsList, { RecentRunsEmpty } from "@/components/RecentRunsList";
import { api, ApiError } from "@/lib/api";
import type { VisibilityJobSummary } from "@aeo-pcs/shared";

const { Paragraph } = Typography;

export default function VisibilityHistoryPage() {
  const [jobs, setJobs] = useState<VisibilityJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listVisibilityJobs({ limit: 50, status: "completed" });
        if (!cancelled) setJobs(res.jobs);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load history");
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
      <div className="dash-page visibility-history-page">
        <header className="dash-page-header visibility-history-header">
          <div>
            <Paragraph className="dash-page-subtitle" style={{ marginBottom: 8 }}>
              All completed visibility checks for your business.
            </Paragraph>
          </div>
          <Link href="/app/visibility">
            <Button type="primary">New check</Button>
          </Link>
        </header>

        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <div className="dash-loading">
            <Spin />
          </div>
        ) : !jobs.length ? (
          <RecentRunsEmpty />
        ) : (
          <div className="visibility-history-panel dash-panel-card">
            <RecentRunsList jobs={jobs} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
