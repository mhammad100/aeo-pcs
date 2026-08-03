"use client";

import { useEffect, useState } from "react";
import { Spin, message } from "antd";
import AppShell from "@/components/AppShell";
import BusinessProfileSettings from "@/components/BusinessProfileSettings";
import { type BusinessProfileFormValues } from "@/components/BusinessProfileForm";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import type { BusinessProfile } from "@aeo-pcs/shared";

function mergeProfileValues(
  business: BusinessProfile | null,
  partial: BusinessProfileFormValues,
): BusinessProfileFormValues {
  return {
    name: partial.name ?? business?.name ?? "",
    category: partial.category ?? business?.category ?? "",
    customCategory: partial.customCategory ?? business?.customCategory ?? "",
    city: partial.city ?? business?.city ?? "",
    country: partial.country ?? business?.country ?? "India",
    description: partial.description ?? business?.description ?? "",
    nameAliases: partial.nameAliases ?? business?.nameAliases ?? [],
    targetLocations: partial.targetLocations ?? business?.targetLocations ?? [],
    targetItems: partial.targetItems ?? business?.targetItems ?? [],
    websiteUrl: partial.websiteUrl ?? business?.websiteUrl ?? "",
    googleBusinessUrl: partial.googleBusinessUrl ?? business?.googleBusinessUrl ?? "",
    socialLinks: partial.socialLinks ?? business?.socialLinks ?? [],
  };
}

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

  async function onSave(partial: BusinessProfileFormValues) {
    setSaving(true);
    setError(null);
    try {
      const values = mergeProfileValues(business, partial);
      const { business: saved } = await api.updateMyBusiness({
        ...values,
        nameAliases: (values.nameAliases || []).map((s) => s.trim()).filter(Boolean),
        targetLocations: (values.targetLocations || []).map((s) => s.trim()).filter(Boolean),
        targetItems: (values.targetItems || []).map((s) => String(s).trim()).filter(Boolean),
        socialLinks: (values.socialLinks || []).filter((s) => s.label && s.url),
      });
      setBusiness(saved);
      const me = await api.me();
      dispatch(setUser(me.user));
      message.success("Profile updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {loading ? (
        <div className="settings-loading">
          <Spin size="large" />
        </div>
      ) : (
        <BusinessProfileSettings
          business={business}
          saving={saving}
          error={error}
          onClearError={() => setError(null)}
          onSave={onSave}
        />
      )}
    </AppShell>
  );
}
