"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Spin, message } from "antd";
import AuthGuard from "@/components/AuthGuard";
import OnboardingShell from "@/components/OnboardingShell";
import PlanCatalog from "@/components/PlanCatalog";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import type { ProductPlan } from "@aeo-pcs/shared";

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
      setError(err instanceof ApiError ? err.message : "Could not update plan");
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <AuthGuard>
      <OnboardingShell
        step={0}
        wide
        title="Choose a plan"
        subtitle="Pick the plan that fits your business. You can change it later."
      >
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <div className="onboarding-loading">
            <Spin size="large" />
          </div>
        ) : plans.length === 0 ? (
          <div className="onboarding-card onboarding-card-empty">
            <p>No plans are available right now. Check back soon.</p>
          </div>
        ) : (
          <PlanCatalog plans={plans} subscribingId={subscribingId} onSelect={onSelectPlan} />
        )}
      </OnboardingShell>
    </AuthGuard>
  );
}
