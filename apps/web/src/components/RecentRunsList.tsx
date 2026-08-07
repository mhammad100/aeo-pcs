"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import type { VisibilityJobSummary } from "@aeo-pcs/shared";
import { api, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { formatRunDate } from "@/lib/formatDate";

type Props = {
  jobs: VisibilityJobSummary[];
};

function scoreTone(pct: number | undefined): string {
  if (typeof pct !== "number") return "";
  if (pct >= 50) return "is-good";
  if (pct >= 25) return "is-mid";
  return "is-low";
}

export default function RecentRunsList({ jobs }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function onDownload(jobId: string) {
    if (downloadingId) return;
    setDownloadingId(jobId);
    try {
      const report = await api.getReport(jobId);
      downloadBlob(report.data, report.filename, report.contentType);
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Report download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <ul className="recent-runs-list">
      {jobs.map((job, index) => {
        const score = job.score?.visibilityPct;
        const { primary, secondary } = formatRunDate(job.createdAt);
        const runLabel = index === 0 ? "Latest" : `Run ${jobs.length - index}`;
        const busy = downloadingId === job.id;

        return (
          <li key={job.id} className="recent-runs-item">
            <div className="recent-runs-main">
              <div className="recent-runs-date">
                <span className="recent-runs-run-label">{runLabel}</span>
                <span className="recent-runs-date-primary">{primary}</span>
                {secondary && <span className="recent-runs-date-secondary">{secondary}</span>}
              </div>

              <div className="recent-runs-meta">
                <div className={`recent-runs-score ${scoreTone(score)}`}>
                  <span className="recent-runs-score-value">
                    {typeof score === "number" ? `${score}%` : "-"}
                  </span>
                  <span className="recent-runs-score-label">visibility</span>
                </div>

                <span
                  className={`recent-runs-plan${job.hasPlan ? " has-plan" : ""}`}
                  title={job.hasPlan ? "Action plan generated" : "No action plan yet"}
                >
                  {job.hasPlan ? (
                    <>
                      <CheckCircleOutlined />
                      Plan ready
                    </>
                  ) : (
                    <>
                      <FileTextOutlined />
                      No plan
                    </>
                  )}
                </span>

                <button
                  type="button"
                  className="recent-runs-download"
                  aria-label="Download PDF report"
                  title="Download PDF report"
                  disabled={busy || Boolean(downloadingId)}
                  onClick={() => void onDownload(job.id)}
                >
                  {busy ? <LoadingOutlined spin /> : <DownloadOutlined />}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentRunsEmpty() {
  return (
    <div className="recent-runs-empty">
      <p>No completed visibility runs yet.</p>
      <Link href="/app/visibility" className="recent-runs-empty-link">
        Run your first check
      </Link>
    </div>
  );
}
