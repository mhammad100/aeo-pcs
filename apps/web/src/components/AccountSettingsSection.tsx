"use client";

import { useState } from "react";
import { Button, Form, Input, message } from "antd";
import { api, ApiError } from "@/lib/api";

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function AccountSettingsSection({ onSuccess, onCancel }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  async function onSubmit(values: FormValues) {
    if (values.newPassword !== values.confirmPassword) {
      message.error("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success("Password updated");
      form.resetFields();
      onSuccess?.();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-account">
      <div className="settings-account-block">
        <div className="settings-account-block-head">
          <h4>Change password</h4>
          <p>Choose a strong password with at least 8 characters.</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="settings-account-form"
          onFinish={onSubmit}
        >
          <Form.Item
            name="currentPassword"
            label="Current password"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: "Enter a new password" },
              { min: 8, message: "At least 8 characters" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm new password"
            rules={[{ required: true, message: "Confirm your new password" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <div className="settings-account-form-actions">
            {onCancel && (
              <Button onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="primary" htmlType="submit" loading={saving}>
              Update password
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
