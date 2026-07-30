"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import { logoutAndReset } from "@/store/session";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const { user } = await api.me();
        if (!cancelled) {
          if (user.role !== "business" || user.status !== "active") {
            void dispatch(logoutAndReset());
            router.replace("/login");
            return;
          }
          dispatch(setUser(user));
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          void dispatch(logoutAndReset());
          router.replace("/login");
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch, router]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0F1A17" }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
