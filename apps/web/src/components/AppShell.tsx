"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Layout, Menu, Typography } from "antd";
import AuthGuard from "@/components/AuthGuard";
import ProfileGate from "@/components/ProfileGate";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutAndReset } from "@/store/session";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const navItems = [
  { key: "/app", label: <Link href="/app">Dashboard</Link> },
  { key: "/app/visibility", label: <Link href="/app/visibility">Visibility</Link> },
  { key: "/app/action-plan", label: <Link href="/app/action-plan">Action plan</Link> },
  { key: "/app/subscription", label: <Link href="/app/subscription">Subscription</Link> },
  { key: "/app/billing", label: <Link href="/app/billing">Billing</Link> },
  { key: "/app/settings", label: <Link href="/app/settings">Settings</Link> },
];

function selectedKey(pathname: string | null) {
  if (!pathname) return "/app";
  const match = navItems
    .map((item) => item.key)
    .filter((key) => key !== "/app")
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));
  if (match) return match;
  return "/app";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  function onLogout() {
    void dispatch(logoutAndReset());
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <SubscriptionGate>
        <ProfileGate>
        <Layout style={{ minHeight: "100vh", background: "#0F1A17" }}>
          <Sider breakpoint="lg" collapsedWidth={0} style={{ background: "#152420" }}>
            <div style={{ padding: 20 }}>
              <Text strong style={{ color: "#8FBF9F", letterSpacing: "0.08em" }}>
                Master AEO
              </Text>
            </div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey(pathname)]}
              items={navItems}
              style={{ background: "#152420", borderInlineEnd: "none" }}
            />
          </Sider>
          <Layout style={{ background: "#0F1A17" }}>
            <Header
              style={{
                background: "#152420",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 16,
                paddingInline: 24,
              }}
            >
              <Text type="secondary">{user?.email}</Text>
              <Button onClick={onLogout}>Log out</Button>
            </Header>
            <Content style={{ padding: 24 }}>{children}</Content>
          </Layout>
        </Layout>
        </ProfileGate>
      </SubscriptionGate>
    </AuthGuard>
  );
}
