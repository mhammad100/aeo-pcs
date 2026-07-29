"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, Progress, Spin, Typography } from "antd";
import AppShell from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import type { SubscriptionInfo } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getMySubscription();
        if (!cancelled) setSubscription(res.subscription);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load subscription");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribed = subscription ? hasActiveSubscription(subscription) : false;
  const used = subscription?.runsUsedThisPeriod ?? 0;
  const limit = subscription?.runsLimit ?? 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Subscription
      </Title>
      <Paragraph type="secondary">Your plan and visibility run entitlement for this period.</Paragraph>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : !subscribed ? (
        <Card>
          <Paragraph style={{ marginBottom: 12 }}>
            You do not have an active plan yet. Choose one to unlock visibility checks.
          </Paragraph>
          <Link href="/app/onboarding/plan">Choose a plan</Link>
        </Card>
      ) : (
        <Card>
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>Plan: </Text>
            {subscription?.plan?.name}
            {subscription?.plan?.priceLabel ? ` · ${subscription.plan.priceLabel}` : ""}
          </Paragraph>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            {subscription?.plan?.blurb || subscription?.note || "Your current subscription."}
          </Paragraph>
          <Text>
            Visibility runs this month: {used} / {limit}
          </Text>
          <Progress percent={pct} style={{ marginTop: 8, marginBottom: 16 }} />
          {subscription?.plan?.features?.length ? (
            <ul>
              {subscription.plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
          <Link href="/pricing">View public pricing</Link>
        </Card>
      )}
    </AppShell>
  );
}
