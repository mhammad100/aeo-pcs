"use client";

import { useEffect, useState } from "react";
import { Button, Input, Select, message } from "antd";
import { EditOutlined } from "@ant-design/icons";
import SettingsEditableField from "@/components/SettingsEditableField";
import SettingsSocialSection from "@/components/SettingsSocialSection";
import AccountSettingsSection from "@/components/AccountSettingsSection";
import GeoLocationPicker from "@/components/GeoLocationPicker";
import GeoLocationListEditor from "@/components/GeoLocationListEditor";
import type { BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import { CATEGORIES, formatGeoLocation, headquartersLocation, type BusinessProfile, type GeoLocation } from "@aeo-pcs/shared";
import { formatCategoryLabel } from "@aeo-pcs/shared";

export type ProfileSectionId = "identity" | "location" | "online" | "social";
export type SettingsSectionId = ProfileSectionId | "account";

const TARGET_ITEM_EXAMPLES = [
  "dental implants",
  "teeth whitening",
  "wedding catering",
  "home renovation",
];

type Props = {
  section: SettingsSectionId;
  business: BusinessProfile | null;
  email: string;
  onSave: (partial: BusinessProfileFormValues) => Promise<void>;
  onHeaderActionChange?: (action: React.ReactNode) => void;
};

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return <span className="settings-view-empty">None added</span>;
  return (
    <div className="settings-view-chips">
      {items.map((item) => (
        <span key={item} className="settings-view-chip">
          {item}
        </span>
      ))}
    </div>
  );
}

function GeoLocationChipList({ items }: { items: GeoLocation[] }) {
  if (!items.length) return <span className="settings-view-empty">None added</span>;
  return (
    <div className="settings-view-chips">
      {items.map((item) => (
        <span key={formatGeoLocation(item)} className="settings-view-chip">
          {formatGeoLocation(item)}
        </span>
      ))}
    </div>
  );
}

function urlValid(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SettingsInlineEditor({
  section,
  business,
  email,
  onSave,
  onHeaderActionChange,
}: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftCustomCategory, setDraftCustomCategory] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftNameAliases, setDraftNameAliases] = useState<string[]>([]);
  const [draftTargetItems, setDraftTargetItems] = useState<string[]>([]);
  const [draftHeadquarters, setDraftHeadquarters] = useState<GeoLocation>({
    city: "",
    state: "",
    country: "",
  });
  const [draftTargetLocations, setDraftTargetLocations] = useState<GeoLocation[]>([]);
  const [draftWebsiteUrl, setDraftWebsiteUrl] = useState("");
  const [draftGoogleBusinessUrl, setDraftGoogleBusinessUrl] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);

  useEffect(() => {
    setEditingKey(null);
    setEditingPassword(false);
  }, [section]);

  useEffect(() => {
    if (section !== "social") {
      onHeaderActionChange?.(null);
    }
  }, [section, onHeaderActionChange]);

  function startEdit(key: string, init: () => void) {
    init();
    setEditingKey(key);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditingPassword(false);
  }

  async function saveField(key: string, partial: BusinessProfileFormValues) {
    setSavingKey(key);
    try {
      await onSave(partial);
      setEditingKey(null);
      setEditingPassword(false);
    } catch {
      /* parent surfaces error */
    } finally {
      setSavingKey(null);
    }
  }

  if (section === "account") {
    return (
      <div className="settings-inline-section">
        <div className="settings-field-row">
          <div className="settings-field-row-head">
            <span className="settings-field-label">Email address</span>
          </div>
          <div className="settings-field-value">{email || "-"}</div>
          <p className="settings-field-hint">Contact support to change your login email.</p>
        </div>

        <div className={`settings-field-row${editingPassword ? " is-editing" : ""}`}>
          <div className="settings-field-row-head">
            <span className="settings-field-label">Password</span>
            {!editingPassword && (
              <Button
                type="text"
                size="small"
                className="settings-field-edit-btn"
                icon={<EditOutlined />}
                onClick={() => setEditingPassword(true)}
              >
                Edit
              </Button>
            )}
          </div>
          {!editingPassword ? (
            <div className="settings-field-value">
              <span className="settings-view-masked">••••••••••••</span>
            </div>
          ) : (
            <AccountSettingsSection onSuccess={() => setEditingPassword(false)} onCancel={cancelEdit} />
          )}
        </div>
      </div>
    );
  }

  if (section === "identity") {
    const categoryLabel = formatCategoryLabel(
      business?.category || "",
      business?.customCategory,
    );

    return (
      <div className="settings-inline-section">
        <SettingsEditableField
          label="Business name"
          editing={editingKey === "name"}
          saving={savingKey === "name"}
          empty={!business?.name}
          display={business?.name}
          onEdit={() =>
            startEdit("name", () => setDraftName(business?.name || ""))
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (!draftName.trim()) {
              message.error("Business name is required");
              return;
            }
            void saveField("name", { name: draftName.trim() } as BusinessProfileFormValues);
          }}
        >
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Your business name"
          />
        </SettingsEditableField>

        <SettingsEditableField
          label="Category"
          editing={editingKey === "category"}
          saving={savingKey === "category"}
          empty={!categoryLabel}
          display={categoryLabel}
          onEdit={() =>
            startEdit("category", () => {
              setDraftCategory(business?.category || "");
              setDraftCustomCategory(business?.customCategory || "");
            })
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (!draftCategory) {
              message.error("Select a category");
              return;
            }
            if (draftCategory === "Other" && draftCustomCategory.trim().length < 2) {
              message.error("Describe your business type");
              return;
            }
            void saveField("category", {
              category: draftCategory,
              customCategory: draftCategory === "Other" ? draftCustomCategory.trim() : "",
            } as BusinessProfileFormValues);
          }}
        >
          <Select
            value={draftCategory || undefined}
            onChange={setDraftCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder="Select category"
            style={{ width: "100%", marginBottom: draftCategory === "Other" ? 12 : 0 }}
          />
          {draftCategory === "Other" && (
            <Input
              value={draftCustomCategory}
              onChange={(e) => setDraftCustomCategory(e.target.value)}
              placeholder="e.g. Pet grooming, Law firm"
            />
          )}
        </SettingsEditableField>

        <SettingsEditableField
          label="Short description"
          editing={editingKey === "description"}
          saving={savingKey === "description"}
          empty={!business?.description?.trim()}
          display={<p className="settings-view-text">{business?.description}</p>}
          hint="What you do, who you serve, and what makes you distinct."
          onEdit={() =>
            startEdit("description", () => setDraftDescription(business?.description || ""))
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (draftDescription.trim().length < 10) {
              message.error("Description must be at least 10 characters");
              return;
            }
            void saveField("description", {
              description: draftDescription.trim(),
            } as BusinessProfileFormValues);
          }}
        >
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            placeholder="What you do, who you serve…"
          />
        </SettingsEditableField>

        <SettingsEditableField
          label="Also known as"
          editing={editingKey === "nameAliases"}
          saving={savingKey === "nameAliases"}
          display={<ChipList items={business?.nameAliases || []} />}
          hint="Alternate names, abbreviations, or spellings."
          onEdit={() =>
            startEdit("nameAliases", () =>
              setDraftNameAliases(business?.nameAliases?.length ? [...business.nameAliases] : []),
            )
          }
          onCancel={cancelEdit}
          onSave={() => {
            void saveField("nameAliases", {
              nameAliases: draftNameAliases.map((s) => s.trim()).filter(Boolean),
            } as BusinessProfileFormValues);
          }}
        >
          <Select
            mode="tags"
            tokenSeparators={[","]}
            open={false}
            value={draftNameAliases}
            onChange={setDraftNameAliases}
            placeholder="e.g. PCS, Pal Consultancy"
            style={{ width: "100%" }}
          />
        </SettingsEditableField>

        <SettingsEditableField
          label="Target services / products"
          editing={editingKey === "targetItems"}
          saving={savingKey === "targetItems"}
          empty={!business?.targetItems?.length}
          display={<ChipList items={business?.targetItems || []} />}
          hint="Terms customers use when asking AI for recommendations. Separate with commas."
          onEdit={() =>
            startEdit("targetItems", () =>
              setDraftTargetItems(business?.targetItems?.length ? [...business.targetItems] : []),
            )
          }
          onCancel={cancelEdit}
          onSave={() => {
            const cleaned = draftTargetItems.map((s) => s.trim()).filter(Boolean);
            if (!cleaned.length) {
              message.error("Add at least one service or product");
              return;
            }
            void saveField("targetItems", { targetItems: cleaned } as BusinessProfileFormValues);
          }}
        >
          <Select
            mode="tags"
            tokenSeparators={[","]}
            open={false}
            value={draftTargetItems}
            onChange={setDraftTargetItems}
            placeholder="e.g. dental implants, teeth whitening"
            className="app-target-items-select"
            style={{ width: "100%" }}
          />
          <div className="app-form-examples" style={{ marginTop: 10 }}>
            <span className="app-form-examples-label">Try an example:</span>
            {TARGET_ITEM_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="app-form-example-chip"
                onClick={() => {
                  if (!draftTargetItems.some((i) => i.toLowerCase() === example.toLowerCase())) {
                    setDraftTargetItems([...draftTargetItems, example]);
                  }
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </SettingsEditableField>
      </div>
    );
  }

  if (section === "location") {
    const headquarters = business
      ? headquartersLocation({
          city: business.city,
          state: business.state,
          country: business.country,
          countryCode: business.countryCode,
          stateCode: business.stateCode,
        })
      : { city: "", state: "", country: "" };

    return (
      <div className="settings-inline-section">
        <SettingsEditableField
          label="Business location"
          editing={editingKey === "headquarters"}
          saving={savingKey === "headquarters"}
          empty={!business?.city}
          display={formatGeoLocation(headquarters)}
          onEdit={() =>
            startEdit("headquarters", () => setDraftHeadquarters(headquarters))
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (!draftHeadquarters.city.trim() || !draftHeadquarters.country.trim()) {
              message.error("Select country and city");
              return;
            }
            void saveField("headquarters", {
              city: draftHeadquarters.city,
              state: draftHeadquarters.state,
              country: draftHeadquarters.country,
              countryCode: draftHeadquarters.countryCode,
              stateCode: draftHeadquarters.stateCode,
            } as BusinessProfileFormValues);
          }}
        >
          <GeoLocationPicker value={draftHeadquarters} onChange={setDraftHeadquarters} />
        </SettingsEditableField>

        <SettingsEditableField
          label="Target locations"
          editing={editingKey === "targetLocations"}
          saving={savingKey === "targetLocations"}
          display={<GeoLocationChipList items={business?.targetLocations || []} />}
          hint="Areas you serve beyond your registered address. Country required; state and city optional."
          onEdit={() =>
            startEdit("targetLocations", () =>
              setDraftTargetLocations(
                business?.targetLocations?.length ? [...business.targetLocations] : [],
              ),
            )
          }
          onCancel={cancelEdit}
          onSave={() => {
            void saveField("targetLocations", {
              targetLocations: draftTargetLocations.filter((loc) => loc.country?.trim()),
            } as BusinessProfileFormValues);
          }}
        >
          <GeoLocationListEditor
            value={draftTargetLocations}
            onChange={setDraftTargetLocations}
            headquarters={draftHeadquarters}
          />
        </SettingsEditableField>
      </div>
    );
  }

  if (section === "online") {
    return (
      <div className="settings-inline-section">
        <SettingsEditableField
          label="Website"
          editing={editingKey === "websiteUrl"}
          saving={savingKey === "websiteUrl"}
          empty={!business?.websiteUrl}
          display={
            business?.websiteUrl ? (
              <a
                href={business.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="settings-view-link"
              >
                {business.websiteUrl}
              </a>
            ) : null
          }
          onEdit={() =>
            startEdit("websiteUrl", () => setDraftWebsiteUrl(business?.websiteUrl || ""))
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (draftWebsiteUrl && !urlValid(draftWebsiteUrl)) {
              message.error("Enter a valid http(s) URL");
              return;
            }
            void saveField("websiteUrl", {
              websiteUrl: draftWebsiteUrl.trim(),
            } as BusinessProfileFormValues);
          }}
        >
          <Input
            value={draftWebsiteUrl}
            onChange={(e) => setDraftWebsiteUrl(e.target.value)}
            placeholder="https://example.com (optional)"
          />
        </SettingsEditableField>

        <SettingsEditableField
          label="Google Business Profile"
          editing={editingKey === "googleBusinessUrl"}
          saving={savingKey === "googleBusinessUrl"}
          empty={!business?.googleBusinessUrl}
          display={
            business?.googleBusinessUrl ? (
              <a
                href={business.googleBusinessUrl}
                target="_blank"
                rel="noreferrer"
                className="settings-view-link"
              >
                {business.googleBusinessUrl}
              </a>
            ) : null
          }
          onEdit={() =>
            startEdit("googleBusinessUrl", () =>
              setDraftGoogleBusinessUrl(business?.googleBusinessUrl || ""),
            )
          }
          onCancel={cancelEdit}
          onSave={() => {
            if (draftGoogleBusinessUrl && !urlValid(draftGoogleBusinessUrl)) {
              message.error("Enter a valid http(s) URL");
              return;
            }
            void saveField("googleBusinessUrl", {
              googleBusinessUrl: draftGoogleBusinessUrl.trim(),
            } as BusinessProfileFormValues);
          }}
        >
          <Input
            value={draftGoogleBusinessUrl}
            onChange={(e) => setDraftGoogleBusinessUrl(e.target.value)}
            placeholder="https://maps.google.com/… (optional)"
          />
        </SettingsEditableField>
      </div>
    );
  }

  if (section === "social") {
    return (
      <SettingsSocialSection
        business={business}
        onSave={onSave}
        onHeaderActionChange={onHeaderActionChange}
      />
    );
  }

  return null;
}
