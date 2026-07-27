"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { useAppSelector } from "@/store/hooks";

const { Title, Paragraph, Text } = Typography;

export default function AppDashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const biz = user?.business;

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Dashboard
      </Title>
      <Paragraph type="secondary">
        Welcome{user?.email ? `, ${user.email}` : ""}. Your profile is ready — run a visibility check
        when you want to measure AI mentions.
      </Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>Business profile</Text>
        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Complete · used for all visibility runs
        </Paragraph>
        {biz && (
          <>
            <Paragraph style={{ marginBottom: 4 }}>
              <Text strong>{biz.name}</Text>
              {biz.category ? ` · ${biz.category}` : ""}
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 4 }}>
              {[biz.city, biz.country].filter(Boolean).join(", ")}
            </Paragraph>
            {biz.websiteUrl && (
              <Paragraph style={{ marginBottom: 0 }}>
                <a href={biz.websiteUrl} target="_blank" rel="noreferrer">
                  {biz.websiteUrl}
                </a>
              </Paragraph>
            )}
          </>
        )}
      </Card>

      <Link href="/app/visibility">
        <Button type="primary">Open visibility check</Button>
      </Link>
    </AppShell>
  );
}
