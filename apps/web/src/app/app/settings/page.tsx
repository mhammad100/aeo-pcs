"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Spin, Typography, message } from "antd";
import AppShell from "@/components/AppShell";
import BusinessProfileForm, {
  type BusinessProfileFormValues,
} from "@/components/BusinessProfileForm";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import type { BusinessProfile } from "@aeo-pcs/shared";

const { Title, Paragraph } = Typography;

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
  }, []);

  async function onSubmit(values: BusinessProfileFormValues) {
    setSaving(true);
    setError(null);
    try {
      const { business: saved } = await api.updateMyBusiness({
        ...values,
        socialLinks: (values.socialLinks || []).filter((s) => s.label && s.url),
      });
      setBusiness(saved);
      const me = await api.me();
      dispatch(setUser(me.user));
      message.success("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <Title level={2} style={{ color: "#EDEAE1" }}>
        Settings
      </Title>
      <Paragraph type="secondary">
        Update your business identity. Visibility checks and action plans use this profile.
      </Paragraph>
      <Card style={{ maxWidth: 640 }}>
        {loading ? (
          <div style={{ display: "grid", placeItems: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <>
            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
            <BusinessProfileForm
              key={business?.id || "settings"}
              initial={business}
              loading={saving}
              submitLabel="Save changes"
              onSubmit={onSubmit}
            />
          </>
        )}
      </Card>
    </AppShell>
  );
}
