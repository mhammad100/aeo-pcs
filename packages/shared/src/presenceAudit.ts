/** How a presence channel looks relative to the profile and visibility run. */
export type PresenceChannelStatus =
  | "verified"
  | "needs_improvement"
  | "missing"
  | "not_provided";

export type PresenceChannelAudit = {
  status: PresenceChannelStatus;
  label: string;
  url?: string;
  providedByUser: boolean;
  urlReachable?: boolean;
  citedInAiAnswers: boolean;
  brandMentionedInAnswers: boolean;
  /** Plain-language summary for UI and reports. */
  summary: string;
};

export type DirectoryAuditItem = {
  domain: string;
  citationCount: number;
  userLikelyListed: boolean;
  summary: string;
};

export type PresenceAudit = {
  googleBusiness: PresenceChannelAudit;
  website: PresenceChannelAudit;
  social: PresenceChannelAudit[];
  directories: DirectoryAuditItem[];
  topCompetitors: string[];
  citedDomains: string[];
};

export function presenceStatusLabel(status: PresenceChannelStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "needs_improvement":
      return "Needs attention";
    case "missing":
      return "Not found";
    case "not_provided":
      return "Not provided";
  }
}
