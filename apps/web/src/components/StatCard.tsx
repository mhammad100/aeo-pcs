"use client";

import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  valueClassName?: string;
};

export default function StatCard({ label, value, footer, valueClassName }: Props) {
  return (
    <div className="dash-stat-card">
      <span className="dash-stat-card__label">{label}</span>
      <div className={`dash-stat-card__value${valueClassName ? ` ${valueClassName}` : ""}`}>
        {value}
      </div>
      <div className="dash-stat-card__footer">{footer ?? "\u00A0"}</div>
    </div>
  );
}
