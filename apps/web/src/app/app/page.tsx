"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { useAppSelector } from "@/store/hooks";

const { Title, Paragraph, Text } = Typography;

export default function AppDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const profileComplete = Boolean(user?.business?.profileCompletedAt);

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Dashboard
      </Title>
      <Paragraph type="secondary">
        Welcome{user?.email ? `, ${user.email}` : ""}. This is your business panel shell — insights,
        subscription, and billing land in later milestones.
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>Business profile</Text>
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {profileComplete
            ? "Profile marked complete."
            : "Profile incomplete — onboarding gate (website, Google Business, socials) is next (B3)."}
        </Paragraph>
        {user?.business && (
          <Paragraph style={{ marginBottom: 0 }}>
            {user.business.name || "Unnamed business"}
            {user.business.city ? ` · ${user.business.city}` : ""}
            {user.business.country ? `, ${user.business.country}` : ""}
          </Paragraph>
        )}
      </Card>

      <Link href="/app/visibility">
        <Button type="primary">Open visibility check</Button>
      </Link>
    </AppShell>
  );
}
