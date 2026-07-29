"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { api, ApiError } from "@/lib/api";
import { resolvePostAuthPath } from "@/lib/authRouting";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

const { Title, Text, Paragraph } = Typography;

export default function SignupPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string; confirmPassword: string }) {
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.signup({ email: values.email, password: values.password });
      dispatch(setCredentials(res));
      const nextPath = await resolvePostAuthPath(res.user);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Link href="/" style={{ color: "var(--ma-accent-soft)", fontFamily: "var(--ma-font-display)" }}>
          Master AEO
        </Link>
        <Title level={2} style={{ marginTop: 8 }}>
          Create your account
        </Title>
        <Paragraph type="secondary">
          Sign up, choose a plan, then complete your business profile to start visibility checks.
        </Paragraph>
        {error && <Alert type="error" showIcon message={error} style={{ margin: "16px 0" }} />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            rules={[{ required: true, min: 8 }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Create account
          </Button>
        </Form>
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">
            Already have an account? <Link href="/login">Log in</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
