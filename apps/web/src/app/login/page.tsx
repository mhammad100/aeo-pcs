"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Modal, Spin, Typography } from "antd";
import type { LoginConflictDetails } from "@aeo-pcs/shared";
import { COPY } from "@aeo-pcs/shared";
import { api, ApiError } from "@/lib/api";
import { resolvePostAuthPath } from "@/lib/authRouting";
import { useRedirectIfAuthenticated } from "@/lib/useRedirectIfAuthenticated";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

const { Title, Text } = Typography;

function consumeSessionRevokedNotice(): boolean {
  if (typeof window === "undefined") return false;
  if (!sessionStorage.getItem("auth-session-revoked")) return false;
  sessionStorage.removeItem("auth-session-revoked");
  return true;
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionRevokedNotice] = useState(consumeSessionRevokedNotice);
  const [sessionConflict, setSessionConflict] = useState<{
    email: string;
    password: string;
    details?: LoginConflictDetails;
  } | null>(null);

  const checkingSession = useRedirectIfAuthenticated({ skip: sessionRevokedNotice });

  async function completeLogin(values: { email: string; password: string }, revokeOtherSession = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ ...values, revokeOtherSession });
      if (res.user.role !== "business") {
        setError("Business access only. Use the admin portal to log in as an admin.");
        return;
      }
      dispatch(setCredentials(res));
      const nextPath = await resolvePostAuthPath(res.user);
      router.replace(nextPath);
    } catch (err) {
      if (err instanceof ApiError && err.code === "SESSION_ACTIVE") {
        setSessionConflict({
          email: values.email,
          password: values.password,
          details: err.details,
        });
        return;
      }
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onFinish(values: { email: string; password: string }) {
    await completeLogin(values, false);
  }

  async function onContinueOnThisDevice() {
    if (!sessionConflict) return;
    setSessionConflict(null);
    await completeLogin(
      { email: sessionConflict.email, password: sessionConflict.password },
      true
    );
  }

  const visibilityWarning = sessionConflict?.details?.visibilityRunInProgress;

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0F1A17" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" style={{ color: "var(--ma-accent-soft)", fontFamily: "var(--ma-font-display)" }}>
          Master AEO
        </Link>
        <Title level={2} style={{ marginTop: 8 }}>
          Log in
        </Title>
        <Text type="secondary">Enter your business dashboard</Text>
        {sessionRevokedNotice && (
          <Alert
            type="info"
            showIcon
            message={COPY.auth.sessionRevoked}
            style={{ margin: "16px 0" }}
          />
        )}
        {error && <Alert type="error" showIcon message={error} style={{ margin: "16px 0" }} />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Log in
          </Button>
        </Form>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            No account? <Link href="/signup">Sign up</Link>
          </Text>
        </div>
      </Card>

      <Modal
        open={Boolean(sessionConflict)}
        title={COPY.auth.signInHereTitle}
        okText={COPY.auth.signInHereConfirm}
        cancelText={COPY.auth.signInHereCancel}
        onOk={() => void onContinueOnThisDevice()}
        onCancel={() => setSessionConflict(null)}
        confirmLoading={loading}
      >
        <p>{COPY.auth.signInHereBody}</p>
        {visibilityWarning && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message={COPY.auth.visibilityCheckRunningTitle}
            description={COPY.auth.visibilityCheckRunningBody}
          />
        )}
      </Modal>
    </div>
  );
}
