import { Card, Col, Row, Typography } from "antd";
import { Link } from "react-router-dom";

const { Title, Paragraph, Text } = Typography;

export default function DashboardPage() {
  return (
    <div>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Overview
      </Title>
      <Paragraph type="secondary">
        Operator console for masteraeo.com — create business accounts, manage plans, and later track
        token usage and profit.
      </Paragraph>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Users">
            <Text type="secondary">Create and disable business accounts.</Text>
            <div style={{ marginTop: 12 }}>
              <Link to="/users">Open users</Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Businesses">
            <Text type="secondary">Inspect profiles and onboarding completion.</Text>
            <div style={{ marginTop: 12 }}>
              <Link to="/businesses">Open businesses</Link>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Plans / Usage">
            <Text type="secondary">CRUD and profit insights land in v0.4–v0.5.</Text>
            <div style={{ marginTop: 12 }}>
              <Link to="/plans">Plans</Link> · <Link to="/usage">Usage</Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
