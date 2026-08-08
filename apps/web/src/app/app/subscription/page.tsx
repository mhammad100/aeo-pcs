"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Popconfirm, Progress, Spin, Typography, message } from "antd";
import { COPY } from "@aeo-pcs/shared";
import AppShell from "@/components/AppShell";
import PlanCatalog from "@/components/PlanCatalog";
import { api, ApiError } from "@/lib/api";
import { CHECKOUT_DISMISSED, checkoutPlan } from "@/lib/checkoutSubscription";
import { hasActiveSubscription } from "@/lib/authRouting";
import type { ProductPlan, SubscriptionInfo } from "@aeo-pcs/shared";

const { Title, Text } = Typography;

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
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
      setError(err instanceof ApiError ? err.message : COPY.billing.loadSubscriptionFailed);
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
      const next = await checkoutPlan(planId);
      setSubscription(next);
      message.success(COPY.billing.planChangeSuccess);
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === CHECKOUT_DISMISSED) {
        return;
      }
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : COPY.billing.updatePlanFailed
      );
    } finally {
      setSubscribingId(null);
    }
  }

  async function onCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await api.cancelSubscription();
      setSubscription(res.subscription);
      message.success(COPY.billing.cancelSuccess);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : COPY.billing.cancelFailed);
    } finally {
      setCancelling(false);
    }
  }

  const subscribed = subscription ? hasActiveSubscription(subscription) : false;
  const used = subscription?.runsUsedThisPeriod ?? 0;
  const limit = subscription?.runsLimit ?? 0;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEFF6" }}>
        Subscription
      </Title>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : !subscribed ? (
        <Card>
          <Text>
            {COPY.billing.freeRunPrompt(
              Math.max(0, limit - used),
              limit
            )}
          </Text>
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {COPY.billing.selectPlanPrompt}
          </Text>
          {plans.length > 0 ? (
            <div style={{ marginTop: 16 }}>
              <PlanCatalog
                plans={plans}
                subscribingId={subscribingId}
                onSelect={onChangePlan}
                selectLabel="Subscribe"
              />
            </div>
          ) : (
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              {COPY.billing.noPlans}
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
              Visibility checks this period: {used} / {limit}
            </div>
            <Progress percent={pct} style={{ marginTop: 8 }} />
            {periodEnd ? (
              <Text type="secondary" style={{ display: "block", marginTop: 12 }}>
                {subscription?.cancelAtPeriodEnd
                  ? COPY.billing.cancelScheduled(periodEnd)
                  : COPY.billing.periodEnds(periodEnd)}
              </Text>
            ) : null}
            {!subscription?.cancelAtPeriodEnd ? (
              <Popconfirm
                title={COPY.billing.cancelConfirmTitle}
                description={COPY.billing.cancelConfirmBody}
                okText={COPY.billing.cancelConfirmOk}
                cancelText={COPY.billing.cancelConfirmKeep}
                okButtonProps={{ danger: true }}
                onConfirm={() => void onCancel()}
              >
                <Button danger style={{ marginTop: 16 }} loading={cancelling}>
                  {COPY.billing.cancelConfirmOk}
                </Button>
              </Popconfirm>
            ) : null}
          </Card>
          {plans.length > 1 ? (
            <>
              <Title level={4} style={{ color: "#EDEFF6", marginBottom: 16 }}>
                Change plan
              </Title>
              <PlanCatalog
                plans={plans}
                currentPlanId={subscription?.plan?.id}
                subscribingId={subscribingId}
                onSelect={onChangePlan}
                selectLabel="Switch plan"
              />
            </>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
