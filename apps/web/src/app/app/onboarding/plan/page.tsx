"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Row, Spin, Typography, message } from "antd";
import AuthGuard from "@/components/AuthGuard";
import OnboardingSteps from "@/components/OnboardingSteps";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import type { ProductPlan } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function OnboardingPlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const subRes = await api.getMySubscription();
        if (!cancelled && hasActiveSubscription(subRes.subscription)) {
          router.replace("/app/onboarding/profile");
          return;
        }

        const { plans: catalog } = await api.listCatalogPlans();
        if (!cancelled) setPlans(catalog);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load plans");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSelectPlan(planId: string) {
    setSubscribingId(planId);
    setError(null);
    try {
      await api.subscribeToPlan(planId);
      message.success("Plan selected");
      router.replace("/app/onboarding/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not subscribe to plan");
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "#0F1A17", padding: "40px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Text style={{ color: "#8FBF9F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Master AEO
          </Text>
          <Title level={2} style={{ color: "#EDEAE1", marginTop: 8 }}>
            Choose your plan
          </Title>
          <OnboardingSteps current={0} />
          <Paragraph type="secondary">
            Pick a plan to unlock visibility checks. You will complete your business profile next.
          </Paragraph>

          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          {loading ? (
            <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
              <Spin />
            </div>
          ) : plans.length === 0 ? (
            <Card>
              <Paragraph style={{ marginBottom: 8 }}>
                No plans are available yet. An administrator needs to publish plans before you can
                continue.
              </Paragraph>
              <Link href="/pricing">
                <Button type="link" style={{ padding: 0 }}>
                  View pricing page
                </Button>
              </Link>
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {plans.map((plan) => (
                <Col xs={24} md={12} lg={8} key={plan.id}>
                  <Card
                    title={plan.name}
                    style={{ height: "100%" }}
                    actions={[
                      <Button
                        key="select"
                        type="primary"
                        block
                        loading={subscribingId === plan.id}
                        disabled={Boolean(subscribingId && subscribingId !== plan.id)}
                        onClick={() => onSelectPlan(plan.id)}
                      >
                        Select plan
                      </Button>,
                    ]}
                  >
                    <Paragraph strong style={{ fontSize: 20, marginBottom: 8 }}>
                      {plan.priceLabel || `${plan.currency} ${plan.price}`}
                    </Paragraph>
                    {plan.blurb ? (
                      <Paragraph type="secondary" style={{ minHeight: 48 }}>
                        {plan.blurb}
                      </Paragraph>
                    ) : null}
                    <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                      <li>{plan.limits.visibilityRunsPerMonth} visibility runs / month</li>
                    </ul>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
