"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import AuthGuard from "@/components/AuthGuard";

/** Plan selection was removed from onboarding; keep this route as a redirect. */
export default function OnboardingPlanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/subscription");
  }, [router]);

  return (
    <AuthGuard>
      <div style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    </AuthGuard>
  );
}
