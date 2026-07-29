"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import { api } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import { useAppSelector } from "@/store/hooks";

const PLAN_ONBOARDING_PATH = "/app/onboarding/plan";

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { subscription } = await api.getMySubscription();
        if (cancelled) return;

        const subscribed = hasActiveSubscription(subscription);
        const onPlanOnboarding = pathname?.startsWith(PLAN_ONBOARDING_PATH);

        if (!subscribed && !onPlanOnboarding) {
          router.replace(PLAN_ONBOARDING_PATH);
          return;
        }
        if (subscribed && onPlanOnboarding) {
          router.replace(
            user?.business?.profileCompletedAt ? "/app" : "/app/onboarding/profile"
          );
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          router.replace(PLAN_ONBOARDING_PATH);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, user]);

  if (!ready) {
    return (
      <div style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
        <Spin />
      </div>
    );
  }

  return <>{children}</>;
}
