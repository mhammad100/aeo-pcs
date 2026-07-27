"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAppSelector } from "@/store/hooks";

const ONBOARDING_PATH = "/app/onboarding/profile";

export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const complete = Boolean(user?.business?.profileCompletedAt);
    const onOnboarding = pathname?.startsWith("/app/onboarding");

    if (!complete && !onOnboarding) {
      router.replace(ONBOARDING_PATH);
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
