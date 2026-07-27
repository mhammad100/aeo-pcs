"use client";

import Link from "next/link";
import { Alert, Button, Card, Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <Link href="/" style={{ color: "var(--ma-accent-soft)", fontFamily: "var(--ma-font-display)" }}>
          Master AEO
        </Link>
        <Title level={2} style={{ marginTop: 8 }}>
          Get started
        </Title>
        <Alert
          type="info"
          showIcon
          message="Signup is invite-only for now"
          description="Self-serve signup is disabled while we onboard early businesses. Contact us for an account, or log in if you already have access."
          style={{ marginBottom: 20, marginTop: 12 }}
        />
        <Paragraph type="secondary">
          After access is granted, you will complete your business profile (website, optional Google
          Business and social links), then land in your dashboard.
        </Paragraph>
        <Link href="/login">
          <Button type="primary" block>
            Go to log in
          </Button>
        </Link>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            Or email <a href="mailto:hello@masteraeo.com">hello@masteraeo.com</a>
          </Text>
        </div>
      </Card>
    </div>
  );
}
