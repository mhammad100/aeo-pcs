"use client";

import Link from "next/link";
import { CheckCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import type { VisibilityJobSummary } from "@aeo-pcs/shared";
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
  return (
    <ul className="recent-runs-list">
      {jobs.map((job, index) => {
        const score = job.score?.visibilityPct;
        const { primary, secondary } = formatRunDate(job.createdAt);
        const runLabel = index === 0 ? "Latest" : `Run ${jobs.length - index}`;

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
