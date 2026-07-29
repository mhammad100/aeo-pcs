"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, Spin, Typography, message } from "antd";
import AuthGuard from "@/components/AuthGuard";
import OnboardingSteps from "@/components/OnboardingSteps";
import BusinessProfileForm, {
  type BusinessProfileFormValues,
} from "@/components/BusinessProfileForm";
import { api, ApiError } from "@/lib/api";
import { hasActiveSubscription } from "@/lib/authRouting";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import type { BusinessProfile } from "@aeo-pcs/shared";

const { Title, Paragraph, Text } = Typography;

export default function OnboardingProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authUser?.business?.profileCompletedAt) {
      router.replace("/app");
    }
  }, [authUser, router]);

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

  async function onSubmit(values: BusinessProfileFormValues) {
    setSaving(true);
    setError(null);
    try {
      const { business: saved } = await api.updateMyBusiness({
        ...values,
        socialLinks: (values.socialLinks || []).filter((s) => s.label && s.url),
      });
      const me = await api.me();
      dispatch(setUser(me.user));
      if (saved.profileCompletedAt) {
        message.success("Profile completed");
        router.replace("/app");
      } else {
        message.warning("Saved, but some required fields are still missing");
        setBusiness(saved);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "#0F1A17", padding: "40px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Text style={{ color: "#8FBF9F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Master AEO
          </Text>
          <Title level={2} style={{ color: "#EDEAE1", marginTop: 8 }}>
            Complete your business profile
          </Title>
          <OnboardingSteps current={1} />
          <Paragraph type="secondary">
            Tell us your business basics before you run visibility checks. Website, Google Business,
            and social links are optional but help AI assistants find you.
          </Paragraph>
          <Card>
            {loading ? (
              <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
                <Spin />
              </div>
            ) : (
              <>
                {error && (
                  <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
                )}
                <BusinessProfileForm
                  initial={business}
                  loading={saving}
                  submitLabel="Save and continue"
                  onSubmit={onSubmit}
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
