"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import SocialPlatformSelect from "@/components/SocialPlatformSelect";
import type { BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import type { BusinessProfile } from "@aeo-pcs/shared";
import { SOCIAL_PLATFORMS, socialPlatformIcon, socialPlatformPlaceholder } from "@/lib/socialPlatforms";

function urlValid(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

type Props = {
  business: BusinessProfile | null;
  onSave: (partial: BusinessProfileFormValues) => Promise<void>;
  onHeaderActionChange?: (action: React.ReactNode) => void;
};

export default function SettingsSocialSection({
  business,
  onSave,
  onHeaderActionChange,
}: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [draftSocialLabel, setDraftSocialLabel] = useState("");
  const [draftSocialUrl, setDraftSocialUrl] = useState("");

  const links = business?.socialLinks || [];

  const startSocialAdd = useCallback((platform?: { label: string }) => {
    setDraftSocialLabel(platform?.label || "");
    setDraftSocialUrl("");
    setEditingKey("social:new");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
  }, []);

  const saveSocialLinks = useCallback(
    async (nextLinks: { label: string; url: string }[], key: string) => {
      setSavingKey(key);
      try {
        await onSave({ socialLinks: nextLinks } as BusinessProfileFormValues);
        setEditingKey(null);
      } catch {
        /* parent surfaces error */
      } finally {
        setSavingKey(null);
      }
    },
    [onSave],
  );

  const isSocialEditing = editingKey?.startsWith("social:") ?? false;

  useEffect(() => {
    if (!onHeaderActionChange) return;
    if (isSocialEditing) {
      onHeaderActionChange(null);
      return;
    }
    onHeaderActionChange(
      <Button
        type="default"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => startSocialAdd()}
      >
        Add
      </Button>,
    );
    return () => onHeaderActionChange(null);
  }, [isSocialEditing, onHeaderActionChange, startSocialAdd]);

  function startSocialEdit(index: number) {
    const link = links[index];
    setDraftSocialLabel(link?.label || "");
    setDraftSocialUrl(link?.url || "");
    setEditingKey(`social:${index}`);
  }

  async function saveSocialDraft(index?: number) {
    const label = draftSocialLabel.trim();
    const url = draftSocialUrl.trim();
    if (!label) {
      message.error("Select or enter a platform");
      return;
    }
    if (!url || !urlValid(url)) {
      message.error("Enter a valid profile URL");
      return;
    }
    const next = [...links];
    if (index === undefined) {
      next.push({ label, url });
    } else {
      next[index] = { label, url };
    }
    await saveSocialLinks(next, index === undefined ? "social:new" : `social:${index}`);
  }

  const usedLabels = links.map((l) => l.label);
  const quickAdd = SOCIAL_PLATFORMS.filter(
    (p) => !usedLabels.some((l) => l.toLowerCase() === p.label.toLowerCase()),
  );

  return (
    <div className="settings-inline-section">
      {links.length === 0 && editingKey !== "social:new" && (
        <p className="settings-view-lead">No social profiles added yet.</p>
      )}

      <div className="settings-view-social-list">
        {links.map((link, index) => {
          const isEditing = editingKey === `social:${index}`;
          return (
            <div
              key={`${link.label}-${index}`}
              className={`settings-social-entry${isEditing ? " is-editing" : ""}`}
            >
              {!isEditing ? (
                <>
                  <div className="settings-view-social-platform">
                    <span className="settings-view-social-icon">
                      {socialPlatformIcon(link.label)}
                    </span>
                    <div className="settings-social-entry-copy">
                      <span className="settings-view-social-name">{link.label}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="settings-view-link"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <div className="settings-social-entry-actions">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => startSocialEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      loading={savingKey === `social:delete:${index}`}
                      onClick={() => {
                        const next = links.filter((_, i) => i !== index);
                        void saveSocialLinks(next, `social:delete:${index}`);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <div className="settings-social-entry-form">
                  <div
                    className="app-social-row"
                    style={{ border: "none", padding: 0, background: "none" }}
                  >
                    <div className="app-social-label">
                      <label className="settings-field-label">Platform</label>
                      <SocialPlatformSelect
                        value={draftSocialLabel}
                        onChange={setDraftSocialLabel}
                        usedLabels={usedLabels.filter((l) => l !== link.label)}
                      />
                    </div>
                    <div className="app-social-url">
                      <label className="settings-field-label">Profile URL</label>
                      <Input
                        value={draftSocialUrl}
                        onChange={(e) => setDraftSocialUrl(e.target.value)}
                        placeholder={socialPlatformPlaceholder(draftSocialLabel)}
                      />
                    </div>
                  </div>
                  <div className="settings-field-edit-actions">
                    <Button size="small" onClick={cancelEdit} disabled={!!savingKey}>
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      loading={savingKey === `social:${index}`}
                      onClick={() => void saveSocialDraft(index)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {editingKey === "social:new" && (
          <div className="settings-social-entry is-editing">
            <div className="settings-social-entry-form">
              <div
                className="app-social-row"
                style={{ border: "none", padding: 0, background: "none" }}
              >
                <div className="app-social-label">
                  <label className="settings-field-label">Platform</label>
                  <SocialPlatformSelect
                    value={draftSocialLabel}
                    onChange={setDraftSocialLabel}
                    usedLabels={usedLabels}
                  />
                </div>
                <div className="app-social-url">
                  <label className="settings-field-label">Profile URL</label>
                  <Input
                    value={draftSocialUrl}
                    onChange={(e) => setDraftSocialUrl(e.target.value)}
                    placeholder={socialPlatformPlaceholder(draftSocialLabel)}
                  />
                </div>
              </div>
              <div className="settings-field-edit-actions">
                <Button size="small" onClick={cancelEdit} disabled={!!savingKey}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  loading={savingKey === "social:new"}
                  onClick={() => void saveSocialDraft()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingKey !== "social:new" && quickAdd.length > 0 && (
        <div className="app-social-quick-add settings-social-quick-add">
          <span className="app-form-examples-label">Quick add:</span>
          {quickAdd.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className="app-form-example-chip app-social-quick-chip"
              onClick={() => startSocialAdd(platform)}
            >
              <span className="app-social-quick-chip-icon">{platform.icon}</span>
              {platform.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
