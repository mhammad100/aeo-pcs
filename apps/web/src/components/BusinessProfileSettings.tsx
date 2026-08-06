"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EnvironmentOutlined,
  GlobalOutlined,
  IdcardOutlined,
  LockOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { Alert, Button, Typography } from "antd";
import SettingsInlineEditor, {
  type ProfileSectionId,
  type SettingsSectionId,
} from "@/components/SettingsInlineEditor";
import type { BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import type { BusinessProfile } from "@aeo-pcs/shared";
import { formatCategoryLabel } from "@aeo-pcs/shared";

const { Title } = Typography;

export type { ProfileSectionId, SettingsSectionId };

const PROFILE_SECTIONS: {
  id: ProfileSectionId;
  title: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "identity",
    title: "Identity",
    hint: "Name, category, and services — powers your visibility checks and action plan.",
    icon: <IdcardOutlined />,
  },
  {
    id: "location",
    title: "Location",
    hint: "City, country, and areas you serve — keeps results relevant to your market.",
    icon: <EnvironmentOutlined />,
  },
  {
    id: "online",
    title: "Online presence",
    hint: "Website and Google Business links — referenced in your action plan.",
    icon: <GlobalOutlined />,
  },
  {
    id: "social",
    title: "Social profiles",
    hint: "Instagram, LinkedIn, and more — used when generating content.",
    icon: <ShareAltOutlined />,
  },
];

const ACCOUNT_SECTION = {
  id: "account" as const,
  title: "Account",
  hint: "Your login email and password.",
  icon: <LockOutlined />,
};

const ALL_SECTIONS: SettingsSectionId[] = [
  ...PROFILE_SECTIONS.map((s) => s.id),
  "account",
];

function parseHashSection(): SettingsSectionId {
  if (typeof window === "undefined") return "identity";
  const hash = window.location.hash.replace("#", "");
  if (ALL_SECTIONS.includes(hash as SettingsSectionId)) {
    return hash as SettingsSectionId;
  }
  return "identity";
}

function sectionFilled(id: ProfileSectionId, profile: BusinessProfile | null): boolean {
  if (!profile) return false;
  switch (id) {
    case "identity":
      return Boolean(
        profile.name &&
          profile.category &&
          (profile.category !== "Other" || (profile.customCategory?.trim().length ?? 0) >= 2) &&
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

function firstIncompleteSection(profile: BusinessProfile | null): ProfileSectionId {
  const incomplete = PROFILE_SECTIONS.find((s) => !sectionFilled(s.id, profile));
  return incomplete?.id ?? "identity";
}

type Props = {
  business: BusinessProfile | null;
  email: string;
  saving: boolean;
  error: string | null;
  onClearError: () => void;
  onSave: (values: BusinessProfileFormValues) => Promise<void>;
};

export default function BusinessProfileSettings({
  business,
  email,
  saving,
  error,
  onClearError,
  onSave,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("identity");
  const [sectionHeaderAction, setSectionHeaderAction] = useState<React.ReactNode>(null);

  const profileComplete = Boolean(business?.profileCompletedAt);

  const filledCount = useMemo(
    () => PROFILE_SECTIONS.filter((s) => sectionFilled(s.id, business)).length,
    [business],
  );

  const activeMeta = useMemo(() => {
    if (activeSection === "account") return ACCOUNT_SECTION;
    return PROFILE_SECTIONS.find((s) => s.id === activeSection)!;
  }, [activeSection]);

  const syncHash = useCallback((section: SettingsSectionId) => {
    if (typeof window === "undefined") return;
    const next = `#${section}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (ALL_SECTIONS.includes(hash as SettingsSectionId)) {
      setActiveSection(hash as SettingsSectionId);
      return;
    }
    const next = firstIncompleteSection(business);
    setActiveSection(next);
    syncHash(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial section only
  }, []);

  useEffect(() => {
    function onHashChange() {
      setActiveSection(parseHashSection());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function switchSection(next: SettingsSectionId) {
    setActiveSection(next);
    setSectionHeaderAction(null);
    syncHash(next);
  }

  return (
    <div className="dash-page settings-page">
      <header className="dash-page-header settings-page-header">
        <div>
          <p className="dash-page-subtitle" style={{ marginBottom: 4 }}>
            Settings
          </p>
          <Title level={2} className="dash-page-title" style={{ margin: 0 }}>
            {business?.name || "Business profile"}
          </Title>
          <div className="settings-hero-meta">
            <span
              className={`settings-status ${profileComplete ? "is-complete" : "is-incomplete"}`}
            >
              {profileComplete ? "Profile complete" : "Needs attention"}
            </span>
            <span className="settings-progress-pill">
              {filledCount}/{PROFILE_SECTIONS.length} profile sections
            </span>
          </div>
        </div>
        <div className="settings-page-header-actions">
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

      <div className="settings-layout">
        <aside className="settings-aside">
          <nav className="settings-nav" aria-label="Settings sections">
            <div className="settings-nav-group">
              <span className="settings-nav-group-label">Profile</span>
              {PROFILE_SECTIONS.map((section) => {
                const filled = sectionFilled(section.id, business);
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`settings-nav-item${isActive ? " is-active" : ""}`}
                    onClick={() => switchSection(section.id)}
                  >
                    <span className="settings-nav-item-icon">{section.icon}</span>
                    <span className="settings-nav-item-label">{section.title}</span>
                    <span className={`settings-nav-item-status${filled ? " is-filled" : ""}`}>
                      {filled ? "✓" : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="settings-nav-group">
              <span className="settings-nav-group-label">Account</span>
              <button
                type="button"
                className={`settings-nav-item${activeSection === "account" ? " is-active" : ""}`}
                onClick={() => switchSection("account")}
              >
                <span className="settings-nav-item-icon">{ACCOUNT_SECTION.icon}</span>
                <span className="settings-nav-item-label">{ACCOUNT_SECTION.title}</span>
              </button>
            </div>
          </nav>
        </aside>

        <div className="settings-main">
          <div className="app-content-shell settings-panel">
            <div className="app-content-head settings-panel-head">
              <div className="settings-panel-head-copy">
                <h3>{activeMeta.title}</h3>
                <p>{activeMeta.hint}</p>
              </div>
              {sectionHeaderAction && (
                <div className="settings-panel-head-action">{sectionHeaderAction}</div>
              )}
            </div>

            <div className="app-content-body app-content-body-form">
              <SettingsInlineEditor
                key={`${business?.id || "new"}-${activeSection}`}
                section={activeSection}
                business={business}
                email={email}
                onSave={onSave}
                onHeaderActionChange={setSectionHeaderAction}
              />
            </div>

            {saving && (
              <div className="app-content-foot settings-save-bar">
                <span className="settings-save-hint">Saving…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
