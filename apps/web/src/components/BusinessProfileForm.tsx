"use client";

import { Button, Form, Input, Select, Space } from "antd";
import type { FormInstance } from "antd/es/form";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import SocialPlatformSelect from "@/components/SocialPlatformSelect";
import { CATEGORIES, type BusinessProfile } from "@aeo-pcs/shared";
import { SOCIAL_PLATFORMS, socialPlatformPlaceholder } from "@/lib/socialPlatforms";

const TARGET_ITEM_EXAMPLES = [
  "dental implants",
  "teeth whitening",
  "wedding catering",
  "home renovation",
];

export type BusinessProfileFormValues = {
  name: string;
  category: string;
  customCategory?: string;
  city: string;
  country: string;
  description: string;
  nameAliases?: string[];
  targetLocations?: string[];
  targetItems?: string[];
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: { label: string; url: string }[];
};

type SectionId = "identity" | "location" | "online" | "social";

type Props = {
  initial?: BusinessProfile | null;
  submitLabel?: string;
  loading?: boolean;
  sectioned?: boolean;
  activeSection?: SectionId;
  hideSubmit?: boolean;
  formId?: string;
  form?: FormInstance<BusinessProfileFormValues>;
  onValuesChange?: () => void;
  onSubmit: (values: BusinessProfileFormValues) => Promise<void> | void;
};

function urlRule() {
  return {
    validator(_: unknown, value: string) {
      if (!value) return Promise.resolve();
      try {
        const u = new URL(value);
        if (u.protocol === "http:" || u.protocol === "https:") return Promise.resolve();
      } catch {
        /* fall through */
      }
      return Promise.reject(new Error("Enter a valid http(s) URL"));
    },
  };
}

export default function BusinessProfileForm({
  initial,
  submitLabel = "Save profile",
  loading,
  sectioned = false,
  activeSection,
  hideSubmit = false,
  formId,
  form: externalForm,
  onValuesChange,
  onSubmit,
}: Props) {
  const [internalForm] = Form.useForm<BusinessProfileFormValues>();
  const form = externalForm ?? internalForm;
  const category = Form.useWatch("category", form);
  const socialLinks = Form.useWatch("socialLinks", form) || [];
  const targetItems = Form.useWatch("targetItems", form) || [];

  function addTargetExample(example: string) {
    const current = (form.getFieldValue("targetItems") as string[] | undefined) || [];
    const normalized = example.trim();
    if (!normalized || current.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    form.setFieldsValue({ targetItems: [...current, normalized] });
    onValuesChange?.();
  }

  const quickAddPlatforms = SOCIAL_PLATFORMS.filter(
    (platform) =>
      !(socialLinks as { label?: string }[]).some(
        (link) => link?.label?.toLowerCase() === platform.label.toLowerCase(),
      ),
  );

  const identityFields = (
    <>
      <div className="app-form-row app-form-row-tight">
        <Form.Item
          name="name"
          label="Business name"
          rules={[{ required: true, message: "Required" }]}
          className="app-form-row-item"
        >
          <Input placeholder="Your business name" />
        </Form.Item>
        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: "Required" }]}
          className="app-form-row-item"
        >
          <Select
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder="Select category"
          />
        </Form.Item>
      </div>
      {category === "Other" && (
        <Form.Item
          name="customCategory"
          label="Business type"
          rules={[
            { required: true, message: "Describe your business type" },
            { min: 2, message: "At least 2 characters" },
          ]}
        >
          <Input placeholder="e.g. Pet grooming, Law firm, Photography studio" />
        </Form.Item>
      )}
      <Form.Item
        name="description"
        label="Short description"
        rules={[
          { required: true, message: "Required" },
          { min: 10, message: "At least 10 characters" },
        ]}
      >
        <Input.TextArea
          rows={3}
          maxLength={2000}
          showCount
          placeholder="What you do, who you serve, and what makes you distinct…"
        />
      </Form.Item>
      <Form.Item
        name="nameAliases"
        label="Also known as (optional)"
        tooltip="Alternate names, abbreviations, or spellings we should count as a mention"
      >
        <Select
          mode="tags"
          tokenSeparators={[","]}
          placeholder="e.g. PCS, Pal Consultancy"
          open={false}
        />
      </Form.Item>
      <div className="app-form-field-block">
        <Form.Item
          name="targetItems"
          label="Target services / products"
          rules={[
            {
              validator: async (_, items: string[] | undefined) => {
                const cleaned = (items || []).map((item) => item.trim()).filter(Boolean);
                if (!cleaned.length) {
                  throw new Error("Add at least one service or product");
                }
              },
            },
          ]}
          extra="Type each service and press Enter, or paste a comma-separated list."
        >
          <Select
            mode="tags"
            tokenSeparators={[","]}
            placeholder="e.g. dental implants, teeth whitening, wedding catering"
            open={false}
            className="app-target-items-select"
          />
        </Form.Item>
        <div className="app-form-examples">
          <span className="app-form-examples-label">Try an example:</span>
          {TARGET_ITEM_EXAMPLES.map((example) => {
            const isAdded = (targetItems as string[]).some(
              (item) => item.toLowerCase() === example.toLowerCase(),
            );
            return (
              <button
                key={example}
                type="button"
                className={`app-form-example-chip${isAdded ? " is-added" : ""}`}
                disabled={isAdded}
                onClick={() => addTargetExample(example)}
              >
                {example}
              </button>
            );
          })}
        </div>
        <p className="app-form-field-note">
          These are the terms customers use when asking AI for recommendations — they shape your
          visibility prompts.
        </p>
      </div>
    </>
  );

  const locationFields = (
    <>
      <div className="app-form-row">
        <Form.Item
          name="city"
          label="City"
          rules={[{ required: true, message: "Required" }]}
          className="app-form-row-item"
        >
          <Input placeholder="City" />
        </Form.Item>
        <Form.Item
          name="country"
          label="Country"
          rules={[{ required: true, message: "Required" }]}
          className="app-form-row-item"
        >
          <Input placeholder="Country" />
        </Form.Item>
      </div>
      <Form.Item
        name="targetLocations"
        label="Target locations (optional)"
        tooltip="Neighborhoods and areas you serve, in addition to your primary city"
      >
        <Select
          mode="tags"
          tokenSeparators={[","]}
          placeholder="e.g. Satellite, SG Highway, Gandhinagar"
          open={false}
        />
      </Form.Item>
    </>
  );

  const onlineFields = (
    <>
      <Form.Item name="websiteUrl" label="Website" rules={[urlRule()]}>
        <Input placeholder="https://example.com (optional)" />
      </Form.Item>
      <Form.Item name="googleBusinessUrl" label="Google Business Profile" rules={[urlRule()]}>
        <Input placeholder="https://maps.google.com/… (optional)" />
      </Form.Item>
    </>
  );

  const socialFields = (
    <Form.List name="socialLinks">
      {(fields, { add, remove }) => (
        <div className="app-social-list">
          {quickAddPlatforms.length > 0 && (
            <div className="app-social-quick-add">
              <span className="app-form-examples-label">Quick add:</span>
              {quickAddPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  className="app-form-example-chip app-social-quick-chip"
                  onClick={() => {
                    add({ label: platform.label, url: "" });
                    onValuesChange?.();
                  }}
                >
                  <span className="app-social-quick-chip-icon">{platform.icon}</span>
                  {platform.label}
                </button>
              ))}
            </div>
          )}

          {fields.length === 0 ? (
            <p className="app-form-hint">
              Add Instagram, Facebook, LinkedIn, or another platform you use.
            </p>
          ) : (
            fields.map((field) => {
              const currentLabel =
                (socialLinks as { label?: string }[])?.[field.name]?.label || "";
              const usedLabels = (socialLinks as { label?: string }[])
                .map((link, index) => (index === field.name ? null : link?.label))
                .filter((label): label is string => Boolean(label));

              return (
                <div key={field.key} className="app-social-row">
                  <Form.Item
                    {...field}
                    name={[field.name, "label"]}
                    label="Platform"
                    rules={[{ required: true, message: "Select or enter a platform" }]}
                    className="app-social-label"
                  >
                    <SocialPlatformSelect usedLabels={usedLabels} />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, "url"]}
                    label="Profile URL"
                    rules={[{ required: true, message: "Enter the profile URL" }, urlRule()]}
                    className="app-social-url"
                  >
                    <Input placeholder={socialPlatformPlaceholder(currentLabel)} />
                  </Form.Item>
                  <button
                    type="button"
                    className="app-social-remove"
                    onClick={() => remove(field.name)}
                    aria-label="Remove link"
                  >
                    <MinusCircleOutlined />
                  </button>
                </div>
              );
            })
          )}

          <Button
            type="dashed"
            onClick={() => {
              add({ label: "", url: "" });
              onValuesChange?.();
            }}
            icon={<PlusOutlined />}
            block
            className="app-social-add"
          >
            Add another platform
          </Button>
        </div>
      )}
    </Form.List>
  );

  const submitButton = !hideSubmit ? (
    <Button type="primary" htmlType="submit" loading={loading} size="large">
      {submitLabel}
    </Button>
  ) : null;

  return (
    <Form
      id={formId}
      form={form}
      layout="vertical"
      requiredMark="optional"
      className={sectioned ? "app-profile-form is-sectioned" : "app-profile-form"}
      initialValues={{
        name: initial?.name || "",
        category: initial?.category || undefined,
        customCategory: initial?.customCategory || "",
        city: initial?.city || "",
        country: initial?.country || "India",
        description: initial?.description || "",
        nameAliases: initial?.nameAliases?.length ? initial.nameAliases : [],
        targetLocations: initial?.targetLocations?.length ? initial.targetLocations : [],
        targetItems: initial?.targetItems?.length ? initial.targetItems : [],
        websiteUrl: initial?.websiteUrl || "",
        googleBusinessUrl: initial?.googleBusinessUrl || "",
        socialLinks: initial?.socialLinks?.length ? initial.socialLinks : [],
      }}
      onValuesChange={onValuesChange}
      onFinish={onSubmit}
    >
      {activeSection === "identity" && identityFields}
      {activeSection === "location" && locationFields}
      {activeSection === "online" && onlineFields}
      {activeSection === "social" && socialFields}

      {!activeSection && sectioned ? (
        <>
          <section className="app-form-section">
            <div className="app-form-section-head">
              <h4>Business identity</h4>
              <p>How customers and AI assistants identify your business.</p>
            </div>
            {identityFields}
          </section>
          <section className="app-form-section">
            <div className="app-form-section-head">
              <h4>Location</h4>
              <p>Where you operate — used for local visibility checks.</p>
            </div>
            {locationFields}
          </section>
          <section className="app-form-section">
            <div className="app-form-section-head">
              <h4>Online presence</h4>
              <p>Optional links included in your action plan.</p>
            </div>
            {onlineFields}
          </section>
          <section className="app-form-section is-last">
            <div className="app-form-section-head">
              <h4>Social media</h4>
              <p>Profiles we can reference when generating content.</p>
            </div>
            {socialFields}
          </section>
          {submitButton}
        </>
      ) : !activeSection ? (
        <>
          {identityFields}
          <Space style={{ display: "flex" }} align="start">
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1, minWidth: 160 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="country"
              label="Country"
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1, minWidth: 160 }}
            >
              <Input />
            </Form.Item>
          </Space>
          {onlineFields}
          {socialFields}
          {submitButton}
        </>
      ) : null}
    </Form>
  );
}
