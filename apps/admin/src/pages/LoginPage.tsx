import { COPY } from "@aeo-pcs/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Form, Input, Modal, Typography } from "antd";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

const { Title, Text } = Typography;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function completeLogin(values: { email: string; password: string }, revokeOtherSession = false) {
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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Text style={{ color: "#8FBF9F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Master AEO
        </Text>
        <Title level={2} style={{ marginTop: 8 }}>
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
        <p>{COPY.auth.signInHereBody}</p>
      </Modal>
    </div>
  );
}
