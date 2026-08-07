"use client";

import { Typography } from "antd";
import type { PresenceAudit, PresenceChannelAudit, PresenceChannelStatus } from "@aeo-pcs/shared";
import { presenceStatusLabel } from "@aeo-pcs/shared";

const { Text, Paragraph } = Typography;

function statusColor(status: PresenceChannelStatus): string {
  switch (status) {
    case "verified":
      return "#14B8A6";
    case "needs_improvement":
      return "#E8943A";
    case "missing":
      return "#E8535A";
    default:
      return "#7A9CC8";
  }
}

function ChannelRow({ channel }: { channel: PresenceChannelAudit }) {
  return (
    <div
      className="vis-panel"
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        borderLeft: `3px solid ${statusColor(channel.status)}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <Text strong style={{ color: "#EDEFF6" }}>
          {channel.label}
        </Text>
        <Text style={{ color: statusColor(channel.status), fontSize: 12, fontWeight: 600 }}>
          {presenceStatusLabel(channel.status)}
        </Text>
      </div>
      {channel.url && (
        <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
          {channel.url}
        </Text>
      )}
      <Paragraph style={{ marginBottom: 8, color: "rgba(237, 234, 225, 0.85)" }}>
        {channel.summary}
      </Paragraph>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Cited by AI: {channel.citedInAiAnswers ? "Yes" : "No"} · Brand mentioned:{" "}
        {channel.brandMentionedInAnswers ? "Yes" : "No"}
        {channel.urlReachable === false ? " · Link unreachable" : ""}
      </Text>
    </div>
  );
}

export default function PresenceAuditPanel({ audit }: { audit: PresenceAudit }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 12 }}>
        Online presence review
      </Text>
      <Paragraph type="secondary" style={{ marginBottom: 14, maxWidth: 640 }}>
        We verified your saved profile against what AI assistants cited in this visibility check.
      </Paragraph>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <ChannelRow channel={audit.googleBusiness} />
        <ChannelRow channel={audit.website} />
        {audit.social.map((s) => (
          <ChannelRow key={`${s.label}-${s.url}`} channel={s} />
        ))}
      </div>

      {audit.directories.length > 0 && (
        <>
          <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 10 }}>
            Directories influencing AI answers
          </Text>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {audit.directories.map((d) => (
              <div
                key={d.domain}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--ma-line)",
                }}
              >
                <Text strong style={{ color: "#EDEFF6" }}>
                  {d.domain}
                </Text>
                <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4 }}>
                  {d.summary}
                </Paragraph>
              </div>
            ))}
          </div>
        </>
      )}

      {audit.topCompetitors.length > 0 && (
        <>
          <Text className="vis-eyebrow" style={{ display: "block", marginBottom: 8 }}>
            Businesses AI named instead
          </Text>
          <Text style={{ color: "rgba(237, 234, 225, 0.85)" }}>
            {audit.topCompetitors.join(", ")}
          </Text>
        </>
      )}
    </div>
  );
}
