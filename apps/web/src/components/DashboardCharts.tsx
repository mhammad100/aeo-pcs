"use client";

import type { ScoreHistoryPoint } from "@aeo-pcs/shared";
import type { ModelBreakdown } from "@aeo-pcs/shared";

type LineChartProps = {
  data: ScoreHistoryPoint[];
  height?: number;
};

export function VisibilityTrendChart({ data, height = 160 }: LineChartProps) {
  if (!data.length) {
    return <div className="dash-chart-empty">Run a visibility check to see trends</div>;
  }

  const width = 480;
  const padX = 28;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const values = data.map((d) => d.visibilityPct);
  const min = 0;
  const max = 100;

  const points = data.map((d, i) => {
    const x = padX + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padY + innerH - ((d.visibilityPct - min) / (max - min)) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      className="dash-line-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Visibility score trend"
    >
      {[0, 25, 50, 75, 100].map((v) => {
        const y = padY + innerH - (v / 100) * innerH;
        return (
          <g key={v}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} className="dash-chart-grid" />
            <text x={4} y={y + 4} className="dash-chart-axis">
              {v}
            </text>
          </g>
        );
      })}
      <path d={linePath} className="dash-chart-line" fill="none" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} className="dash-chart-dot" />
          <title>
            {new Date(p.date).toLocaleDateString()}: {p.visibilityPct}%
          </title>
        </g>
      ))}
    </svg>
  );
}

type BarChartProps = {
  data: ModelBreakdown[];
};

export function ModelBreakdownChart({ data }: BarChartProps) {
  if (!data.length) {
    return <div className="dash-chart-empty">No model data yet</div>;
  }

  const max = Math.max(...data.map((d) => d.pct), 1);

  return (
    <div className="dash-bar-chart">
      {data.map((m) => (
        <div key={m.model} className="dash-bar-row">
          <span className="dash-bar-label">{m.model}</span>
          <div className="dash-bar-track">
            <div
              className="dash-bar-fill"
              style={{ width: `${Math.round((m.pct / max) * 100)}%` }}
            />
          </div>
          <span className="dash-bar-value">{m.pct}%</span>
        </div>
      ))}
    </div>
  );
}
