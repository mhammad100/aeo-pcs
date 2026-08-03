"use client";

import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import { api, ApiError } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordModal({ open, onClose }: Props) {
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
      onClose();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title="Change password"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      okText="Update password"
      confirmLoading={saving}
      destroyOnClose
      className="change-password-modal"
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
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
      </Form>
    </Modal>
  );
}
