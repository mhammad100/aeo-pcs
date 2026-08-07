import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import { api, type AdminUserRow, ApiError } from "@/lib/api";

const { Title } = Typography;

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(values: { email: string; password: string; businessName?: string }) {
    setCreating(true);
    try {
      await api.createBusinessUser(values);
      message.success("Business user created");
      setOpen(false);
      form.resetFields();
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(row: AdminUserRow) {
    if (row.role === "admin") return;
    const next = row.status === "active" ? "disabled" : "active";
    try {
      await api.setUserStatus(row.id, next);
      message.success(`User ${next}`);
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0, color: "#EDEFF6" }}>
          Users
        </Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Create business user
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={users}
        columns={[
          { title: "Email", dataIndex: "email" },
          {
            title: "Role",
            dataIndex: "role",
            render: (v: string) => <Tag>{v}</Tag>,
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (v: string) => (
              <Tag color={v === "active" ? "green" : "default"}>{v}</Tag>
            ),
          },
          {
            title: "Business",
            render: (_: unknown, row: AdminUserRow) => row.business?.name || "—",
          },
          {
            title: "Profile",
            render: (_: unknown, row: AdminUserRow) =>
              row.business?.profileCompletedAt ? "Complete" : row.business ? "Incomplete" : "—",
          },
          {
            title: "Actions",
            render: (_: unknown, row: AdminUserRow) =>
              row.role === "admin" ? null : (
                <Button size="small" onClick={() => toggleStatus(row)}>
                  {row.status === "active" ? "Disable" : "Enable"}
                </Button>
              ),
          },
        ]}
      />

      <Modal
        title="Create business user"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onCreate} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Temp password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="businessName" label="Business name (optional)">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={creating}>
            Create
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
