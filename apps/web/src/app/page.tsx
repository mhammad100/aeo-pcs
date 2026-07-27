"use client";

import Link from "next/link";
import { Button, Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0F1A17", color: "#EDEAE1" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
        <Text style={{ color: "#8FBF9F", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Master AEO
        </Text>
        <Title style={{ color: "#EDEAE1", marginTop: 12, fontSize: 44, lineHeight: 1.1 }}>
          Know if AI can find your business.
        </Title>
        <Paragraph style={{ color: "#B9C4BC", fontSize: 18, maxWidth: 560 }}>
          Measure your visibility across AI assistants, get a clear action plan, and track progress
          month over month.
        </Paragraph>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <Link href="/login">
            <Button type="primary" size="large">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="large">Sign up</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
