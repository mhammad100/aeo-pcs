import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
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
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
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
  const [assignModal, setAssignModal] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [planForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, b, s] = await Promise.all([
        api.listAdminPlans(),
        api.listBusinesses(),
        api.listAdminSubscriptions(),
      ]);
      setPlans(p.plans);
      setBusinesses(b.businesses.map((x) => ({ id: x.id, name: x.name || x.id })));
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

  async function assignPlan(values: {
    businessId: string;
    planId: string;
    createInvoice?: boolean;
  }) {
    try {
      await api.assignSubscription({
        businessId: values.businessId,
        planId: values.planId,
        createInvoice: values.createInvoice,
      });
      message.success("Subscription assigned");
      setAssignModal(false);
      assignForm.resetFields();
      await load();
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : "Assign failed");
    }
  }

  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Plans
      </Title>
      <Paragraph type="secondary">
        Product plan catalog, limits, and subscription assignment for businesses.
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
        <Button onClick={() => setAssignModal(true)}>Assign subscription</Button>
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
          <Form.Item name="price" label="Price" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="currency" label="Currency">
            <Input maxLength={3} />
          </Form.Item>
          <Form.Item name="priceLabel" label="Display label">
            <Input placeholder="$99/mo or Invite" />
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

      <Modal
        title="Assign subscription"
        open={assignModal}
        onCancel={() => setAssignModal(false)}
        onOk={() => assignForm.submit()}
        destroyOnClose
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={assignPlan}
          initialValues={{ createInvoice: true }}
        >
          <Form.Item name="businessId" label="Business" rules={[{ required: true }]}>
            <Select
              options={businesses.map((b) => ({ value: b.id, label: b.name || b.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
            <Select options={plans.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="createInvoice" label="Create invoice if price > 0" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Text type="secondary">Cancels any existing active subscription for that business.</Text>
        </Form>
      </Modal>
    </div>
  );
}
