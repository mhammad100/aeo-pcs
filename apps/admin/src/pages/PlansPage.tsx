import { Alert, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function PlansPage() {
  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Plans
      </Title>
      <Alert
        type="info"
        showIcon
        message="Coming in v0.4"
        description="Plan CRUD, pricing, and subscription assignment will live here."
        style={{ marginBottom: 16 }}
      />
      <Paragraph type="secondary">
        This admin route is scaffolded so navigation and IA stay stable while monetization ships.
      </Paragraph>
    </div>
  );
}
