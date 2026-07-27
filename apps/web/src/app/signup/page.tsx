"use client";

import Link from "next/link";
import { Alert, Button, Card, Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0F1A17", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 480 }}>
        <Text style={{ color: "#8FBF9F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Master AEO
        </Text>
        <Title level={2} style={{ marginTop: 8 }}>
          Sign up
        </Title>
        <Alert
          type="info"
          showIcon
          message="Signup is invite-only for now"
          description="Self-serve signup is disabled. Contact info@masteraeo.com for an account, or log in if you already have one."
          style={{ marginBottom: 20 }}
        />
        <Paragraph type="secondary">
          Business onboarding (profile, website, Google Business, social links) will start right after
          account creation when signup is enabled.
        </Paragraph>
        <Link href="/login">
          <Button type="primary" block>
            Go to log in
          </Button>
        </Link>
      </Card>
    </div>
  );
}
