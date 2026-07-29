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

type Props = {
  initial?: BusinessProfile | null;
  submitLabel?: string;
  loading?: boolean;
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
  onSubmit,
}: Props) {
  const [form] = Form.useForm<BusinessProfileFormValues>();

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
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
      <Form.Item name="name" label="Business name" rules={[{ required: true, message: "Required" }]}>
        <Input placeholder="Your business name" />
      </Form.Item>
      <Form.Item name="category" label="Category" rules={[{ required: true, message: "Required" }]}>
        <Select
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
          placeholder="Select category"
        />
      </Form.Item>
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
      <Form.Item name="description" label="Short description">
        <Input.TextArea rows={3} maxLength={2000} showCount />
      </Form.Item>
      <Form.Item name="websiteUrl" label="Website (optional)" rules={[urlRule()]}>
        <Input placeholder="https://example.com (optional)" />
      </Form.Item>
      <Form.Item name="googleBusinessUrl" label="Google Business Profile link" rules={[urlRule()]}>
        <Input placeholder="https://maps.google.com/... (optional)" />
      </Form.Item>

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

      <Button type="primary" htmlType="submit" loading={loading} size="large">
        {submitLabel}
      </Button>
    </Form>
  );
}
