import { COPY } from "@aeo-pcs/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Form, Input, Modal, Typography } from "antd";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

const { Title, Text } = Typography;

function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#16233E" />
      <polyline
        points="26,74 26,26 50,54 74,26 74,74"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="88" cy="8" r="10" fill="#14B8A6" />
    </svg>
  );
}

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function completeLogin(
    values: { email: string; password: string },
    revokeOtherSession = false
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ ...values, revokeOtherSession });
      if (res.user.role !== "admin") {
        setError("Admin access only. Use the business app to log in as a business user.");
        return;
      }
      dispatch(setCredentials(res));
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.code === "SESSION_ACTIVE") {
        setSessionConflict({ email: values.email, password: values.password });
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0E1C35",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <BrandMark />
          <div>
            <div style={{ color: "#EDEFF6", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>
              Master <span style={{ color: "#14B8A6" }}>AEO</span>
            </div>
            <div
              style={{
                color: "#7A9CC8",
                fontSize: 9,
                letterSpacing: "3.5px",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Answer engine optimization
            </div>
          </div>
        </div>
        <Title level={2} style={{ marginTop: 20 }}>
          Admin login
        </Title>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
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
      </Card>

      <Modal
        open={Boolean(sessionConflict)}
        title={COPY.auth.signInHereTitle}
        okText={COPY.auth.signInHereConfirm}
        cancelText={COPY.auth.signInHereCancel}
        confirmLoading={loading}
        onOk={() => {
          if (!sessionConflict) return;
          void completeLogin(sessionConflict, true);
          setSessionConflict(null);
        }}
        onCancel={() => setSessionConflict(null)}
      >
        <Text>{COPY.auth.signInHereBody}</Text>
      </Modal>
    </div>
  );
}
