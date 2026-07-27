"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

const { Title, Text } = Typography;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(values);
      dispatch(setCredentials(res));
      if (res.user.business?.profileCompletedAt) {
        router.replace("/app");
      } else {
        router.replace("/app/onboarding/profile");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" style={{ color: "var(--ma-accent-soft)", fontFamily: "var(--ma-font-display)" }}>
          masteraeo
        </Link>
        <Title level={2} style={{ marginTop: 8 }}>
          Log in
        </Title>
        <Text type="secondary">Enter your business dashboard</Text>
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
            No account? <Link href="/signup">Request access</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
