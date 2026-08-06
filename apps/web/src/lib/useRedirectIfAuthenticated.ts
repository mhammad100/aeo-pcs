"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { resolvePostAuthPath } from "@/lib/authRouting";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import { logoutAndReset } from "@/store/session";

type Options = {
  /** Skip redirect (e.g. after SESSION_REVOKED so the user can see the notice). */
  skip?: boolean;
};

/** When a persisted token is still valid, send the user into the app instead of auth forms. */
export function useRedirectIfAuthenticated(options: Options = {}) {
  const { skip = false } = options;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const [checking, setChecking] = useState(() => Boolean(token) && !skip);

  useEffect(() => {
    if (skip || !token) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    async function check() {
      setChecking(true);
      try {
        const { user } = await api.me();
        if (cancelled) return;
        if (user.role !== "business" || user.status !== "active") {
          void dispatch(logoutAndReset({ revokeServer: false }));
          setChecking(false);
          return;
        }
        dispatch(setUser(user));
        const nextPath = await resolvePostAuthPath(user);
        if (!cancelled) {
          router.replace(nextPath);
        }
      } catch {
        // 401 clears auth in the API client; show the form for any other failure.
        if (!cancelled) setChecking(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [token, skip, dispatch, router]);

  return checking;
}
