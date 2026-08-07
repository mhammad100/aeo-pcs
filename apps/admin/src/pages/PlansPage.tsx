import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { api, type AdminPlan, ApiError } from "@/lib/api";

const { Title, Paragraph, Text } = Typography;

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
      const body = {
        name: values.name as string,
        slug: values.slug as string | undefined,
        price: values.price as number,
        currency: (values.currency as string) || "INR",
        priceLabel: values.priceLabel as string | undefined,
        billingPeriod: (values.billingPeriod as "monthly" | "yearly") || "monthly",
        blurb: values.blurb as string | undefined,
        features: String(values.featuresText || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        visibilityRunsPerMonth: values.visibilityRunsPerMonth as number | undefined,
        active: values.active as boolean | undefined,
        sortOrder: values.sortOrder as number | undefined,
      };

      if (editing) {
        const res = await api.updateAdminPlan(editing.id, body);
        const m = res.migration;
        if (m && (m.scheduled > 0 || m.failed > 0)) {
          message.success(
            `Plan updated. ${m.scheduled} subscriber(s) scheduled for the new price/period at next renewal` +
              (m.failed ? `; ${m.failed} failed` : "")
          );
        } else {
          message.success("Plan updated");
        }
      } else {
        await api.createAdminPlan({
          ...body,
          visibilityRunsPerMonth: (values.visibilityRunsPerMonth as number) ?? 3,
          active: (values.active as boolean) ?? true,
          sortOrder: (values.sortOrder as number) ?? 0,
        });
        message.success("Plan created and synced to payment provider");
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
      <Title level={2} style={{ color: "#EDEFF6" }}>
        Plans
      </Title>
      <Paragraph type="secondary">
        Catalog plans shown to businesses. When Razorpay is configured, saving a plan creates the
        matching payment plan. Changing price or billing period schedules existing subscribers onto
        the new plan at their next renewal.
      </Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            planForm.resetFields();
            planForm.setFieldsValue({
              currency: "INR",
              billingPeriod: "monthly",
              active: true,
              visibilityRunsPerMonth: 5,
            });
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
            title: "Period",
            dataIndex: "billingPeriod",
            render: (v?: string) => (v === "yearly" ? "Yearly" : "Monthly"),
          },
          {
            title: "Checks/mo",
            dataIndex: ["limits", "visibilityRunsPerMonth"],
          },
          {
            title: "Payment plan ID",
            dataIndex: "razorpayPlanId",
            render: (v?: string) => v || "-",
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
                      billingPeriod: r.billingPeriod || "monthly",
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

      <Title level={4} style={{ color: "#EDEFF6" }}>
        Recent subscriptions
      </Title>
      <Table
        loading={loading}
        rowKey="id"
        dataSource={subs}
        pagination={false}
        columns={[
          { title: "Business", dataIndex: "businessName" },
          { title: "Plan", render: (_, r) => r.plan?.name || "-" },
          { title: "Status", dataIndex: "status" },
        ]}
      />

      <Modal
        title={editing ? "Edit plan" : "New plan"}
        open={planModal}
        onCancel={() => setPlanModal(false)}
        onOk={() => planForm.submit()}
        destroyOnClose
        width={560}
      >
        <Form form={planForm} layout="vertical" onFinish={savePlan}>
          {editing ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Price or period changes"
              description="Saving a new price or billing period creates a new payment plan and schedules active subscribers to move to it at their next renewal. The current period is unchanged."
            />
          ) : null}
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="auto from name if empty" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Price"
            rules={[
              { required: true },
              { type: "number", min: 0.01, message: "Price must be greater than zero" },
            ]}
          >
            <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
            <Input maxLength={3} placeholder="INR" />
          </Form.Item>
          <Form.Item
            name="billingPeriod"
            label="Billing period"
            rules={[{ required: true }]}
            extra="How often subscribers are charged."
          >
            <Select
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
          </Form.Item>
          <Form.Item name="priceLabel" label="Display label">
            <Input placeholder="₹999/mo" />
          </Form.Item>
          <Form.Item name="blurb" label="Blurb">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="featuresText" label="Features (one per line)">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="visibilityRunsPerMonth" label="Visibility checks / month">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          {editing?.razorpayPlanId ? (
            <Form.Item label="Payment plan ID">
              <Text type="secondary" copyable>
                {editing.razorpayPlanId}
              </Text>
            </Form.Item>
          ) : null}
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
