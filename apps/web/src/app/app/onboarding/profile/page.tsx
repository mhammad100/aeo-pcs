"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Spin, message } from "antd";
import AuthGuard from "@/components/AuthGuard";
import OnboardingProfileWizard from "@/components/OnboardingProfileWizard";
import OnboardingShell from "@/components/OnboardingShell";
import { type BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import { api, ApiError } from "@/lib/api";
import { normalizeProfilePayload } from "@/lib/businessProfileForm";
import { hasActiveSubscription } from "@/lib/authRouting";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import type { BusinessProfile } from "@aeo-pcs/shared";

export default function OnboardingProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasCompleteOnArrival = useRef<boolean | null>(null);

  useEffect(() => {
    if (business === null || wasCompleteOnArrival.current !== null) return;
    wasCompleteOnArrival.current = Boolean(business.profileCompletedAt);
    const wizardInProgress = sessionStorage.getItem("onboarding-profile-started");
    if (wasCompleteOnArrival.current && !wizardInProgress) {
      router.replace("/app");
    }
  }, [business, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const subRes = await api.getMySubscription();
        if (!cancelled && !hasActiveSubscription(subRes.subscription)) {
          router.replace("/app/onboarding/plan");
          return;
        }

        const res = await api.getMyBusiness();
        if (!cancelled) setBusiness(res.business);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSave(values: BusinessProfileFormValues): Promise<BusinessProfile> {
    setSaving(true);
    setError(null);
    try {
      const { business: saved } = await api.updateMyBusiness(normalizeProfilePayload(values));
      setBusiness(saved);
      const me = await api.me();
      dispatch(setUser(me.user));
      return saved;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function onComplete() {
    sessionStorage.removeItem("onboarding-profile-started");
    message.success("Profile complete — welcome to Master AEO");
    router.replace("/app");
  }

  return (
    <AuthGuard>
      <OnboardingShell
        step={1}
        title="Complete your business profile"
        subtitle="Four quick steps — the last two are optional, but help us tailor your action plan."
      >
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {loading ? (
          <div className="onboarding-loading">
            <Spin size="large" />
          </div>
        ) : (
          <OnboardingProfileWizard
            business={business}
            saving={saving}
            onSave={onSave}
            onComplete={onComplete}
          />
        )}
      </OnboardingShell>
    </AuthGuard>
  );
}
