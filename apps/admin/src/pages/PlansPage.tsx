import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { api, type AdminPlan, ApiError } from "@/lib/api";

const { Title, Paragraph } = Typography;

export default function PlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subs, setSubs] = useState<
    Array<{
      id: string;
      status: string;
      businessName: string;
      plan: AdminPlan | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [planForm] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, s] = await Promise.all([api.listAdminPlans(), api.listAdminSubscriptions()]);
      setPlans(p.plans);
      setSubs(s.subscriptions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function savePlan(values: Record<string, unknown>) {
    try {
      if (editing) {
        await api.updateAdminPlan(editing.id, {
          name: values.name as string,
          slug: values.slug as string | undefined,
          price: values.price as number,
          currency: values.currency as string | undefined,
          priceLabel: values.priceLabel as string | undefined,
          blurb: values.blurb as string | undefined,
          features: String(values.featuresText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          visibilityRunsPerMonth: values.visibilityRunsPerMonth as number | undefined,
          active: values.active as boolean | undefined,
          sortOrder: values.sortOrder as number | undefined,
        });
        message.success("Plan updated");
      } else {
        await api.createAdminPlan({
          name: values.name as string,
          slug: values.slug as string | undefined,
          price: values.price as number,
          currency: (values.currency as string) || "USD",
          priceLabel: values.priceLabel as string | undefined,
          blurb: values.blurb as string | undefined,
          features: String(values.featuresText || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          visibilityRunsPerMonth: (values.visibilityRunsPerMonth as number) ?? 3,
          active: (values.active as boolean) ?? true,
          sortOrder: (values.sortOrder as number) ?? 0,
        });
        message.success("Plan created");
      }
      setPlanModal(false);
      setEditing(null);
      planForm.resetFields();
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  async function deletePlan(plan: AdminPlan) {
    try {
      await api.deleteAdminPlan(plan.id);
      message.success("Plan deleted");
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Plans
      </Title>
      <Paragraph type="secondary">
        Product plan catalog and limits. Businesses choose a plan during onboarding.
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            planForm.resetFields();
            planForm.setFieldsValue({ currency: "USD", active: true, visibilityRunsPerMonth: 5 });
            setPlanModal(true);
          }}
        >
          New plan
        </Button>
      </Space>

      <Table
        loading={loading}
        rowKey="id"
        dataSource={plans}
        pagination={false}
        style={{ marginBottom: 32 }}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Price",
            render: (_, r) => r.priceLabel || `${r.currency} ${r.price}`,
          },
          {
            title: "Runs/mo",
            dataIndex: ["limits", "visibilityRunsPerMonth"],
          },
          {
            title: "Active",
            dataIndex: "active",
            render: (v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
          },
          {
            title: "",
            render: (_, r) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    setEditing(r);
                    planForm.setFieldsValue({
                      ...r,
                      featuresText: (r.features || []).join("\n"),
                      visibilityRunsPerMonth: r.limits.visibilityRunsPerMonth,
                    });
                    setPlanModal(true);
                  }}
                >
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this plan?"
                  description="Active subscriptions block deletion. Deactivate the plan if you only want to hide it from signup."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deletePlan(r)}
                >
                  <Button type="link" danger>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Title level={4} style={{ color: "#EDEAE1" }}>
        Recent subscriptions
      </Title>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={subs}
        pagination={false}
        columns={[
          { title: "Business", dataIndex: "businessName" },
          { title: "Plan", render: (_, r) => r.plan?.name || "—" },
          { title: "Status", dataIndex: "status" },
        ]}
      />

      <Modal
        title={editing ? "Edit plan" : "New plan"}
        open={planModal}
        onCancel={() => setPlanModal(false)}
        onOk={() => planForm.submit()}
        destroyOnClose
      >
        <Form form={planForm} layout="vertical" onFinish={savePlan}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="auto from name if empty" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[{ required: true }, { type: "number", min: 0.01, message: "Price must be greater than zero" }]}
          >
            <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="currency" label="Currency">
            <Input maxLength={3} />
          </Form.Item>
          <Form.Item name="priceLabel" label="Display label">
            <Input placeholder="$99/mo" />
          </Form.Item>
          <Form.Item name="blurb" label="Blurb">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="featuresText" label="Features (one per line)">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="visibilityRunsPerMonth" label="Visibility runs / month">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
