"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Spin, message } from "antd";
import { COPY } from "@aeo-pcs/shared";
import AuthGuard from "@/components/AuthGuard";
import OnboardingShell from "@/components/OnboardingShell";
import PlanCatalog from "@/components/PlanCatalog";
import { api, ApiError } from "@/lib/api";
import { CHECKOUT_DISMISSED, checkoutPlan } from "@/lib/checkoutSubscription";
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
          setError(err instanceof ApiError ? err.message : COPY.billing.loadSubscriptionFailed);
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
      await checkoutPlan(planId);
      message.success(COPY.billing.subscribeSuccess);
      router.replace("/app/onboarding/profile");
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

  return (
    <AuthGuard>
      <OnboardingShell
        step={0}
        wide
        title="Choose a plan"
        subtitle="Select the plan that fits your business. You can change or cancel anytime from your account."
      >
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <div className="onboarding-loading">
            <Spin size="large" />
          </div>
        ) : plans.length === 0 ? (
          <div className="onboarding-card onboarding-card-empty">
            <p>{COPY.billing.noPlans}</p>
          </div>
        ) : (
          <PlanCatalog
            plans={plans}
            subscribingId={subscribingId}
            onSelect={onSelectPlan}
            selectLabel="Subscribe"
          />
        )}
      </OnboardingShell>
    </AuthGuard>
  );
}
