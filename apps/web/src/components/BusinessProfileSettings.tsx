"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Button, Typography } from "antd";
import BusinessProfileForm, {
  type BusinessProfileFormValues,
} from "@/components/BusinessProfileForm";
import type { BusinessProfile } from "@aeo-pcs/shared";

const { Title } = Typography;

type SectionId = "identity" | "location" | "online" | "social";

const SECTIONS: {
  id: SectionId;
  title: string;
  description: string;
  hint: string;
}[] = [
  {
    id: "identity",
    title: "Business identity",
    description: "Name, category, pitch",
    hint: "Powers your visibility checks and action plan.",
  },
  {
    id: "location",
    title: "Location",
    description: "City and country",
    hint: "Keeps visibility results relevant to your market.",
  },
  {
    id: "online",
    title: "Online presence",
    description: "Website and Google Business",
    hint: "Optional links referenced in your action plan.",
  },
  {
    id: "social",
    title: "Social profiles",
    description: "Instagram, LinkedIn, etc.",
    hint: "Optional profiles for content generation.",
  },
];

type Props = {
  business: BusinessProfile | null;
  saving: boolean;
  error: string | null;
  onClearError: () => void;
  onSave: (values: BusinessProfileFormValues) => Promise<void>;
};

function sectionFilled(id: SectionId, profile: BusinessProfile | null): boolean {
  if (!profile) return false;
  switch (id) {
    case "identity":
      return Boolean(
        profile.name &&
          profile.category &&
          (profile.description?.trim().length ?? 0) >= 10 &&
          (profile.targetItems?.length ?? 0) > 0
      );
    case "location":
      return Boolean(profile.city && profile.country);
    case "online":
      return Boolean(profile.websiteUrl || profile.googleBusinessUrl);
    case "social":
      return (profile.socialLinks?.length ?? 0) > 0;
  }
}

function sectionSummary(id: SectionId, profile: BusinessProfile | null): string {
  if (!profile) return "Not set";
  switch (id) {
    case "identity":
      if (!profile.name) return "Add your business name";
      if (profile.description) {
        return profile.description.length > 72
          ? `${profile.description.slice(0, 72)}…`
          : profile.description;
      }
      return profile.category || "Add category and description";
    case "location": {
      const loc = [profile.city, profile.country].filter(Boolean).join(", ");
      const areas = profile.targetLocations?.length
        ? ` · ${profile.targetLocations.slice(0, 2).join(", ")}`
        : "";
      return loc ? `${loc}${areas}` : "Add city and country";
    }
    case "online": {
      const parts = [profile.websiteUrl, profile.googleBusinessUrl].filter(Boolean);
      if (!parts.length) return "No links added";
      return parts.length === 1 ? "1 link" : "2 links";
    }
    case "social": {
      const n = profile.socialLinks?.length ?? 0;
      if (!n) return "No profiles added";
      const labels = profile.socialLinks!.map((s) => s.label).slice(0, 2);
      return n > 2 ? `${labels.join(", ")} +${n - 2}` : labels.join(", ");
    }
  }
}

function sectionDetail(id: SectionId, profile: BusinessProfile | null): string | null {
  if (!profile) return null;
  switch (id) {
    case "identity":
      return profile.category || null;
    case "online":
      return profile.websiteUrl || profile.googleBusinessUrl || null;
    case "social":
      return profile.socialLinks?.[0]?.url || null;
    default:
      return null;
  }
}

export default function BusinessProfileSettings({
  business,
  saving,
  error,
  onClearError,
  onSave,
}: Props) {
  const [view, setView] = useState<"overview" | "edit">("overview");
  const [activeSection, setActiveSection] = useState<SectionId>("identity");
  const formId = "settings-profile-form";

  const profileComplete = Boolean(business?.profileCompletedAt);
  const activeMeta = SECTIONS.find((s) => s.id === activeSection)!;

  const filledCount = useMemo(
    () => SECTIONS.filter((s) => sectionFilled(s.id, business)).length,
    [business],
  );

  function openSection(id: SectionId) {
    setActiveSection(id);
    setView("edit");
  }

  function backToOverview() {
    setView("overview");
  }

  async function handleSave(values: BusinessProfileFormValues) {
    try {
      await onSave(values);
      setView("overview");
    } catch {
      /* error surfaced via alert */
    }
  }

  return (
    <div className="settings-page">
      <header className="app-page-header">
        <div className="app-page-header-main">
          <div className="vis-eyebrow">Settings</div>
          <Title level={2} className="vis-title">
            {business?.name || "Business profile"}
          </Title>
          <div className="settings-hero-meta">
            <span
              className={`settings-status ${profileComplete ? "is-complete" : "is-incomplete"}`}
            >
              {profileComplete ? "Profile complete" : "Needs attention"}
            </span>
            <span className="settings-progress-pill">
              {filledCount}/{SECTIONS.length} sections filled
            </span>
          </div>
        </div>
        <div className="app-page-header-actions">
          <Link href="/app/visibility">
            <Button type="primary">Run visibility check</Button>
          </Link>
        </div>
      </header>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 20 }}
          closable
          onClose={onClearError}
        />
      )}

      {view === "overview" ? (
        <div className="settings-overview">
          <p className="settings-overview-lead">
            Your profile powers visibility checks and action plans. Edit one section at a time.
          </p>
          <div className="settings-card-grid">
            {SECTIONS.map((section) => {
              const filled = sectionFilled(section.id, business);
              const summary = sectionSummary(section.id, business);
              const detail = sectionDetail(section.id, business);

              return (
                <button
                  key={section.id}
                  type="button"
                  className="settings-section-card"
                  onClick={() => openSection(section.id)}
                >
                  <div className="settings-section-card-top">
                    <div>
                      <span className="settings-section-card-eyebrow">{section.title}</span>
                      <h3>{section.description}</h3>
                    </div>
                    <span className={`settings-section-badge${filled ? " is-filled" : ""}`}>
                      {filled ? "✓" : "—"}
                    </span>
                  </div>
                  <p className="settings-section-card-summary">{summary}</p>
                  {detail && <p className="settings-section-card-detail">{detail}</p>}
                  <span className="settings-section-card-action">Edit →</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="app-content-shell settings-edit-panel">
          <div className="app-content-head">
            <Button type="link" className="settings-back-link" onClick={backToOverview}>
              ← All sections
            </Button>
            <h3>{activeMeta.title}</h3>
            <p>{activeMeta.hint}</p>
          </div>
          <div className="app-content-body app-content-body-form">
            <BusinessProfileForm
              key={business?.id || "settings"}
              formId={formId}
              initial={business}
              loading={saving}
              activeSection={activeSection}
              hideSubmit
              onSubmit={handleSave}
            />
          </div>
          <div className="app-content-foot">
            <Button type="primary" size="large" htmlType="submit" form={formId} loading={saving}>
              Save
            </Button>
            <Button onClick={backToOverview}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
