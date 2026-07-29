"use client";

import { Button, Form, Input, Select, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { CATEGORIES, type BusinessProfile } from "@aeo-pcs/shared";

export type BusinessProfileFormValues = {
  name: string;
  category: string;
  city: string;
  country: string;
  description?: string;
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
  onSubmit,
}: Props) {
  const [form] = Form.useForm<BusinessProfileFormValues>();

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
      <Form.Item name="description" label="Short description">
        <Input.TextArea rows={3} maxLength={2000} showCount placeholder="What you do, who you serve…" />
      </Form.Item>
    </>
  );

  const locationFields = (
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
          {fields.length === 0 && (
            <p className="app-form-hint">Add Instagram, Facebook, LinkedIn, or other profiles.</p>
          )}
          {fields.map((field) => (
            <div key={field.key} className="app-social-row">
              <Form.Item
                {...field}
                name={[field.name, "label"]}
                rules={[{ required: true, message: "Label" }]}
                className="app-social-label"
              >
                <Input placeholder="Instagram / Facebook / …" />
              </Form.Item>
              <Form.Item
                {...field}
                name={[field.name, "url"]}
                rules={[{ required: true, message: "URL" }, urlRule()]}
                className="app-social-url"
              >
                <Input placeholder="https://…" />
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
          ))}
          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block className="app-social-add">
            Add social link
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
        city: initial?.city || "",
        country: initial?.country || "India",
        description: initial?.description || "",
        websiteUrl: initial?.websiteUrl || "",
        googleBusinessUrl: initial?.googleBusinessUrl || "",
        socialLinks: initial?.socialLinks?.length ? initial.socialLinks : [],
      }}
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
              <p>Name and category used in AI visibility prompts.</p>
            </div>
            {identityFields}
          </section>
          <section className="app-form-section">
            <div className="app-form-section-head">
              <h4>Location</h4>
              <p>Helps models return locally relevant results.</p>
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
          <Form.List name="socialLinks">
            {(fields, { add, remove }) => (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>Social media links</div>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item
                      {...field}
                      name={[field.name, "label"]}
                      rules={[{ required: true, message: "Label" }]}
                    >
                      <Input placeholder="Instagram / Facebook / …" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, "url"]}
                      rules={[{ required: true, message: "URL" }, urlRule()]}
                    >
                      <Input placeholder="https://…" style={{ width: 280 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                  Add social link
                </Button>
              </div>
            )}
          </Form.List>
          {submitButton}
        </>
      ) : null}
    </Form>
  );
}
