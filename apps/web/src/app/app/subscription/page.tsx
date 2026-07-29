"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Progress, Spin, Typography, message } from "antd";
import AppShell from "@/components/AppShell";
import PlanCatalog from "@/components/PlanCatalog";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import type { ProductPlan, SubscriptionInfo } from "@aeo-pcs/shared";

const { Title, Text } = Typography;

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, plansRes] = await Promise.all([
        api.getMySubscription(),
        api.listCatalogPlans(),
      ]);
      setSubscription(subRes.subscription);
      setPlans(plansRes.plans);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onChangePlan(planId: string) {
    setSubscribingId(planId);
    setError(null);
    try {
      const res = await api.subscribeToPlan(planId);
      setSubscription(res.subscription);
      message.success("Plan updated");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update plan");
    } finally {
      setSubscribingId(null);
    }
  }

  const subscribed = subscription ? hasActiveSubscription(subscription) : false;
  const used = subscription?.runsUsedThisPeriod ?? 0;
  const limit = subscription?.runsLimit ?? 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Subscription
      </Title>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : !subscribed ? (
        <Card>
          <Text>Select a plan to run visibility checks.</Text>
          {plans.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <PlanCatalog plans={plans} subscribingId={subscribingId} onSelect={onChangePlan} />
            </div>
          ) : (
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              No plans are available right now.
            </Text>
          )}
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 24 }}>
            <Text strong>{subscription?.plan?.name}</Text>
            {subscription?.plan?.priceLabel ? (
              <Text type="secondary"> · {subscription.plan.priceLabel}</Text>
            ) : null}
            <div style={{ marginTop: 12 }}>
              Visibility runs: {used} / {limit}
            </div>
            <Progress percent={pct} style={{ marginTop: 8 }} />
          </Card>
          {plans.length > 1 ? (
            <>
              <Title level={4} style={{ color: "#EDEAE1", marginBottom: 16 }}>
                Change plan
              </Title>
              <PlanCatalog
                plans={plans}
                currentPlanId={subscription?.plan?.id}
                subscribingId={subscribingId}
                onSelect={onChangePlan}
                selectLabel="Switch"
              />
            </>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
