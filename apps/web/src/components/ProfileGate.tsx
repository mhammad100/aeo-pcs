"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAppSelector } from "@/store/hooks";

const PROFILE_ONBOARDING_PATH = "/app/onboarding/profile";
const PLAN_ONBOARDING_PATH = "/app/onboarding/plan";

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const complete = Boolean(user?.business?.profileCompletedAt);
    const onProfileOnboarding = pathname?.startsWith(PROFILE_ONBOARDING_PATH);
    const onPlanOnboarding = pathname?.startsWith(PLAN_ONBOARDING_PATH);
    const onOnboarding = onProfileOnboarding || onPlanOnboarding;

    if (!complete && !onOnboarding) {
      router.replace(PROFILE_ONBOARDING_PATH);
      return;
    }
    if (complete && onOnboarding) {
      router.replace("/app");
      return;
    }
    setReady(true);
  }, [user, pathname, router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
        <Spin />
      </div>
    );
  }

  return <>{children}</>;
}
